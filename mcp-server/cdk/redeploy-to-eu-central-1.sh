#!/bin/bash
set -e

echo "🌍 Redeploying ProTour MCP Server to eu-central-1"
echo "=================================================="
echo ""

# Step 1: Delete bootstrap from us-east-1
echo "Step 1: Checking for bootstrap stack in us-east-1..."
WRONG_STACK=$(aws cloudformation list-stacks \
  --region us-east-1 \
  --query 'StackSummaries[?starts_with(StackName, `CDKToolkit`) && StackStatus != `DELETE_COMPLETE`].StackName' \
  --output text 2>/dev/null || echo "")

if [ -n "$WRONG_STACK" ]; then
  echo "📦 Found bootstrap stack in us-east-1: $WRONG_STACK"
  echo "🗑️  Deleting..."
  
  aws cloudformation delete-stack \
    --region us-east-1 \
    --stack-name "$WRONG_STACK"
  
  echo "⏳ Waiting for deletion to complete (this may take 2-3 minutes)..."
  aws cloudformation wait stack-delete-complete \
    --region us-east-1 \
    --stack-name "$WRONG_STACK"
  
  echo "✅ Deleted bootstrap stack from us-east-1"
else
  echo "✅ No bootstrap stack found in us-east-1 (already clean)"
fi

echo ""

# Step 2: Check if ProTourMcpStack exists in wrong region
echo "Step 2: Checking for ProTourMcpStack in us-east-1..."
APP_STACK=$(aws cloudformation list-stacks \
  --region us-east-1 \
  --query 'StackSummaries[?StackName == `ProTourMcpStack` && StackStatus != `DELETE_COMPLETE`].StackName' \
  --output text 2>/dev/null || echo "")

if [ -n "$APP_STACK" ]; then
  echo "📦 Found application stack in us-east-1"
  echo "🗑️  Deleting ProTourMcpStack from us-east-1..."
  
  aws cloudformation delete-stack \
    --region us-east-1 \
    --stack-name ProTourMcpStack
  
  echo "⏳ Waiting for deletion to complete..."
  aws cloudformation wait stack-delete-complete \
    --region us-east-1 \
    --stack-name ProTourMcpStack
  
  echo "✅ Deleted ProTourMcpStack from us-east-1"
else
  echo "✅ No application stack found in us-east-1"
fi

echo ""

# Step 3: Bootstrap eu-central-1
echo "Step 3: Bootstrapping eu-central-1..."
echo "🚀 Running CDK bootstrap..."

export CDK_DEPLOY_REGION=eu-central-1

npx cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text)/eu-central-1

echo "✅ Bootstrap complete for eu-central-1"
echo ""

# Step 4: Deploy to eu-central-1
echo "Step 4: Deploying ProTourMcpStack to eu-central-1..."
echo "🚀 Running deployment..."

npm run deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Your MCP server is now running in eu-central-1"
echo ""
