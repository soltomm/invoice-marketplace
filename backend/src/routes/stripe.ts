import express from 'express';
import { StripeService } from '../services/stripe-service';
import { BlockchainService } from '../services/blockchain';

const router = express.Router();
const stripeService = new StripeService();
const blockchainService = new BlockchainService();

// Store for invoice mappings (in production, use a database)
const invoiceMappings = new Map<string, number>(); // stripeInvoiceId -> blockchainInvoiceId

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
    const { stripeInvoiceId, sellerAddress } = req.body;

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

    // Fetch Stripe invoice details
    const stripeInvoice = await stripeService.getInvoice(stripeInvoiceId);

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
      '0x0000000000000000000000000000000000000000', // Placeholder buyer address
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

export default router;
