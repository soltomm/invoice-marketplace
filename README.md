# 🚀 Invoice Marketplace - Complete Platform

Blockchain-based invoice factoring marketplace with Stripe integration.

## 📋 What This Is

A platform where:
- **Sellers**: Upload invoices from Stripe and get instant cash (minus small discount)
- **Investors**: Buy invoices and earn 10-15% APY when they're settled
- **Built on Tempo**: For instant settlement and sub-millidollar fees

## 🏗️ Architecture

```
QuickBooks (Invoices) 
    ↓ OAuth + API
Express Backend
    ↓ ethers.js
Tempo Blockchain (Smart Contracts)
    ↓ Privy
Next.js Frontend
```

## 📁 Project Structure

```
invoice-marketplace/
├── contracts/          # Solidity smart contracts (Foundry)
├── backend/           # Express API (QuickBooks + Blockchain)
└── frontend/          # Next.js app (coming next)
```

## 🚀 Quick Start (48-Hour Build)

### Day 1: Saturday

**Morning (4 hours): Smart Contracts**
```bash
cd contracts
forge install
forge test
forge script script/Deploy.s.sol --rpc-url $TEMPO_RPC_URL --broadcast
# Save contract address!
```

**Afternoon (4 hours): Backend**
```bash
cd backend
npm install
# Configure .env with QuickBooks credentials
npm run dev
```

**Evening (4 hours): Frontend Setup**
```bash
cd frontend
npm install
# Configure .env with Privy App ID
npm run dev
```

### Day 2: Sunday

**Morning-Afternoon (8 hours)**: Build frontend pages, integrate everything
**Evening (4 hours)**: Demo video, pitch deck, testing

## 📦 Installation

### Prerequisites

- Node.js 18+
- Foundry (Tempo fork): `foundryup -n tempo`
- QuickBooks Developer account
- Privy account (for wallet auth)
- Tempo testnet funds

### 1. Smart Contracts

```bash
cd contracts

# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit

# Create .env
echo "PRIVATE_KEY=your_key" > .env
echo "TEMPO_RPC_URL=https://rpc.moderato.tempo.xyz" >> .env

# Test
forge test -vvv

# Deploy
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $TEMPO_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast

# Copy ABI
cat out/InvoiceMarket.sol/InvoiceMarket.json | jq .abi > ../backend/src/abi/InvoiceMarket.json
```

### 2. Backend

```bash
cd backend

# Install
npm install

# Configure
cp .env.example .env
# Edit .env with:
# - QB credentials (from developer.intuit.com)
# - Contract address (from deployment)
# - Private key

# Run
npm run dev
```

### 3. Frontend (Instructions provided separately)

## 🔑 Getting QuickBooks Credentials

1. Go to https://developer.intuit.com
2. Click "Create an app"
3. Choose "QuickBooks Online and Payments"
4. Get your Client ID and Client Secret
5. Add redirect URI: `http://localhost:4000/api/quickbooks/callback`
6. Create sandbox company for testing

## 🎯 Demo Flow

### Setup (3 wallets needed)

- **Wallet 1 (You)**: Seller/Freelancer
- **Wallet 2 (Judge)**: Investor
- **Wallet 3 (Judge)**: Buyer/Client

### Act 1: Connect QuickBooks

1. Click "Connect QuickBooks"
2. OAuth flow → Authorize
3. Return to dashboard

### Act 2: Sync & Create Invoice

1. Click "Sync Invoices"
2. See invoices from QuickBooks
3. Select one: e.g., "$10,000 due in 60 days"
4. Click "Get Cash Now"
5. Invoice created on blockchain

### Act 3: Investor Buys

1. Switch to marketplace view
2. See invoice listed
3. Shows: "11.5% APY - Get $10,000 for $9,850"
4. Click "Buy Invoice"
5. Investor pays $9,850

### Act 4: Settlement

1. 60 days later (fast-forward on testnet)
2. Buyer pays $10,000
3. Investor receives $10,000
4. Profit: $150 in 60 days = 11.5% APY

## 💰 Economics

### Example Invoice

- Face value: $10,000
- Due in: 60 days
- Discount: ~2% ($200)
- Seller gets: $9,800 instantly
- Investor pays: $9,800
- Investor gets: $10,000 in 60 days
- Investor APY: 12.2%
- Platform fee: 0.5% ($50)

## 📊 Tech Stack

| Layer | Technology |
|-------|------------|
| Smart Contracts | Solidity 0.8.20, Foundry |
| Blockchain | Tempo (EVM-compatible L1) |
| Backend | Node.js, Express, TypeScript |
| Integration | QuickBooks OAuth, intuit-oauth |
| Blockchain Client | ethers.js v6 |
| Frontend | Next.js 14, TypeScript |
| Wallet Auth | Privy |
| UI | Tailwind CSS, shadcn/ui |
| Session | express-session (in-memory) |

## 🧪 Testing

### Smart Contracts

```bash
cd contracts
forge test -vvv
forge test --match-test testCreateInvoice -vvv
```

### Backend

```bash
cd backend
npm run dev
# Test endpoints with curl or Postman
curl http://localhost:4000/health
```

### Integration Test

```bash
# 1. Deploy contract
# 2. Start backend
# 3. Create test invoice via API
# 4. Verify on blockchain
cast call $CONTRACT_ADDRESS "invoiceCount()" --rpc-url $TEMPO_RPC_URL
```

## 🐛 Troubleshooting

### QuickBooks OAuth fails

- Check redirect URI matches exactly
- Verify Client ID/Secret are correct
- Make sure using sandbox environment

### Contract deployment fails

- Ensure you have testnet funds
- Check private key is correct
- Verify RPC URL is accessible

### Backend can't connect to contract

- Verify CONTRACT_ADDRESS is set correctly
- Check ABI file was copied
- Ensure RPC URL is working

## 📝 Roadmap

### MVP (Hackathon - 48 hours)

- [x] Smart contracts
- [x] Backend API
- [x] QuickBooks integration
- [ ] Frontend (in progress)
- [ ] Demo video

### Post-Hackathon

- [ ] Database for persistence
- [ ] Real buyer wallet integration
- [ ] Email notifications
- [ ] Credit scoring
- [ ] Insurance pool
- [ ] Mobile app

## 🏆 Hackathon Pitch

**Problem**: Small businesses wait 30-90 days to get paid. Cash flow crisis.

**Solution**: Instant liquidity marketplace. Sell your invoices, get cash now.

**Why Tempo**: 
- Instant settlement (vs 3-5 days traditional)
- Sub-cent fees (vs 3-5% factoring fees)
- Built-in reconciliation (memos)
- Real QuickBooks integration (not a demo)

**Market**: $3T invoice factoring market, 7M QuickBooks users

**Business Model**: 0.5% platform fee = $500 on $100K invoice

**Demo**: Live QuickBooks sync → Blockchain → Settlement

## 🤝 Contributing

This is a hackathon project! Feel free to fork and improve.

## 📄 License

MIT

## 🙏 Acknowledgments

- Tempo team for the blockchain
- QuickBooks for the API
- Privy for wallet infrastructure
- OpenZeppelin for smart contract libraries

---

**Built for [Hackathon Name]**
**Team**: [Your Name]
**Date**: February 2025
