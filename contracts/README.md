# Smart Contracts Setup

## Prerequisites
- Foundry installed (with Tempo fork)
- Private key with testnet funds

## Installation

```bash
cd contracts

# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# Install Foundry standard library
forge install foundry-rs/forge-std --no-commit
```

## Configuration

Create `.env` file:
```bash
PRIVATE_KEY=your_private_key_here
TEMPO_RPC_URL=https://rpc.moderato.tempo.xyz
```

## Testing

```bash
# Run all tests
forge test -vvv

# Run specific test
forge test --match-test testCreateInvoice -vvv

# Gas report
forge test --gas-report
```

## Deployment

```bash
# Load environment variables
source .env

# Deploy to Tempo testnet
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $TEMPO_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify

# Save the contract address from output!
```

## Verify Contract (if not auto-verified)

```bash
forge verify-contract \
  --chain-id 42431 \
  --compiler-version v0.8.20 \
  <CONTRACT_ADDRESS> \
  src/InvoiceMarket.sol:InvoiceMarket
```

## Interact with Contract

```bash
# Get invoice count
cast call <CONTRACT_ADDRESS> "invoiceCount()" --rpc-url $TEMPO_RPC_URL

# Get listed invoices
cast call <CONTRACT_ADDRESS> "getListedInvoices()" --rpc-url $TEMPO_RPC_URL

# Create invoice (example)
cast send <CONTRACT_ADDRESS> \
  "createInvoice(address,uint256,uint256,string)" \
  <BUYER_ADDRESS> \
  10000000000000000000000 \
  60 \
  '{"qbId":"123"}' \
  --rpc-url $TEMPO_RPC_URL \
  --private-key $PRIVATE_KEY
```

## Contract ABI

After deployment, copy the ABI:
```bash
cat out/InvoiceMarket.sol/InvoiceMarket.json | jq .abi > ../backend/src/abi/InvoiceMarket.json
```
