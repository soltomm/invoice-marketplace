import express from 'express';
import { QuickBooksService } from '../services/quickbooks';
import { BlockchainService } from '../services/blockchain';

const router = express.Router();
const qbService = new QuickBooksService();
const blockchainService = new BlockchainService();

// Store for invoice mappings (in production, use a database)
const invoiceMappings = new Map<string, number>(); // qbInvoiceId -> blockchainInvoiceId

/**
 * Initiate QuickBooks OAuth flow
 */
router.get('/auth', (req, res) => {
  try {
    const authUrl = qbService.getAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

/**
 * OAuth callback handler
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, realmId } = req.query;

    if (!code || !realmId) {
      return res.status(400).json({ error: 'Missing code or realmId' });
    }

    // Exchange code for tokens
    const tokens = await qbService.getTokens(code as string);

    // Store tokens in session (in production, encrypt and store in database)
    req.session.qbTokens = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      realmId: realmId as string,
    };

    // Redirect to frontend dashboard
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?connected=true`);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=auth_failed`);
  }
});

/**
 * Sync invoices from QuickBooks
 */
router.post('/sync', async (req, res) => {
  try {
    const qbTokens = req.session.qbTokens;

    if (!qbTokens) {
      return res.status(401).json({ error: 'Not connected to QuickBooks' });
    }

    // Validate token
    const isValid = await qbService.validateToken(qbTokens.accessToken);
    if (!isValid) {
      // Try to refresh
      try {
        const newTokens = await qbService.refreshTokens(qbTokens.refreshToken);
        req.session.qbTokens.accessToken = newTokens.accessToken;
        req.session.qbTokens.refreshToken = newTokens.refreshToken;
      } catch (refreshError) {
        return res.status(401).json({ error: 'Token expired, please reconnect' });
      }
    }

    // Fetch unpaid invoices
    const qbInvoices = await qbService.getUnpaidInvoices(
      req.session.qbTokens.accessToken,
      req.session.qbTokens.realmId
    );

    // Transform to frontend format
    const invoices = qbInvoices.map(inv => {
      const dueDate = new Date(inv.DueDate);
      const daysUntil = Math.ceil(
        (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      return {
        qbId: inv.Id,
        invoiceNumber: inv.DocNumber,
        customerName: inv.CustomerRef.name,
        customerId: inv.CustomerRef.value,
        amount: parseFloat(inv.Balance.toString()),
        totalAmount: parseFloat(inv.TotalAmt.toString()),
        dueDate: inv.DueDate,
        daysUntilDue: daysUntil > 0 ? daysUntil : 0,
        isPastDue: daysUntil < 0,
        isOnBlockchain: invoiceMappings.has(inv.Id),
        blockchainId: invoiceMappings.get(inv.Id),
      };
    });

    res.json({ success: true, invoices });
  } catch (error: any) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync invoices' });
  }
});

/**
 * Create blockchain invoice from QuickBooks invoice
 */
router.post('/create-invoice', async (req, res) => {
  try {
    const { qbInvoiceId, sellerAddress } = req.body;
    const qbTokens = req.session.qbTokens;

    if (!qbTokens) {
      return res.status(401).json({ error: 'Not connected to QuickBooks' });
    }

    if (!qbInvoiceId || !sellerAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if already on blockchain
    if (invoiceMappings.has(qbInvoiceId)) {
      return res.status(400).json({ 
        error: 'Invoice already on blockchain',
        blockchainId: invoiceMappings.get(qbInvoiceId)
      });
    }

    // Fetch QB invoice details
    const qbInvoice = await qbService.getInvoice(
      qbTokens.accessToken,
      qbTokens.realmId,
      qbInvoiceId
    );

    // Calculate days until due
    const dueDate = new Date(qbInvoice.DueDate);
    const daysUntil = Math.ceil(
      (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil <= 0) {
      return res.status(400).json({ error: 'Invoice is past due' });
    }

    // Create metadata
    const metadata = {
      qbInvoiceId: qbInvoice.Id,
      qbRealmId: qbTokens.realmId,
      invoiceNumber: qbInvoice.DocNumber,
      customerName: qbInvoice.CustomerRef.name,
      customerId: qbInvoice.CustomerRef.value,
      originalDueDate: qbInvoice.DueDate,
    };

    // Create on blockchain
    const result = await blockchainService.createInvoice(
      sellerAddress,
      '0x0000000000000000000000000000000000000000', // Placeholder buyer address
      parseFloat(qbInvoice.Balance.toString()),
      daysUntil,
      metadata
    );

    // Store mapping
    invoiceMappings.set(qbInvoiceId, result.invoiceId);

    res.json({
      success: true,
      txHash: result.txHash,
      blockchainInvoiceId: result.invoiceId,
      metadata,
    });
  } catch (error: any) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create blockchain invoice' });
  }
});

/**
 * Check connection status
 */
router.get('/status', (req, res) => {
  const isConnected = !!req.session.qbTokens;
  res.json({ 
    connected: isConnected,
    realmId: req.session.qbTokens?.realmId
  });
});

/**
 * Disconnect QuickBooks
 */
router.post('/disconnect', (req, res) => {
  req.session.qbTokens = undefined;
  res.json({ success: true });
});

/**
 * Get specific invoice details
 */
router.get('/invoice/:id', async (req, res) => {
  try {
    const qbTokens = req.session.qbTokens;

    if (!qbTokens) {
      return res.status(401).json({ error: 'Not connected to QuickBooks' });
    }

    const invoice = await qbService.getInvoice(
      qbTokens.accessToken,
      qbTokens.realmId,
      req.params.id
    );

    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

export default router;
