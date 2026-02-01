/**
 * CDK Stack for ProTour MCP Server
 * Deploys Lambda function with API Gateway HTTP API
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class McpServerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda function
    const mcpFunction = new lambda.Function(this, 'ProTourMcpFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'lambda.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../dist'), {
        bundling: {
          image: lambda.Runtime.NODEJS_18_X.bundlingImage,
          command: [
            'bash',
            '-c',
            [
              'cp -r /asset-input/* /asset-output/',
              'cd /asset-output',
              'npm install --omit=dev --ignore-scripts',
            ].join(' && '),
          ],
        },
      }),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: 'production',
      },
      description: 'ProTour MCP Server - Tournament data query service',
    });

    // CloudWatch Logs
    new logs.LogGroup(this, 'ProTourMcpLogGroup', {
      logGroupName: `/aws/lambda/${mcpFunction.functionName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // HTTP API Gateway
    const httpApi = new apigatewayv2.HttpApi(this, 'ProTourMcpApi', {
      apiName: 'protour-mcp-api',
      description: 'HTTP API for ProTour MCP Server',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['*'],
      },
    });

    // Lambda integration
    const integration = new HttpLambdaIntegration(
      'ProTourMcpIntegration',
      mcpFunction
    );

    // Add route to forward all requests to Lambda
    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration,
    });

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: httpApi.url!,
      description: 'API Gateway URL',
      exportName: 'ProTourMcpApiUrl',
    });

    new cdk.CfnOutput(this, 'FunctionName', {
      value: mcpFunction.functionName,
      description: 'Lambda function name',
      exportName: 'ProTourMcpFunctionName',
    });

    new cdk.CfnOutput(this, 'McpEndpoint', {
      value: `${httpApi.url}mcp`,
      description: 'MCP endpoint URL (add to Claude Desktop)',
      exportName: 'ProTourMcpEndpoint',
    });

    new cdk.CfnOutput(this, 'RestApiBase', {
      value: `${httpApi.url}api/`,
      description: 'REST API base URL',
      exportName: 'ProTourRestApiBase',
    });
  }
}
