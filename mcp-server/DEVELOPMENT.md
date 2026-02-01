# Development Guide

Guide for local development, testing, and contributing to the ProTour MCP Server.

## Prerequisites

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **Git**: For version control
- **ngrok** (optional): For HTTPS testing

## Initial Setup

### 1. Clone and Install

```bash
cd mcp-server
npm install
```

### 2. Verify Installation

```bash
# Check all dependencies installed
npm list --depth=0

# Verify TypeScript works
npx tsc --version

# Run quick test
npm run test:phase2
```

## Project Structure

```
mcp-server/
├── src/
│   ├── index.ts              # Entry point (test file)
│   ├── types.ts              # TypeScript type definitions
│   ├── data-loader.ts        # Secure data loading module
│   ├── validation.ts         # Input validation with Zod
│   ├── queries.ts            # Query logic for all tools
│   ├── mcp-server.ts         # MCP server (stdio mode)
│   ├── http-server.ts        # HTTP server (MCP + REST API)
│   ├── api-routes.ts         # REST API route definitions
│   ├── test-*.ts             # Test files
│   └── ...
├── dist/                     # Compiled JavaScript (generated)
├── node_modules/             # Dependencies
├── package.json              # Project metadata and scripts
├── tsconfig.json             # TypeScript configuration
├── openapi.json              # OpenAPI 3.0 spec
└── *.md                      # Documentation
```

## Development Workflow

### Start Development Server

```bash
npm run dev
```

This starts the HTTP server with hot reload on port 3000.

**Endpoints:**
- `http://localhost:3000/health` - Health check
- `http://localhost:3000/mcp` - MCP endpoint (POST)
- `http://localhost:3000/api/*` - REST API endpoints

### Run Tests

```bash
# Test data loading and validation
npm run test:phase2

# Test query functions
npm run test:queries

# Test HTTP server and MCP endpoint
npm run test:http

# Test REST API endpoints
npm run test:api
```

### Build for Production

```bash
npm run build
```

Output goes to `dist/` directory.

### Run Production Build

```bash
npm run start
```

## Testing Locally

### Test with curl

```bash
# Health check
curl http://localhost:3000/health

# REST API
curl "http://localhost:3000/api/tournament"
curl "http://localhost:3000/api/archetypes"
curl "http://localhost:3000/api/matches?round=5&limit=5"

# MCP endpoint
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Test with Claude Desktop

1. Start server: `npm run dev`
2. Add to Claude Desktop config:
   ```json
   {
     "mcpServers": {
       "protour-local": {
         "type": "http",
         "url": "http://localhost:3000/mcp"
       }
     }
   }
   ```
3. Restart Claude Desktop
4. Try prompts like "List all archetypes"

### Test with ngrok

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Start ngrok
ngrok http 3000

# Use the HTTPS URL for testing
```

## Making Changes

### Adding a New Query Function

1. **Add to `queries.ts`:**
   ```typescript
   export function myNewQuery(params: MyParams) {
     const data = getData();
     // Your logic here
     return results;
   }
   ```

2. **Add validation schema to `validation.ts`:**
   ```typescript
   export const myParamsSchema = z.object({
     param1: z.string(),
     param2: z.number().optional(),
   });
   ```

3. **Add to MCP server (`http-server.ts`):**
   - Add tool definition in `ListToolsRequestSchema`
   - Add handler in `CallToolRequestSchema`

4. **Add REST endpoint (`api-routes.ts`):**
   ```typescript
   router.get('/my-endpoint', (req, res) => {
     // Implementation
   });
   ```

5. **Test it:**
   ```bash
   npm run test:queries
   npm run test:api
   ```

6. **Document it:**
   - Update `TOOLS.md` with MCP tool docs
   - Update `API.md` with REST endpoint docs
   - Add examples to `EXAMPLES.md`

### Updating Data Types

1. Modify `src/types.ts`
2. Update `src/data-loader.ts` if file structure changed
3. Update query functions that use the types
4. Update `DATA-SCHEMA.md` documentation
5. Run tests to verify nothing broke

### Adding Dependencies

```bash
# Add runtime dependency
npm install package-name

# Add dev dependency
npm install --save-dev package-name

# Commit package.json and package-lock.json
git add package.json package-lock.json
git commit -m "feat: add package-name dependency"
```

## Code Style

### TypeScript Best Practices

- Use strict types (enabled in `tsconfig.json`)
- Prefer interfaces for data structures
- Use type inference where clear
- Document complex types with JSDoc comments

### File Organization

- One main concept per file
- Related functions grouped together
- Types defined before usage
- Exports at bottom of file

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Functions**: `camelCase()`
- **Types/Interfaces**: `PascalCase`
- **Constants**: `SCREAMING_SNAKE_CASE`

### Comments

```typescript
/**
 * Function description
 * 
 * @param param1 - Description
 * @returns Description
 */
export function myFunction(param1: string): Result {
  // Implementation comments as needed
  return result;
}
```

## Debugging

### Enable Debug Logs

```typescript
// In http-server.ts, add:
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

### Check Server Logs

Look for:
- Request logs (method, path, params)
- Error messages and stack traces
- Validation failures
- Rate limit warnings

### Common Issues

**Port already in use:**
```bash
lsof -ti:3000  # Find process
kill <PID>     # Stop it
# Or use different port
PORT=3001 npm run dev
```

**TypeScript errors:**
```bash
# Check for type errors
npx tsc --noEmit

# Clean build and retry
rm -rf dist/
npm run build
```

**Data not loading:**
- Check `../data` directory exists
- Verify JSON files are valid
- Check file names match allowlist in `data-loader.ts`

## Performance Tips

### Data Caching

The query functions cache loaded data:
```typescript
// In queries.ts
let cachedData: ReturnType<typeof loadAllData> | null = null;
```

To clear cache during development:
```typescript
import { clearCache } from './queries.js';
clearCache();
```

### Rate Limiting

Default: 100 requests/minute per IP

Adjust in `api-routes.ts`:
```typescript
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200, // Increase limit
});
```

## Contributing

### Commit Message Format

Follow Conventional Commits:

```
feat(scope): add new feature
fix(scope): fix bug
docs(scope): update documentation
test(scope): add tests
chore(scope): update tooling
```

Examples:
```bash
git commit -m "feat(api): add player search endpoint"
git commit -m "fix(validation): handle edge case in round validation"
git commit -m "docs(readme): update installation instructions"
```

### Pull Request Process

1. Create feature branch
2. Make changes with tests
3. Update relevant documentation
4. Commit with conventional messages
5. Test everything works
6. Submit PR with description

## Troubleshooting

### Tests Failing

```bash
# Run individual test files
npm run test:phase2
npm run test:queries
npm run test:http
npm run test:api

# Check for TypeScript errors
npx tsc --noEmit
```

### Server Won't Start

- Check port 3000 is available
- Verify all dependencies installed
- Check for syntax errors in TypeScript
- Review server logs for error messages

### Data Issues

- Ensure `../data` directory exists
- Verify JSON files are valid
- Check file permissions
- Review `data-loader.ts` allowlist

## Resources

- [MCP Documentation](https://modelcontextprotocol.io)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Zod Validation](https://zod.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

## Getting Help

- Check existing documentation files
- Review test files for examples
- Check server logs for errors
- Test with curl before using AI tools
