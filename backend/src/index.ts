import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import stripeRoutes from './routes/stripe';
import blockchainRoutes from './routes/blockchain';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Stripe webhooks need raw body for signature verification — must come BEFORE express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/stripe', stripeRoutes);
app.use('/api/blockchain', blockchainRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Invoice Marketplace API - Stripe Integration',
    version: '1.0.0',
    endpoints: {
      stripe: {
        status: 'GET /api/stripe/status',
        getInvoices: 'GET /api/stripe/invoices',
        getInvoice: 'GET /api/stripe/invoices/:id',
        createInvoice: 'POST /api/stripe/create-invoice',
        markPaid: 'POST /api/stripe/mark-paid',
        generateDemo: 'POST /api/stripe/demo/generate',
        mappings: 'GET /api/stripe/mappings',
        webhook: 'POST /api/stripe/webhook (Stripe webhook)',
      },
      blockchain: {
        listedInvoices: 'GET /api/blockchain/invoices/listed',
        getInvoice: 'GET /api/blockchain/invoices/:id',
        userInvoices: 'GET /api/blockchain/invoices/user/:address',
        calculateDiscount: 'POST /api/blockchain/calculate-discount',
        stats: 'GET /api/blockchain/stats',
      },
    },
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  🚀 Server running on port ${PORT}
  📝 Environment: ${process.env.NODE_ENV || 'development'}
  🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
  ⛓️  Contract Address: ${process.env.CONTRACT_ADDRESS}
  🔗 Tempo RPC: ${process.env.TEMPO_RPC_URL || 'https://rpc.moderato.tempo.xyz'}
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

export default app;
