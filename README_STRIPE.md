# 🚀 Invoice Marketplace - Stripe + Tempo

**Blockchain-based invoice factoring with instant Stripe integration**

> Get instant cash for your invoices. Earn yield by funding invoices.

## 🎯 What This Does

### For Sellers (Freelancers/Businesses)
- Sync invoices from Stripe
- List invoice on blockchain marketplace
- Get **instant cash** (minus small discount)
- No waiting 30-90 days for payment

### For Investors
- Browse available invoices
- Buy invoices at discount
- Earn **10-15% APY** when settled
- Secure smart contract escrow

### Built On
- **Tempo**: Instant settlement, sub-millidollar fees
- **Stripe**: Invoice sync (Tempo is incubated by Stripe!)
- **Smart Contracts**: Trustless escrow & marketplace

---

## 💰 Example

```
Stripe Invoice: $10,000 due in 60 days
    ↓
Seller lists on marketplace
    ↓
Platform offers: $9,800 instant cash (2% discount)
    ↓
Investor buys for $9,800
    ↓
Seller gets $9,800 NOW ✅
    ↓
60 days later...
    ↓
Buyer pays $10,000
    ↓
Investor gets $10,000 ✅
Profit: $200 in 60 days = 12% APY
```

---

## 🏗️ Architecture

```
┌──────────────┐
│    Stripe    │  ← Invoice management
│   Invoices   │
└──────┬───────┘
       │ REST API
┌──────▼───────┐
│   Backend    │  ← Express.js
│  (Node.js)   │
└──────┬───────┘
       │ ethers.js
┌──────▼───────┐
│    Tempo     │  ← Smart contracts
│  Blockchain  │
└──────┬───────┘
       │ Privy
┌──────▼───────┐
│   Frontend   │  ← Next.js
│   (React)    │
└──────────────┘
```

---

## 📦 Installation

### Prerequisites
- Node.js 18+
- Foundry with Tempo support
- Stripe account (free)
- Wallet with Tempo testnet funds

### 1. Smart Contracts

```bash
cd contracts

# Install Foundry dependencies
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit

# Create .env file
cat > .env << EOF
PRIVATE_KEY=your_private_key_here
TEMPO_RPC_URL=https://rpc.moderato.tempo.xyz
EOF

# Test contracts
forge test -vvv

# Deploy to Tempo testnet
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://rpc.moderato.tempo.xyz \
  --private-key $PRIVATE_KEY \
  --broadcast

# ⚠️ SAVE THE CONTRACT ADDRESS from output!
```

### 2. Backend

```bash
cd backend

# Install dependencies
npm install

# Copy ABI from contracts
cat ../contracts/out/InvoiceMarket.sol/InvoiceMarket.json | jq .abi > src/abi/InvoiceMarket.json

# Create .env file
cat > .env << EOF
STRIPE_SECRET_KEY=sk_test_your_key_here
CONTRACT_ADDRESS=0x...  # From step 1
PLATFORM_PRIVATE_KEY=0x...
TEMPO_RPC_URL=https://rpc.moderato.tempo.xyz
FRONTEND_URL=http://localhost:3000
EOF

# Start backend
npm run dev
```

### 3. Get Stripe Credentials

**Super simple - no OAuth!**

1. Go to https://stripe.com
2. Sign up (free)
3. Click **Developers** → **API Keys**
4. Copy **Secret key** (starts with `sk_test_`)
5. Paste in backend `.env`

**Done!** No redirect URIs, no OAuth dance.

### 4. Create Test Invoices

**Option A: Auto-generate (easiest)**
```bash
curl -X POST http://localhost:4000/api/stripe/demo/generate
```

**Option B: Stripe Dashboard**
1. Go to https://dashboard.stripe.com/test/invoices
2. Click "Create invoice"
3. Fill in details
4. Set due date 30-90 days out
5. Click "Finalize"

---

## 🎪 Demo Flow (5 minutes)

### Setup: 3 Wallets

- **Wallet A** (You): Seller
- **Wallet B** (Judge): Investor  
- **Wallet C** (Judge): Buyer

### Act 1: Sync Invoices from Stripe

```bash
# 1. List invoices in Stripe
curl http://localhost:4000/api/stripe/invoices

# You'll see something like:
# {
#   "invoices": [
#     {
#       "stripeId": "in_1234",
#       "amount": 5000,
#       "daysUntilDue": 45,
#       "customerName": "Acme Corp"
#     }
#   ]
# }
```

### Act 2: Create Blockchain Invoice

```bash
# 2. Put invoice on blockchain
curl -X POST http://localhost:4000/api/stripe/create-invoice \
  -H "Content-Type: application/json" \
  -d '{
    "stripeInvoiceId": "in_1234",
    "sellerAddress": "0xYourWalletA"
  }'

# Returns:
# {
#   "txHash": "0xabc...",
#   "blockchainInvoiceId": 1
# }
```

### Act 3: List on Marketplace

```bash
# 3. See invoice on marketplace
curl http://localhost:4000/api/blockchain/invoices/listed

# Shows:
# {
#   "invoices": [{
#     "id": 1,
#     "faceValue": "5000",
#     "discountedValue": "4900",
#     "daysUntilDue": 45
#   }]
# }
```

### Act 4: Investor Buys

*(Using frontend with Wallet B)*
1. Connect wallet
2. View marketplace
3. See: "$5000 invoice - 11.5% APY - Pay $4,900"
4. Click "Buy Invoice"
5. Sign transaction
6. Seller gets $4,900 instantly!

### Act 5: Settlement

*(60 days later, or fast-forward on testnet)*
1. Buyer (Wallet C) pays invoice
2. Smart contract releases $5,000 to investor
3. Investor profit: $100 = 11.5% APY
4. Invoice marked settled

**Total demo time: 5 minutes**

---

## 🔑 Key Features

### Stripe Integration
- ✅ Zero OAuth complexity
- ✅ Instant invoice sync
- ✅ Test mode built-in
- ✅ Auto-generate demo data
- ✅ Production-ready API

### Smart Contracts
- ✅ Dynamic APY pricing (12% default)
- ✅ Platform fee (0.5%)
- ✅ Escrow & settlement
- ✅ Cancel before sale
- ✅ View functions

### Tempo Features
- ✅ Instant finality
- ✅ Sub-cent gas fees
- ✅ Stablecoin payments
- ✅ TIP-20 memos

---

## 📊 Economics

| Scenario | Face Value | Due In | Discount | APY |
|----------|-----------|--------|----------|-----|
| Small | $5,000 | 30 days | 0.99% | 12% |
| Medium | $10,000 | 60 days | 1.97% | 12% |
| Large | $50,000 | 90 days | 2.96% | 12% |

**Platform Revenue:**
- 0.5% fee on each transaction
- $10k invoice = $50 fee
- $1M monthly volume = $5k revenue

---

## 🧪 Testing

### Smart Contracts
```bash
cd contracts
forge test -vvv
forge test --match-test testBuyInvoice -vvv
```

### Backend
```bash
cd backend

# Health check
curl http://localhost:4000/health

# Test Stripe connection
curl http://localhost:4000/api/stripe/status

# Generate demo invoices
curl -X POST http://localhost:4000/api/stripe/demo/generate

# List invoices
curl http://localhost:4000/api/stripe/invoices
```

### Integration
```bash
# Full flow test
./scripts/test-flow.sh
```

---

## 🚀 Deployment

### Testnet (Hackathon)
Already done if you followed installation!

### Production

**1. Deploy Contracts**
```bash
forge script script/Deploy.s.sol \
  --rpc-url https://rpc.tempo.xyz \
  --private-key $MAINNET_PRIVATE_KEY \
  --broadcast --verify
```

**2. Backend**
- Use production Stripe keys
- Setup PostgreSQL
- Deploy to Railway/Render
- Configure environment variables

**3. Frontend**
- Deploy to Vercel
- Update API endpoints
- Configure Privy production app

---

## 🐛 Troubleshooting

### "No Stripe invoices found"
```bash
# Generate demo invoices
curl -X POST http://localhost:4000/api/stripe/demo/generate
```

### "Contract deployment failed"
- Check you have testnet funds
- Verify RPC URL is correct
- Try: `cast balance $YOUR_ADDRESS --rpc-url $TEMPO_RPC_URL`

### "Backend can't connect to Stripe"
- Check `STRIPE_SECRET_KEY` starts with `sk_test_`
- Go to Stripe dashboard → API keys → Copy secret key
- Make sure it's test mode (not live)

### "Invoice already on blockchain"
- Each Stripe invoice can only be listed once
- Create a new invoice or use different one
- Check mappings: `curl http://localhost:4000/api/stripe/mappings`

---

## 📝 API Endpoints

### Stripe
- `GET /api/stripe/status` - Connection check
- `GET /api/stripe/invoices` - List all open invoices
- `GET /api/stripe/invoices/:id` - Get one invoice
- `POST /api/stripe/create-invoice` - Put on blockchain
- `POST /api/stripe/demo/generate` - Create test data
- `GET /api/stripe/mappings` - View Stripe ↔ Blockchain IDs

### Blockchain
- `GET /api/blockchain/invoices/listed` - Marketplace
- `GET /api/blockchain/invoices/:id` - Invoice details
- `GET /api/blockchain/invoices/user/:address` - User's invoices
- `POST /api/blockchain/calculate-discount` - Pricing calculator
- `GET /api/blockchain/stats` - Platform stats

---

## 🏆 Why This Wins

### Perfect Narrative
- Stripe incubated Tempo
- Using Stripe invoices on Tempo blockchain
- Full circle integration

### Real Integration
- Not mock data
- Actual Stripe API
- Production-ready backend

### Technical Depth
- Smart contracts (Solidity)
- Backend API (TypeScript)
- Blockchain integration (ethers.js)
- Real-time sync

### Market Validation
- $3T invoice factoring market
- Millions of Stripe users
- Clear pain point

---

## 📚 Resources

- **Stripe API**: https://stripe.com/docs/api/invoices
- **Tempo Docs**: https://docs.tempo.xyz
- **Smart Contracts**: See `/contracts/README.md`
- **Backend API**: See `/backend/README_STRIPE.md`

---

## 🙏 Credits

- **Tempo Team**: Blockchain platform
- **Stripe**: Invoice API
- **OpenZeppelin**: Smart contract libraries
- **You**: Building this!

---

## 📄 License

MIT

---

**Built for Tempo Hackathon**
**February 2025**
