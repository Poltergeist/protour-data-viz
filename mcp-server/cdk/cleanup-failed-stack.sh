#!/bin/bash
set -e

echo "🧹 Cleaning up failed ProTourMcpStack deployment"
echo "================================================"
echo ""

REGION=${CDK_DEPLOY_REGION:-eu-central-1}

echo "🔍 Checking stack status in $REGION..."
STACK_STATUS=$(aws cloudformation describe-stacks \
  --region $REGION \
  --stack-name ProTourMcpStack \
  --query 'Stacks[0].StackStatus' \
  --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$STACK_STATUS" == "NOT_FOUND" ]; then
  echo "✅ No stack found - ready to deploy fresh"
  exit 0
fi

echo "📦 Stack status: $STACK_STATUS"

if [ "$STACK_STATUS" == "ROLLBACK_COMPLETE" ] || [ "$STACK_STATUS" == "CREATE_FAILED" ]; then
  echo "🗑️  Stack is in failed state - deleting..."
  
  aws cloudformation delete-stack \
    --region $REGION \
    --stack-name ProTourMcpStack
  
  echo "⏳ Waiting for deletion to complete..."
  aws cloudformation wait stack-delete-complete \
    --region $REGION \
    --stack-name ProTourMcpStack
  
  echo "✅ Stack deleted successfully"
  echo ""
  echo "🎯 You can now redeploy with: npm run deploy"
else
  echo "ℹ️  Stack is in $STACK_STATUS state"
  echo "   Run 'npm run destroy' first if you want to remove it"
fi
