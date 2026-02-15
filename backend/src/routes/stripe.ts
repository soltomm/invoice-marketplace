import express from 'express';
import Stripe from 'stripe';
import { StripeService } from '../services/stripe-service';
import { BlockchainService } from '../services/blockchain';

const router = express.Router();
const stripeService = new StripeService();
const blockchainService = new BlockchainService();

// In-memory stores (in production, use a database)
const invoiceMappings = new Map<string, number>(); // stripeInvoiceId -> blockchainInvoiceId
const connectedAccounts = new Map<string, string>(); // walletAddress (lowercase) -> stripeAccountId

/**
 * Test Stripe connection
 */
router.get('/status', async (req, res) => {
  try {
    const isConnected = await stripeService.validateConnection();
    res.json({ 
      connected: isConnected,
      message: isConnected ? 'Stripe connected successfully' : 'Stripe connection failed'
    });
  } catch (error) {
    res.status(500).json({ connected: false, error: 'Failed to connect to Stripe' });
  }
});

/**
 * Get all unpaid invoices from Stripe
 */
router.get('/invoices', async (req, res) => {
  try {
    const stripeInvoices = await stripeService.getUnpaidInvoices();

    // Transform to frontend format
    const invoices = stripeInvoices.map(inv => {
      const dueDate = inv.dueDate ? new Date(inv.dueDate * 1000) : new Date();
      const daysUntil = Math.ceil(
        (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      return {
        stripeId: inv.id,
        invoiceNumber: inv.number,
        customerName: inv.customerName || inv.customerEmail || 'Unknown',
        customerEmail: inv.customerEmail,
        amount: inv.amountDue,
        currency: inv.currency,
        dueDate: dueDate.toISOString(),
        daysUntilDue: daysUntil > 0 ? daysUntil : 0,
        isPastDue: daysUntil < 0,
        description: inv.description || inv.lines[0]?.description || 'No description',
        status: inv.status,
        isOnBlockchain: invoiceMappings.has(inv.id),
        blockchainId: invoiceMappings.get(inv.id),
        lines: inv.lines,
      };
    });

    res.json({ success: true, invoices });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices from Stripe' });
  }
});

/**
 * Get specific invoice
 */
router.get('/invoices/:id', async (req, res) => {
  try {
    const invoice = await stripeService.getInvoice(req.params.id);
    
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate * 1000) : new Date();
    const daysUntil = Math.ceil(
      (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    res.json({
      success: true,
      invoice: {
        stripeId: invoice.id,
        invoiceNumber: invoice.number,
        customerName: invoice.customerName || invoice.customerEmail || 'Unknown',
        customerEmail: invoice.customerEmail,
        amount: invoice.amountDue,
        currency: invoice.currency,
        dueDate: dueDate.toISOString(),
        daysUntilDue: daysUntil > 0 ? daysUntil : 0,
        description: invoice.description || invoice.lines[0]?.description || 'No description',
        status: invoice.status,
        lines: invoice.lines,
        isOnBlockchain: invoiceMappings.has(invoice.id),
        blockchainId: invoiceMappings.get(invoice.id),
      },
    });
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

/**
 * Create blockchain invoice from Stripe invoice
 */
router.post('/create-invoice', async (req, res) => {
  try {
    const { stripeInvoiceId, sellerAddress, connectedAccountId } = req.body;

    if (!stripeInvoiceId || !sellerAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if already on blockchain
    if (invoiceMappings.has(stripeInvoiceId)) {
      return res.status(400).json({
        error: 'Invoice already on blockchain',
        blockchainId: invoiceMappings.get(stripeInvoiceId)
      });
    }

    // Fetch Stripe invoice details (from connected account if provided)
    const stripeInvoice = connectedAccountId
      ? await stripeService.getConnectedAccountInvoice(connectedAccountId, stripeInvoiceId)
      : await stripeService.getInvoice(stripeInvoiceId);

    // Validate invoice is open (unpaid)
    if (stripeInvoice.status !== 'open') {
      return res.status(400).json({ error: 'Invoice must be open (unpaid)' });
    }

    // Calculate days until due
    const dueDate = stripeInvoice.dueDate ? new Date(stripeInvoice.dueDate * 1000) : new Date();
    const daysUntil = Math.ceil(
      (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil <= 0) {
      return res.status(400).json({ error: 'Invoice is past due or due today' });
    }

    // Create metadata
    const metadata = {
      stripeInvoiceId: stripeInvoice.id,
      invoiceNumber: stripeInvoice.number,
      customerName: stripeInvoice.customerName,
      customerEmail: stripeInvoice.customerEmail,
      description: stripeInvoice.description || stripeInvoice.lines[0]?.description,
      originalDueDate: dueDate.toISOString(),
      currency: stripeInvoice.currency,
    };

    // Create on blockchain
    const result = await blockchainService.createInvoice(
      sellerAddress,
      blockchainService.getPlatformWalletAddress(), // Platform wallet acts as buyer for settlement
      stripeInvoice.amountDue,
      daysUntil,
      metadata
    );

    // Store mapping
    invoiceMappings.set(stripeInvoiceId, result.invoiceId);

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
 * Mark Stripe invoice as paid (when settled on blockchain)
 */
router.post('/mark-paid', async (req, res) => {
  try {
    const { stripeInvoiceId, blockchainInvoiceId } = req.body;

    if (!stripeInvoiceId) {
      return res.status(400).json({ error: 'Missing stripeInvoiceId' });
    }

    // Verify blockchain invoice is settled
    const bcInvoice = await blockchainService.getInvoice(blockchainInvoiceId);
    if (!bcInvoice || bcInvoice.status !== 3) { // 3 = SETTLED
      return res.status(400).json({ error: 'Blockchain invoice not settled' });
    }

    // Mark Stripe invoice as paid
    await stripeService.markInvoiceAsPaid(stripeInvoiceId);

    res.json({ success: true, message: 'Invoice marked as paid in Stripe' });
  } catch (error: any) {
    console.error('Mark paid error:', error);
    res.status(500).json({ error: 'Failed to mark invoice as paid' });
  }
});

/**
 * Generate demo invoices for testing
 */
router.post('/demo/generate', async (req, res) => {
  try {
    const invoices = await stripeService.generateDemoInvoices();
    res.json({
      success: true,
      message: `Generated ${invoices.length} demo invoices`,
      invoices,
    });
  } catch (error: any) {
    console.error('Generate demo error:', error);
    res.status(500).json({ error: 'Failed to generate demo invoices' });
  }
});

/**
 * Get invoice mappings (Stripe ID to Blockchain ID)
 */
router.get('/mappings', (req, res) => {
  const mappings = Array.from(invoiceMappings.entries()).map(([stripeId, blockchainId]) => ({
    stripeId,
    blockchainId,
  }));
  
  res.json({ success: true, mappings });
});

// ── Stripe Connect ──────────────────────────────────────

/**
 * Start Stripe Connect onboarding for a seller
 */
router.post('/connect/onboard', async (req, res) => {
  try {
    const { walletAddress, email } = req.body;
    if (!walletAddress || !email) {
      return res.status(400).json({ error: 'Missing walletAddress or email' });
    }

    const key = walletAddress.toLowerCase();

    // Check if already connected
    const existingAccountId = connectedAccounts.get(key);
    if (existingAccountId) {
      const status = await stripeService.getAccountStatus(existingAccountId);
      if (status.chargesEnabled) {
        return res.json({ success: true, alreadyConnected: true, accountId: existingAccountId });
      }
      // Not fully onboarded — generate a new link
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const link = await stripeService.createAccountLink(
        existingAccountId,
        `${frontendUrl}/dashboard?connect=refresh`,
        `${frontendUrl}/dashboard?connect=success`
      );
      return res.json({ success: true, url: link.url, accountId: existingAccountId });
    }

    // Create new connected account
    const { accountId } = await stripeService.createConnectedAccount(email, walletAddress);
    connectedAccounts.set(key, accountId);

    // Generate onboarding link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const link = await stripeService.createAccountLink(
      accountId,
      `${frontendUrl}/dashboard?connect=refresh`,
      `${frontendUrl}/dashboard?connect=success`
    );

    res.json({ success: true, url: link.url, accountId });
  } catch (error: any) {
    console.error('Connect onboard error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to start Stripe Connect onboarding' });
  }
});

/**
 * Get Stripe Connect status for a wallet address
 */
router.get('/connect/status/:walletAddress', async (req, res) => {
  try {
    const key = req.params.walletAddress.toLowerCase();
    const accountId = connectedAccounts.get(key);

    if (!accountId) {
      return res.json({ success: true, connected: false });
    }

    const status = await stripeService.getAccountStatus(accountId);
    res.json({
      success: true,
      connected: status.chargesEnabled,
      detailsSubmitted: status.detailsSubmitted,
      accountId,
      email: status.email,
    });
  } catch (error: any) {
    console.error('Connect status error:', error);
    res.status(500).json({ error: 'Failed to check connect status' });
  }
});

/**
 * Get invoices from a seller's connected Stripe account
 */
router.get('/connect/invoices/:walletAddress', async (req, res) => {
  try {
    const key = req.params.walletAddress.toLowerCase();
    const accountId = connectedAccounts.get(key);

    if (!accountId) {
      return res.status(400).json({ error: 'No connected Stripe account for this wallet' });
    }

    const stripeInvoices = await stripeService.getConnectedAccountInvoices(accountId);

    const invoices = stripeInvoices.map(inv => {
      const dueDate = inv.dueDate ? new Date(inv.dueDate * 1000) : new Date();
      const daysUntil = Math.ceil(
        (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      return {
        stripeId: inv.id,
        invoiceNumber: inv.number,
        customerName: inv.customerName || inv.customerEmail || 'Unknown',
        customerEmail: inv.customerEmail,
        amount: inv.amountDue,
        currency: inv.currency,
        dueDate: dueDate.toISOString(),
        daysUntilDue: daysUntil > 0 ? daysUntil : 0,
        isPastDue: daysUntil < 0,
        description: inv.description || inv.lines[0]?.description || 'No description',
        status: inv.status,
        isOnBlockchain: invoiceMappings.has(inv.id),
        blockchainId: invoiceMappings.get(inv.id),
        connectedAccountId: accountId,
        lines: inv.lines,
      };
    });

    res.json({ success: true, invoices });
  } catch (error: any) {
    console.error('Connect invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices from connected account' });
  }
});

/**
 * Generate demo invoices on a connected account
 */
router.post('/connect/demo/generate/:walletAddress', async (req, res) => {
  try {
    const key = req.params.walletAddress.toLowerCase();
    const accountId = connectedAccounts.get(key);

    if (!accountId) {
      return res.status(400).json({ error: 'No connected Stripe account for this wallet' });
    }

    const invoices = await stripeService.generateConnectedAccountDemoInvoices(accountId);
    res.json({
      success: true,
      message: `Generated ${invoices.length} demo invoices on connected account`,
      invoices,
    });
  } catch (error: any) {
    console.error('Connect demo generate error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to generate demo invoices' });
  }
});

/**
 * Regenerate onboarding link (if expired)
 */
router.post('/connect/refresh-link', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: 'Missing walletAddress' });
    }

    const key = walletAddress.toLowerCase();
    const accountId = connectedAccounts.get(key);
    if (!accountId) {
      return res.status(400).json({ error: 'No connected account found — start onboarding first' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const link = await stripeService.createAccountLink(
      accountId,
      `${frontendUrl}/dashboard?connect=refresh`,
      `${frontendUrl}/dashboard?connect=success`
    );

    res.json({ success: true, url: link.url });
  } catch (error: any) {
    console.error('Connect refresh-link error:', error);
    res.status(500).json({ error: 'Failed to generate onboarding link' });
  }
});

/**
 * Stripe webhook — auto-settles blockchain invoices when Stripe invoices are paid
 */
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string | undefined;

  if (!sig) {
    return res.status(400).send('Missing stripe-signature header');
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  let event: Stripe.Event;
  try {
    event = stripeService.constructWebhookEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Log connected account info if present
  const connectedAccountEventId = (event as any).account as string | undefined;
  if (connectedAccountEventId) {
    console.log(`Webhook from connected account: ${connectedAccountEventId}`);
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice;
    const stripeInvoiceId = invoice.id;
    console.log(`Stripe invoice paid: ${stripeInvoiceId}`);

    const blockchainInvoiceId = invoiceMappings.get(stripeInvoiceId);
    if (!blockchainInvoiceId) {
      console.log(`Invoice ${stripeInvoiceId} not in blockchain mappings — skipping`);
      return res.status(200).json({ received: true });
    }

    try {
      const bcInvoice = await blockchainService.getInvoice(blockchainInvoiceId);
      if (!bcInvoice || bcInvoice.status !== 1) { // 1 = SOLD
        console.log(`Invoice ${blockchainInvoiceId} not in SOLD status (${bcInvoice?.status}) — skipping`);
        return res.status(200).json({ received: true });
      }

      const result = await blockchainService.settleInvoice(blockchainInvoiceId);
      console.log(`Settled invoice ${blockchainInvoiceId}, tx: ${result.txHash}`);
      return res.status(200).json({ received: true, settled: true, txHash: result.txHash });
    } catch (error: any) {
      console.error(`Failed to settle invoice ${blockchainInvoiceId}:`, error.message);
      // Return 200 to prevent Stripe from retrying
      return res.status(200).json({ received: true, settled: false, error: error.message });
    }
  }

  res.status(200).json({ received: true });
});

export default router;
