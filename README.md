# Invoice Marketplace

Blockchain-based invoice factoring platform. Sellers list unpaid Stripe invoices, investors buy them at a discount, and settlement happens automatically when the customer pays.

## How It Works

```
Seller connects Stripe account (Express)
    |
Seller lists unpaid invoice on blockchain
    |
Investor buys invoice at discount (pays in AlphaUSD stablecoin)
    |
Seller receives stablecoin instantly
    |
Customer pays Stripe invoice (fiat)
    |
Webhook fires -> platform debits seller's Stripe balance
                -> platform settles on-chain (investor gets faceValue in AlphaUSD)
```

### Economics

- **Base APY**: 12% (configurable in smart contract)
- **Platform fee**: 0.5% on each purchase
- Example: $10,000 invoice due in 60 days
  - Discount: ~$197 (1.97%)
  - Seller gets: $9,803 instantly in stablecoin
  - Investor pays: $9,803
  - Investor receives: $10,000 at settlement
  - Investor profit: $197 in 60 days = 12% APY

## Architecture

```
Stripe (Connected Accounts)     Tempo Blockchain
        |                              |
        v                              v
   Express Backend  <----------->  InvoiceMarket.sol
   (Node.js / TS)                  (Solidity)
        |
        v
   Next.js Frontend
   (Privy wallet auth)
```

## Project Structure

```
invoice-marketplace/
├── contracts/                # Solidity smart contracts (Foundry)
│   ├── src/InvoiceMarket.sol
│   ├── test/InvoiceMarket.t.sol
│   └── script/Deploy.s.sol
├── backend/                  # Express API
│   └── src/
│       ├── index.ts
│       ├── routes/
│       │   ├── stripe.ts         # Stripe + Connect + webhook
│       │   └── blockchain.ts     # On-chain queries + buy
│       └── services/
│           ├── stripe-service.ts  # Stripe API wrapper
│           └── blockchain.ts      # ethers.js contract interaction
└── frontend/                 # Next.js app
    ├── app/
    │   ├── page.tsx              # Landing
    │   ├── dashboard/page.tsx    # Seller dashboard
    │   └── marketplace/page.tsx  # Investor marketplace
    ├── components/
    └── lib/
        ├── api.ts                # Backend API client
        └── types.ts
```

## Setup

### Prerequisites

- Node.js 18+
- Foundry with Tempo support (`foundryup -n tempo`)
- Stripe account (free, test mode)
- Wallet with Tempo testnet funds

### 1. Smart Contracts

```bash
cd contracts

forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit

# Test
forge test -vvv

# Deploy to Tempo testnet
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://rpc.moderato.tempo.xyz \
  --private-key $PRIVATE_KEY \
  --broadcast

# Save the contract address from the output
# Copy ABI to backend
cat out/InvoiceMarket.sol/InvoiceMarket.json | jq .abi > ../backend/src/abi/InvoiceMarket.json
```

### 2. Backend

```bash
cd backend
npm install

# Create .env
cat > .env << EOF
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CONTRACT_ADDRESS=0x...
PLATFORM_PRIVATE_KEY=0x...
TEMPO_RPC_URL=https://rpc.moderato.tempo.xyz
FRONTEND_URL=http://localhost:3000
EOF

npm run dev
# Server starts on port 4000
```

### 3. Frontend

```bash
cd frontend
npm install

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
EOF

npm run dev
# App starts on port 3000
```

### 4. Stripe Webhook (local development)

```bash
# Install Stripe CLI, then:
stripe listen --forward-to localhost:4000/api/stripe/webhook
# Copy the webhook signing secret to .env as STRIPE_WEBHOOK_SECRET
```

## Deployment (Render)

### Backend
- Deploy as a Web Service
- Set all env vars from `.env`
- Build command: `npm run build`
- Start command: `npm start`

### Frontend
- Deploy as a Static Site or Web Service
- Set `NEXT_PUBLIC_API_URL` to your backend Render URL
- Build command: `npm run build`
- Start command: `npm start`

### Stripe Webhook (production)
1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://<backend>.onrender.com/api/stripe/webhook`
3. Select event: `invoice.paid`
4. Enable **"Listen to events on Connected accounts"**
5. Copy signing secret to `STRIPE_WEBHOOK_SECRET` env var in Render

## API Endpoints

### Stripe
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stripe/status` | Check Stripe connection |
| GET | `/api/stripe/invoices` | List platform open invoices |
| GET | `/api/stripe/invoices/:id` | Get specific invoice |
| POST | `/api/stripe/create-invoice` | List invoice on blockchain |
| POST | `/api/stripe/demo/generate` | Generate test invoices |
| GET | `/api/stripe/mappings` | Stripe-to-blockchain ID mappings |
| POST | `/api/stripe/webhook` | Stripe webhook (auto-settle) |

### Stripe Connect
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/stripe/connect/onboard` | Start seller onboarding |
| GET | `/api/stripe/connect/status/:wallet` | Check connection status |
| GET | `/api/stripe/connect/invoices/:wallet` | Seller's Stripe invoices |
| POST | `/api/stripe/connect/demo/generate/:wallet` | Generate demo invoices on connected account |
| POST | `/api/stripe/connect/refresh-link` | Regenerate onboarding link |

### Blockchain
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/blockchain/invoices/listed` | Marketplace listings |
| GET | `/api/blockchain/invoices/:id` | Invoice details + APY |
| GET | `/api/blockchain/invoices/user/:address` | User's invoices |
| POST | `/api/blockchain/calculate-discount` | Price calculator |
| POST | `/api/blockchain/buy` | Buy an invoice |
| GET | `/api/blockchain/balance/:address` | AlphaUSD balance |
| GET | `/api/blockchain/stats` | Platform stats |

## Smart Contract

**Address**: `0xFce38951188089B7a351FF9BA40BFDbc80Ff7AFF` (Tempo Moderato testnet)

**Payment token**: AlphaUSD at `0x20C0000000000000000000000000000000000001` (6 decimals)

### Invoice States
| Status | Value | Description |
|--------|-------|-------------|
| LISTED | 0 | Available for purchase |
| SOLD | 1 | Bought by investor, awaiting settlement |
| SETTLED | 2 | Customer paid, investor received faceValue |
| CANCELLED | 3 | Cancelled by seller before sale |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Smart Contracts | Solidity 0.8.20, Foundry |
| Blockchain | Tempo (EVM-compatible L1) |
| Backend | Node.js, Express, TypeScript |
| Stripe | Invoices API, Connect (Express), Webhooks |
| Blockchain Client | ethers.js v6 |
| Frontend | Next.js 14, TypeScript |
| Wallet Auth | Privy |
| UI | Tailwind CSS |

## Key Limitations (Demo)

- **Invoice mappings are in-memory**: The `stripeInvoiceId -> blockchainInvoiceId` mapping is lost on backend restart. The full list/buy/pay/settle flow must happen in one session. Production would use a database.
- **Connected account lookup persists**: The wallet-to-Stripe-account mapping is recovered from Stripe API metadata on restart.
- **Single platform wallet**: All blockchain operations use `PLATFORM_PRIVATE_KEY`. Production would have users sign their own transactions.

## License

MIT
