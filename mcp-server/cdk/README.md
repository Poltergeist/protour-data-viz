# ProTour MCP Server - AWS CDK Deployment

This directory contains AWS CDK infrastructure code for deploying the ProTour MCP Server to AWS Lambda with API Gateway.

## Architecture

- **Lambda Function**: Node.js 20.x runtime running Express server
- **API Gateway**: HTTP API (v2) with Lambda integration
- **CloudWatch**: Log group with 7-day retention
- **Deployment**: Bundled with application code and data files

## Prerequisites

1. **AWS Account**: Active AWS account with appropriate permissions
2. **AWS CLI**: Installed and configured with credentials
   ```bash
   aws configure
   ```
3. **Node.js**: Version 18 or higher
4. **CDK Bootstrap**: Run once per AWS account/region
   ```bash
   npm run cdk bootstrap
   ```

## Quick Start

### 1. Install Dependencies

```bash
cd mcp-server/cdk
npm install
```

### 2. Build CDK Code

```bash
npm run build
```

### 3. Review Changes (Optional)

```bash
npm run diff
```

### 4. Deploy to AWS

```bash
npm run deploy
```

The deployment will:
- Build the MCP server application
- Bundle code and data files
- Create Lambda function and API Gateway
- Output the API Gateway URL

### 5. Test Deployment

After deployment, CDK will output the API Gateway URL:

```
Outputs:
ProTourMcpStack.ApiUrl = https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
```

Test the endpoints:

```bash
# Health check
curl https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/health

# REST API
curl https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/api/tournament

# MCP endpoint (requires MCP client)
# Add to Claude Desktop: https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/mcp
```

## Available Commands

- `npm run build` - Compile TypeScript CDK code
- `npm run watch` - Watch mode for development
- `npm run cdk synth` - Synthesize CloudFormation template
- `npm run cdk diff` - Compare deployed stack with current state
- `npm run deploy` - Deploy stack to AWS
- `npm run destroy` - Delete stack from AWS (WARNING: destructive)

## Stack Resources

The CDK stack creates:

1. **Lambda Function** (`ProTourMcpFunction`)
   - Runtime: Node.js 20.x
   - Memory: 512 MB
   - Timeout: 30 seconds
   - Handler: `lambda.handler`
   - Bundled assets: application code + data files

2. **HTTP API Gateway** (`ProTourMcpApi`)
   - Protocol: HTTP (v2)
   - CORS: Enabled for all origins
   - Integration: Lambda proxy integration
   - Routes: `/{proxy+}` (all routes forwarded to Lambda)

3. **CloudWatch Log Group** (`ProTourMcpLogGroup`)
   - Retention: 7 days
   - Auto-created by Lambda

4. **IAM Role** (auto-created)
   - Lambda execution role with CloudWatch Logs permissions

5. **Resource Tags** (all resources)
   - `project: MCP-SERVER`
   - `service: protour-data-query`

## Configuration

### Lambda Settings

Edit `lib/mcp-server-stack.ts` to adjust:

```typescript
const fn = new lambda.Function(this, 'ProTourMcpFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  memorySize: 512,  // Adjust: 128-10240 MB
  timeout: Duration.seconds(30),  // Adjust: 1-900 seconds
  // ...
});
```

### Resource Tags

Edit `lib/mcp-server-stack.ts` to customize tags:

```typescript
cdk.Tags.of(this).add('project', 'MCP-SERVER');
cdk.Tags.of(this).add('service', 'protour-data-query');
cdk.Tags.of(this).add('environment', 'production'); // Add more tags
```

### Environment Variables

Add environment variables in the stack:

```typescript
environment: {
  NODE_ENV: 'production',
  LOG_LEVEL: 'info',
},
```

## Monitoring

View logs:
```bash
aws logs tail /aws/lambda/ProTourMcpFunction --follow
```

## Cost Estimation

Approximate monthly costs for moderate usage (10,000 requests/day):
- **Lambda**: ~$1.31
- **API Gateway**: ~$0.30
- **CloudWatch Logs**: ~$0.50
- **Total**: ~$2.11/month

## Cleanup

To remove all AWS resources:

```bash
npm run destroy
```

**WARNING**: This will delete the Lambda function, API Gateway, and logs.

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Main MCP Server Documentation](../README.md)
