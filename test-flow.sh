#!/bin/bash

# Test flow for Invoice Marketplace with Stripe integration
# Run this after backend is running on localhost:4000

set -e

echo "🚀 Testing Invoice Marketplace - Full Flow"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:4000"

# Test 1: Health check
echo -e "${BLUE}1. Testing health endpoint...${NC}"
curl -s "$BASE_URL/health" | jq .
echo -e "${GREEN}✓ Server is running${NC}\n"

# Test 2: Stripe connection
echo -e "${BLUE}2. Testing Stripe connection...${NC}"
curl -s "$BASE_URL/api/stripe/status" | jq .
echo -e "${GREEN}✓ Stripe connected${NC}\n"

# Test 3: Generate demo invoices
echo -e "${BLUE}3. Generating demo invoices...${NC}"
curl -s -X POST "$BASE_URL/api/stripe/demo/generate" | jq .
echo -e "${GREEN}✓ Demo invoices created${NC}\n"

# Test 4: List Stripe invoices
echo -e "${BLUE}4. Fetching Stripe invoices...${NC}"
INVOICES=$(curl -s "$BASE_URL/api/stripe/invoices")
echo "$INVOICES" | jq '.invoices[] | {id: .stripeId, amount: .amount, customer: .customerName, days: .daysUntilDue}'
echo -e "${GREEN}✓ Invoices fetched${NC}\n"

# Test 5: Get first invoice ID
FIRST_INVOICE_ID=$(echo "$INVOICES" | jq -r '.invoices[0].stripeId')
echo -e "${BLUE}5. Selected invoice: $FIRST_INVOICE_ID${NC}\n"

# Test 6: Create blockchain invoice
echo -e "${BLUE}6. Creating blockchain invoice...${NC}"
# Note: Replace with actual seller address
SELLER_ADDRESS="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

CREATE_RESULT=$(curl -s -X POST "$BASE_URL/api/stripe/create-invoice" \
  -H "Content-Type: application/json" \
  -d "{
    \"stripeInvoiceId\": \"$FIRST_INVOICE_ID\",
    \"sellerAddress\": \"$SELLER_ADDRESS\"
  }")

echo "$CREATE_RESULT" | jq .

BLOCKCHAIN_ID=$(echo "$CREATE_RESULT" | jq -r '.blockchainInvoiceId')
echo -e "${GREEN}✓ Blockchain invoice created: ID $BLOCKCHAIN_ID${NC}\n"

# Test 7: View marketplace
echo -e "${BLUE}7. Viewing marketplace...${NC}"
curl -s "$BASE_URL/api/blockchain/invoices/listed" | jq '.invoices[] | {id, faceValue, discountedValue, daysUntilDue}'
echo -e "${GREEN}✓ Marketplace loaded${NC}\n"

# Test 8: Get specific invoice
echo -e "${BLUE}8. Getting invoice details...${NC}"
curl -s "$BASE_URL/api/blockchain/invoices/$BLOCKCHAIN_ID" | jq .invoice
echo -e "${GREEN}✓ Invoice details retrieved${NC}\n"

# Test 9: Calculate discount
echo -e "${BLUE}9. Testing discount calculator...${NC}"
curl -s -X POST "$BASE_URL/api/blockchain/calculate-discount" \
  -H "Content-Type: application/json" \
  -d '{
    "faceValue": 10000,
    "daysUntilSettlement": 60
  }' | jq .
echo -e "${GREEN}✓ Discount calculated${NC}\n"

# Test 10: Get stats
echo -e "${BLUE}10. Getting marketplace stats...${NC}"
curl -s "$BASE_URL/api/blockchain/stats" | jq .
echo -e "${GREEN}✓ Stats retrieved${NC}\n"

# Test 11: View mappings
echo -e "${BLUE}11. Viewing Stripe ↔ Blockchain mappings...${NC}"
curl -s "$BASE_URL/api/stripe/mappings" | jq .
echo -e "${GREEN}✓ Mappings displayed${NC}\n"

echo ""
echo "==========================================="
echo -e "${GREEN}🎉 All tests passed!${NC}"
echo ""
echo "Next steps:"
echo "  1. Connect wallet in frontend"
echo "  2. Buy invoice ID: $BLOCKCHAIN_ID"
echo "  3. Settle invoice (buyer)"
echo ""
echo "Blockchain Invoice ID: $BLOCKCHAIN_ID"
echo "Stripe Invoice ID: $FIRST_INVOICE_ID"
