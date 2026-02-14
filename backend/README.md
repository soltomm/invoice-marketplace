# Invoice Marketplace Backend - Stripe Integration

Express.js backend that syncs invoices from Stripe and creates blockchain factoring opportunities on Tempo.

## Why Stripe?

- ✅ **Simpler**: No OAuth - just API keys
- ✅ **Better APIs**: Modern, well-documented
- ✅ **Perfect fit**: Tempo is incubated by Stripe + Paradigm
- ✅ **Instant test data**: Stripe test mode has built-in invoices
- ✅ **Faster to build**: 2 hours vs 6 hours for QuickBooks

## Prerequisites

- Node.js 18+ and npm
- Stripe account (free)
- Deployed InvoiceMarket smart contract on Tempo

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

### 3. Get QuickBooks Credentials

1. Go to [QuickBooks Developer Portal](https://developer.intuit.com/)
2. Create a new app
3. Get your Client ID and Client Secret
4. Add redirect URI: `http://localhost:4000/api/quickbooks/callback`
5. Update `.env` with your credentials

### 4. Copy Contract ABI

After deploying the smart contract:

```bash
# From contracts directory
cat out/InvoiceMarket.sol/InvoiceMarket.json | jq .abi > ../backend/src/abi/InvoiceMarket.json
```

### 5. Update Contract Address

Update `CONTRACT_ADDRESS` in `.env` with your deployed contract address.

## Running

### Development

```bash
npm run dev
```

Server will start on `http://localhost:4000`

### Production

```bash
npm run build
npm start
```

## API Endpoints

### QuickBooks

- `GET /api/quickbooks/auth` - Initiate OAuth flow
- `GET /api/quickbooks/callback` - OAuth callback (automatic)
- `POST /api/quickbooks/sync` - Sync invoices from QuickBooks
- `POST /api/quickbooks/create-invoice` - Create blockchain invoice from QB invoice
- `GET /api/quickbooks/status` - Check QB connection status
- `POST /api/quickbooks/disconnect` - Disconnect QB account
- `GET /api/quickbooks/invoice/:id` - Get specific QB invoice

### Blockchain

- `GET /api/blockchain/invoices/listed` - Get all listed invoices
- `GET /api/blockchain/invoices/:id` - Get specific invoice
- `GET /api/blockchain/invoices/user/:address` - Get user's invoices
- `POST /api/blockchain/calculate-discount` - Calculate discount for params
- `GET /api/blockchain/stats` - Get marketplace stats

## QuickBooks Sandbox Setup

1. Create sandbox company: https://developer.intuit.com/app/developer/sandbox
2. Add test invoices in the sandbox
3. Use sandbox credentials in `.env`

### Test Data

Create test invoices in QB sandbox:
- Customer: "Test Client"
- Amount: $5,000 - $50,000
- Due date: 30-90 days from now

## Architecture

```
┌─────────────┐
│ QuickBooks  │ ← OAuth 2.0
│   API       │
└──────┬──────┘
       │
┌──────▼──────┐
│   Express   │
│   Backend   │
│             │
│ - OAuth     │
│ - Sync      │
│ - Transform │
└──────┬──────┘
       │
┌──────▼──────┐
│   Tempo     │
│ Blockchain  │
│             │
│ - Create    │
│ - List      │
│ - Settle    │
└─────────────┘
```

## Development Notes

### Session Management

- Uses express-session for OAuth tokens
- In production: Use Redis or database for sessions
- Current: In-memory (resets on restart)

### Security

- Never commit `.env` file
- Use environment variables for all secrets
- In production: Encrypt QB tokens before storage
- Use HTTPS in production

### Testing

Create test file `src/__tests__/quickbooks.test.ts`:

```typescript
describe('QuickBooks Integration', () => {
  it('should fetch invoices', async () => {
    // Test implementation
  });
});
```

Run tests:
```bash
npm test
```

## Troubleshooting

### OAuth Errors

- Check redirect URI matches exactly in QB dashboard
- Ensure Client ID and Secret are correct
- Check QuickBooks sandbox vs production environment

### Blockchain Errors

- Verify contract address is correct
- Check RPC URL is accessible
- Ensure private key has testnet funds

### CORS Errors

- Update `FRONTEND_URL` in `.env`
- Check cors configuration in `src/index.ts`

## Production Checklist

- [ ] Use environment-specific QuickBooks app
- [ ] Set up proper session storage (Redis)
- [ ] Encrypt sensitive data in database
- [ ] Set up logging (Winston/Pino)
- [ ] Add rate limiting
- [ ] Set up monitoring (Sentry)
- [ ] Use HTTPS
- [ ] Implement proper error handling
- [ ] Add request validation
- [ ] Set up CI/CD

## License

MIT
