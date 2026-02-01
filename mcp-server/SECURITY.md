# Security Documentation

Detailed security model, threat analysis, and best practices for the ProTour MCP Server.

## Security Philosophy

This server is designed as a **public, read-only API** with the following principles:

- **Zero Trust File Access** - Only specific allowlisted files can be read
- **Defense in Depth** - Multiple security layers protect against attacks
- **Fail Secure** - Errors never expose sensitive information
- **Read-Only by Design** - No write operations exist anywhere in the codebase

## Threat Model

### In Scope

These threats are actively mitigated:

1. **Directory Traversal Attacks** - Malicious file path manipulation
2. **Injection Attacks** - SQL/NoSQL/Command injection attempts
3. **Denial of Service (DoS)** - Resource exhaustion through excessive requests
4. **Information Disclosure** - Exposing internal system details
5. **Cross-Site Scripting (XSS)** - Malicious script injection in responses
6. **Request Forgery** - CSRF and similar attacks
7. **Resource Exhaustion** - Memory/CPU abuse through large queries

### Out of Scope

These threats are not applicable or accepted risks:

- **Data theft/modification** - Data is public, no secrets stored
- **Authentication bypass** - No authentication system (public API)
- **Privilege escalation** - No user accounts or privileges
- **Data corruption** - Read-only system, no write operations
- **Physical access** - Server security is infrastructure concern

## Security Layers

### 1. File Access Control

**Implementation:** `src/data-loader.ts`

**Protection:**
```typescript
// Hardcoded allowlist - only these files accessible
const ALLOWED_FILES = [
  'tournament-394299-matches.json',
  'tournament-394299-decks.json',
  'tournament-394299-stats.json',
  'tournament-394299-player-decks.json'
] as const;

// Validation with TypeScript type guard
function validateFileName(file: string): asserts file is AllowedFileName {
  if (!ALLOWED_FILES.includes(file as AllowedFileName)) {
    throw new Error('Access denied: file not allowed');
  }
}
```

**Prevented Attacks:**
- ✅ Directory traversal (`../../../etc/passwd`)
- ✅ Arbitrary file reads (`/etc/shadow`)
- ✅ Path manipulation (`./../../secrets.json`)

**Test:**
```bash
# These should fail
curl "http://localhost:3000/api/matches?file=../../etc/passwd"
curl "http://localhost:3000/api/matches?file=/etc/shadow"
```

### 2. Input Validation

**Implementation:** `src/validation.ts`

**Protection:**
```typescript
// String validation with length and character limits
const safeStringSchema = z.string()
  .max(MAX_STRING_LENGTH)
  .regex(SAFE_STRING_PATTERN)
  .optional();

// Number validation with range limits
const roundSchema = z.number()
  .int()
  .min(1)
  .max(20)
  .optional();

// Result limit to prevent excessive data returns
const limitSchema = z.number()
  .int()
  .min(1)
  .max(MAX_RESULTS)
  .optional();
```

**Prevented Attacks:**
- ✅ Injection attacks (SQL, NoSQL, command)
- ✅ Buffer overflow attempts
- ✅ Resource exhaustion via huge queries
- ✅ Malformed input causing crashes

**Validation Rules:**
- **Strings**: Max 100 chars, alphanumeric + spaces/dashes only
- **Numbers**: Integer, positive, reasonable ranges
- **Limits**: Max 1000 results per query
- **Enums**: Only predefined values accepted

**Test:**
```bash
# These should return 400 Bad Request
curl "http://localhost:3000/api/matches?round=999999"
curl "http://localhost:3000/api/matches?player=$(whoami)"
curl "http://localhost:3000/api/matches?archetype=<script>alert('xss')</script>"
```

### 3. Rate Limiting

**Implementation:** `src/api-routes.ts`

**Protection:**
```typescript
const limiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute window
  max: 100,                    // 100 requests per window
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
});
```

**Configuration:**
- **Window**: 60 seconds (sliding)
- **Limit**: 100 requests per IP
- **Headers**: Includes `RateLimit-*` headers in responses
- **Response**: `429 Too Many Requests` when exceeded

**Prevented Attacks:**
- ✅ Denial of Service (DoS)
- ✅ Brute force attacks
- ✅ Resource exhaustion
- ✅ Bandwidth abuse

**Test:**
```bash
# This should trigger 429 after 100 requests
for i in {1..101}; do
  curl -s http://localhost:3000/api/tournament > /dev/null
  echo "Request $i"
done
```

**Response Headers:**
```
RateLimit-Limit: 100
RateLimit-Remaining: 50
RateLimit-Reset: 1234567890
```

### 4. Request Size Limits

**Implementation:** `src/http-server.ts`

**Protection:**
```typescript
app.use(express.json({ limit: '1kb' }));
app.use(express.urlencoded({ extended: true, limit: '1kb' }));
```

**Limits:**
- **Body size**: 1KB (queries use small parameters only)
- **URL length**: Browser limit (2048 chars)
- **Query params**: Validated individually

**Prevented Attacks:**
- ✅ DoS via large request bodies
- ✅ Memory exhaustion
- ✅ Bandwidth consumption

**Test:**
```bash
# This should return 413 Payload Too Large
dd if=/dev/zero bs=2048 count=1 | \
  curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  --data-binary @-
```

### 5. HTTP Security Headers

**Implementation:** `src/http-server.ts`

**Protection:**
```typescript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  next();
});
```

**Headers Explained:**

- **X-Content-Type-Options: nosniff** - Prevents MIME type sniffing
- **X-Frame-Options: DENY** - Prevents clickjacking attacks
- **X-XSS-Protection: 1; mode=block** - Enables browser XSS filter
- **Strict-Transport-Security** - Forces HTTPS in production
- **Content-Security-Policy** - Restricts resource loading (no scripts, frames)

**Prevented Attacks:**
- ✅ Clickjacking
- ✅ MIME type confusion
- ✅ Cross-site scripting (XSS)
- ✅ Man-in-the-middle (when using HTTPS)

**Test:**
```bash
curl -I http://localhost:3000/health
# Check for security headers in response
```

### 6. CORS Policy

**Implementation:** `src/http-server.ts`

**Protection:**
```typescript
const corsOptions = {
  origin: '*',              // Public API - allow all origins
  methods: ['GET', 'POST'], // Only safe methods
  credentials: false,       // No cookies/auth
  maxAge: 86400,           // Cache preflight for 24h
};
```

**Policy:**
- **Origin**: `*` (any origin) - public API
- **Methods**: Only GET and POST (no PUT, DELETE, PATCH)
- **Credentials**: Disabled (no cookies or auth tokens)
- **Headers**: Standard content-type only

**Prevented Attacks:**
- ✅ Cross-Site Request Forgery (CSRF) - no state-changing operations
- ✅ Credential theft - no credentials used
- ✅ Unauthorized mutations - only read operations exist

**Why CORS is safe here:**
- No authentication = nothing to steal
- No write operations = CSRF irrelevant
- Public data = no confidentiality concerns

### 7. Error Handling

**Implementation:** All modules

**Protection:**
```typescript
// Bad - exposes internals
throw new Error(`Failed to read file: ${filePath}`);

// Good - generic message
throw new Error('Failed to load data');
```

**Rules:**
- ✅ Never expose file paths
- ✅ Never expose stack traces to clients
- ✅ Never reveal internal structure
- ✅ Log detailed errors server-side only
- ✅ Return generic HTTP status codes

**Error Response Format:**
```json
{
  "success": false,
  "error": "Invalid request"
}
```

**Prevented Attacks:**
- ✅ Information disclosure
- ✅ Path enumeration
- ✅ System fingerprinting

### 8. Logging & Monitoring

**Implementation:** Minimal (can be extended)

**Current Logging:**
- Server start/stop events
- Request method and path (no parameters)
- Error messages (server-side only)

**Best Practices:**
```typescript
// Log this
console.log(`${req.method} ${req.path}`);

// DON'T log this
console.log(`Query params: ${JSON.stringify(req.query)}`); // May contain sensitive data
console.log(`API key: ${req.headers.authorization}`);      // Never log tokens
```

**What to Log:**
- ✅ Timestamp
- ✅ HTTP method and path
- ✅ Response status code
- ✅ Response time
- ✅ Client IP (for rate limiting)
- ✅ Error messages (sanitized)

**What NOT to Log:**
- ❌ API keys or tokens (if added later)
- ❌ User credentials
- ❌ Full query parameters (may contain PII)
- ❌ Request/response bodies
- ❌ Internal file paths

## Security Checklist

### Development

- [ ] All input validated with Zod schemas
- [ ] File access restricted to allowlist
- [ ] No write operations in code
- [ ] Errors don't expose internals
- [ ] Rate limiting configured
- [ ] Security headers set
- [ ] CORS policy reviewed
- [ ] Request size limits enforced

### Pre-Deployment

- [ ] **Enable HTTPS only** (no HTTP in production)
- [ ] Update Strict-Transport-Security header
- [ ] Configure rate limits for production load
- [ ] Set up logging and monitoring
- [ ] Review error messages for information leakage
- [ ] Test input validation with malicious inputs
- [ ] Test file access with traversal attempts
- [ ] Load test to verify resource limits work
- [ ] Verify no sensitive data in logs

### Production Monitoring

- [ ] Monitor request rates per IP
- [ ] Alert on error rate spikes
- [ ] Alert on 429 (rate limit) responses
- [ ] Monitor response times
- [ ] Review logs weekly for anomalies
- [ ] Keep dependencies updated (npm audit)

## Common Attack Scenarios

### 1. Directory Traversal

**Attack:**
```bash
curl "http://localhost:3000/api/matches?file=../../etc/passwd"
```

**Defense:**
- File allowlist in `data-loader.ts`
- Path validation before any file operation
- TypeScript type guard ensures compile-time safety

**Result:** ❌ Access denied error

### 2. SQL/NoSQL Injection

**Attack:**
```bash
curl "http://localhost:3000/api/matches?player=' OR '1'='1"
```

**Defense:**
- No database (in-memory JSON)
- Zod validation rejects invalid characters
- String regex pattern allows only safe characters

**Result:** ❌ Validation error

### 3. Command Injection

**Attack:**
```bash
curl "http://localhost:3000/api/matches?archetype=; rm -rf /"
```

**Defense:**
- No shell commands executed
- No `child_process` or `exec()` calls
- Input validation prevents special characters

**Result:** ❌ Validation error

### 4. DoS via Rate Limiting

**Attack:**
```bash
while true; do curl http://localhost:3000/api/tournament; done
```

**Defense:**
- Rate limiting (100 req/min per IP)
- Request timeout (30 seconds)
- Request size limits (1KB)

**Result:** ❌ 429 Too Many Requests after 100 requests

### 5. XSS in Responses

**Attack:**
```bash
curl "http://localhost:3000/api/matches?player=<script>alert('xss')</script>"
```

**Defense:**
- JSON responses (not HTML)
- Content-Type: application/json
- X-Content-Type-Options: nosniff

**Result:** ❌ Validation error + safe JSON response

## Deployment Security

### Environment Variables

Store secrets in environment variables (if auth added later):

```bash
# Good
export API_KEY="secret-key"
node dist/http-server.js

# Bad - hardcoded in code
const API_KEY = "secret-key"; // DON'T DO THIS
```

### HTTPS in Production

**Always use HTTPS for production deployments.**

Options:
- Vercel/Netlify - Automatic HTTPS
- AWS Lambda + API Gateway - Enable HTTPS
- Self-hosted - Use Let's Encrypt certificates

### Firewall Rules

If self-hosting:
- Allow only ports 80 (redirect to HTTPS) and 443
- Block all other incoming ports
- Rate limit at firewall level (additional layer)

### Regular Updates

```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Check for critical security issues
npm audit --audit-level=critical
```

## Security Contact

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Contact maintainers privately
3. Allow time for fix before disclosure
4. Responsible disclosure appreciated

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
