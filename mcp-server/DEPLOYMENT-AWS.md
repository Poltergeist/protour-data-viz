# AWS Lambda Deployment Guide

This guide walks you through deploying the ProTour MCP Server to AWS Lambda using AWS CDK.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Deployment Steps](#deployment-steps)
- [Testing Deployment](#testing-deployment)
- [Updating the Deployment](#updating-the-deployment)
- [Monitoring & Logs](#monitoring--logs)
- [Cost Management](#cost-management)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedure](#rollback-procedure)
- [Cleanup](#cleanup)

## Prerequisites

### Required Tools

1. **AWS Account**
   - Active AWS account with appropriate permissions
   - Ability to create IAM roles, Lambda functions, and API Gateway resources

2. **AWS CLI** (v2.x or higher)
   ```bash
   # Install via Homebrew (macOS)
   brew install awscli
   
   # Or download from https://aws.amazon.com/cli/
   ```

3. **AWS Credentials**
   ```bash
   aws configure
   # Enter: AWS Access Key ID, Secret Access Key, Default region, Output format
   ```

4. **Node.js** (v18 or higher)
   ```bash
   node --version  # Should be >= 18.0.0
   ```

5. **Docker** (for CDK bundling)
   - Required for CDK to bundle Lambda assets
   - Download from [docker.com](https://www.docker.com/products/docker-desktop/)

### Verify Prerequisites

```bash
# Check AWS credentials
aws sts get-caller-identity

# Check Node version
node --version

# Check Docker
docker --version
```

## Initial Setup

### 1. Bootstrap CDK (One-time per AWS Account/Region)

CDK requires a one-time bootstrap to set up resources in your AWS account:

```bash
cd mcp-server/cdk
npm install
npx cdk bootstrap
```

This creates an S3 bucket and other resources needed for CDK deployments.

### 2. Install Dependencies

```bash
# Install CDK dependencies
cd mcp-server/cdk
npm install

# Install MCP server dependencies
cd ..
npm install
```

### 3. Build the Application

```bash
cd mcp-server
npm run build:lambda
```

This compiles TypeScript and copies data files to the `dist/` directory.

## Deployment Steps

### Step 1: Review the Changes

See what will be deployed:

```bash
cd cdk
npm run diff
```

Or synthesize the CloudFormation template:

```bash
npm run synth
```

### Step 2: Deploy to AWS

```bash
npm run deploy
```

This will:
1. Build the Lambda function code
2. Bundle dependencies and data files
3. Create a CloudFormation stack
4. Deploy Lambda function and API Gateway
5. Output the API Gateway URL

**Expected output:**
```
✅  ProTourMcpStack

✨  Deployment time: 45.2s

Outputs:
ProTourMcpStack.ApiUrl = https://abc123xyz.execute-api.us-east-1.amazonaws.com/
ProTourMcpStack.FunctionName = ProTourMcpStack-ProTourMcpFunctionXXXXXX
ProTourMcpStack.McpEndpoint = https://abc123xyz.execute-api.us-east-1.amazonaws.com/mcp
ProTourMcpStack.RestApiBase = https://abc123xyz.execute-api.us-east-1.amazonaws.com/api/

Stack ARN:
arn:aws:cloudformation:us-east-1:123456789012:stack/ProTourMcpStack/...
```

**Save these URLs** - you'll need them for testing and integration!

### Step 3: Note the Deployed Resources

The stack creates:

- **Lambda Function**: `ProTourMcpStack-ProTourMcpFunctionXXXXXX`
- **API Gateway**: `protour-mcp-api`
- **CloudWatch Log Group**: `/aws/lambda/ProTourMcpStack-ProTourMcpFunctionXXXXXX`
- **IAM Role**: For Lambda execution (auto-created)

## Testing Deployment

### 1. Health Check

```bash
curl https://YOUR-API-URL/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-02-01T15:00:00.000Z",
  "version": "1.0.0"
}
```

### 2. Test REST API Endpoints

```bash
# Get tournament info
curl https://YOUR-API-URL/api/tournament

# List archetypes
curl https://YOUR-API-URL/api/archetypes

# Query matches
curl "https://YOUR-API-URL/api/matches?round=5&limit=10"

# Get player deck
curl https://YOUR-API-URL/api/players/PlayerName/deck
```

### 3. Test MCP Endpoint

Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ProTour Data": {
      "type": "http",
      "url": "https://YOUR-API-URL/mcp"
    }
  }
}
```

Restart Claude Desktop and test with queries like:
- "Show me matches from round 5"
- "What are the top archetypes?"
- "Show me PlayerName's deck"

### 4. Test with ChatGPT

1. Go to ChatGPT → GPTs → Create
2. Configure → Actions → Import from URL
3. Enter: `https://YOUR-API-URL/api/openapi.json`
4. Save and test

## Updating the Deployment

### Update Application Code

After making changes to the MCP server:

```bash
# From mcp-server directory
npm run build:lambda
cd cdk
npm run deploy
```

CDK will detect changes and update only the Lambda function.

### Update Data Files

Data files are bundled with the Lambda deployment:

```bash
# After updating ../data/*.json files
npm run build:lambda
cd cdk
npm run deploy
```

The new data will be deployed with the Lambda function.

### Update Infrastructure (CDK Stack)

After modifying `cdk/lib/mcp-server-stack.ts`:

```bash
cd cdk
npm run build
npm run diff  # Review changes
npm run deploy
```

## Monitoring & Logs

### View Logs in Real-Time

```bash
# Using AWS CLI
aws logs tail /aws/lambda/ProTourMcpStack-ProTourMcpFunctionXXXXXX --follow

# Or use the function name from stack outputs
aws logs tail /aws/lambda/$(aws cloudformation describe-stacks --stack-name ProTourMcpStack --query 'Stacks[0].Outputs[?OutputKey==`FunctionName`].OutputValue' --output text) --follow
```

### View Logs in AWS Console

1. Go to AWS Console → CloudWatch → Log Groups
2. Find `/aws/lambda/ProTourMcpStack-ProTourMcpFunctionXXXXXX`
3. Click on log streams to view individual requests

### View Metrics

AWS Console → Lambda → Functions → ProTourMcpStack-ProTourMcpFunctionXXXXXX

Key metrics to monitor:
- **Invocations**: Number of requests
- **Duration**: Average response time
- **Errors**: Failed requests
- **Throttles**: Rate-limited requests

### Set Up Alarms (Optional)

Create CloudWatch alarms for errors:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name protour-mcp-errors \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=ProTourMcpStack-ProTourMcpFunctionXXXXXX
```

## Cost Management

### Estimated Monthly Costs

For moderate usage (10,000 requests/day):

| Service | Usage | Cost |
|---------|-------|------|
| Lambda Requests | 300K/month | $0.06 |
| Lambda Compute (512MB, 500ms avg) | 150K GB-seconds | $1.25 |
| API Gateway | 300K requests | $0.30 |
| CloudWatch Logs | ~2GB/month | $0.50 |
| **Total** | | **~$2.11/month** |

### AWS Free Tier

- **Lambda**: 1M requests + 400K GB-seconds per month (always free)
- **API Gateway**: 1M requests per month (first 12 months)
- **CloudWatch Logs**: 5GB ingestion per month (always free)

Most deployments stay within free tier limits!

### Cost Optimization Tips

1. **Reduce Log Retention**: Edit `cdk/lib/mcp-server-stack.ts`:
   ```typescript
   retention: logs.RetentionDays.ONE_DAY,  // Instead of ONE_WEEK
   ```

2. **Adjust Memory**: Lower memory if usage patterns allow:
   ```typescript
   memorySize: 256,  // Instead of 512
   ```

3. **Monitor Usage**: Set up AWS Budget alerts
   ```bash
   aws budgets create-budget --account-id YOUR_ACCOUNT_ID --budget file://budget.json
   ```

## Troubleshooting

### Deployment Fails

**Error: "User is not authorized to perform: cloudformation:CreateStack"**

Solution: Add IAM permissions for CloudFormation, Lambda, API Gateway, IAM, and Logs.

**Error: "Docker is not running"**

Solution: Start Docker Desktop before running `cdk deploy`.

**Error: "Stack already exists"**

Solution: Use `cdk deploy` to update, or `cdk destroy` then redeploy.

### Lambda Function Errors

**Error: "Cannot find module 'express'"**

Solution: Ensure bundling is working. Check `cdk/lib/mcp-server-stack.ts` bundling config.

**Error: "ENOENT: no such file or directory"**

Solution: Verify data files are copied: `npm run build:lambda` includes `cp -r ../data dist/`.

### API Gateway Issues

**502 Bad Gateway**

Check Lambda logs for errors:
```bash
aws logs tail /aws/lambda/FUNCTION_NAME --since 10m
```

**CORS Errors**

Verify CORS configuration in `cdk/lib/mcp-server-stack.ts`.

### Performance Issues

**High Duration**

- Increase Lambda memory (more memory = more CPU)
- Check CloudWatch logs for slow operations
- Consider caching strategies

**Cold Starts**

- Cold starts are ~1-2 seconds (normal for Node.js Lambda)
- Consider Provisioned Concurrency for critical workloads (costs extra)

## Rollback Procedure

### Rollback to Previous Version

AWS CloudFormation doesn't have automatic rollback for updates. Manual options:

**Option 1: Redeploy Previous Code**
```bash
git checkout <previous-commit>
npm run build:lambda
cd cdk
npm run deploy
```

**Option 2: Use CloudFormation Console**
1. AWS Console → CloudFormation → ProTourMcpStack
2. Stack actions → View change sets
3. Delete problematic change set
4. Redeploy working version

**Option 3: Destroy and Recreate**
```bash
cd cdk
npm run destroy
# Fix issues
npm run deploy
```

### Emergency Shutdown

Temporarily disable the API:

```bash
# Delete API Gateway integration
aws apigatewayv2 delete-integration --api-id YOUR_API_ID --integration-id YOUR_INTEGRATION_ID

# Or delete entire stack
cd cdk
npm run destroy
```

## Cleanup

### Delete All Resources

```bash
cd cdk
npm run destroy
```

This will:
1. Delete Lambda function
2. Delete API Gateway
3. Delete CloudWatch Log Group
4. Delete IAM roles
5. Remove CloudFormation stack

**Confirm deletion** when prompted.

### Verify Cleanup

```bash
aws cloudformation describe-stacks --stack-name ProTourMcpStack
# Should return error: "Stack with id ProTourMcpStack does not exist"
```

### Manual Cleanup (If Needed)

If `destroy` fails, manually delete:

1. **Lambda Function**:
   ```bash
   aws lambda delete-function --function-name ProTourMcpStack-ProTourMcpFunctionXXXXXX
   ```

2. **API Gateway**:
   ```bash
   aws apigatewayv2 delete-api --api-id YOUR_API_ID
   ```

3. **CloudWatch Logs**:
   ```bash
   aws logs delete-log-group --log-group-name /aws/lambda/ProTourMcpStack-ProTourMcpFunctionXXXXXX
   ```

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [API Gateway HTTP API Documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html)
- [Main MCP Server Documentation](README.md)
- [Security Best Practices](SECURITY.md)
- [ChatGPT Integration](INTEGRATIONS.md)

## Support

For deployment issues:
1. Check this troubleshooting guide
2. Review CloudWatch logs
3. Consult AWS CDK documentation
4. Open an issue in the repository
