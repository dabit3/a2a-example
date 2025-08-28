#!/bin/bash

echo "Testing Payment-Gated AI Inference"
echo "==================================="
echo ""

# Test without payment (should fail to get AI response)
echo "1. Testing WITHOUT payment..."
echo "----------------------------"
curl -X POST http://localhost:41243/contexts \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"a2a.createContext","params":{},"id":"test1"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "The above should return 402 Payment Required if payment protection is enabled."
echo ""

echo "2. Testing with client that includes payment..."
echo "----------------------------------------------"
echo "Run 'npm start' in the client folder to test with x402 payment."
echo ""
echo "Expected behavior:"
echo "- If payment protection is ENABLED: AI will only respond after payment"
echo "- If payment protection is DISABLED: AI will respond without payment"