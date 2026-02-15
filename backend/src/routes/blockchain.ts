import express from 'express';
import { BlockchainService } from '../services/blockchain';

const router = express.Router();
const blockchainService = new BlockchainService();

/**
 * Get all listed invoices from blockchain
 */
router.get('/invoices/listed', async (req, res) => {
  try {
    const invoices = await blockchainService.getListedInvoices();
    
    const formatted = invoices.map(inv => {
      const metadata = inv.metadata ? JSON.parse(inv.metadata) : {};
      return {
        id: inv.id,
        seller: inv.seller,
        buyer: inv.buyer,
        faceValue: blockchainService.formatFromWei(inv.faceValue),
        discountedValue: blockchainService.formatFromWei(inv.discountedValue),
        settlementDate: new Date(Number(inv.settlementDate) * 1000).toISOString(),
        status: inv.status,
        metadata,
        daysUntilDue: Math.ceil(
          (Number(inv.settlementDate) * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
        ),
      };
    });

    res.json({ success: true, invoices: formatted });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

/**
 * Get invoice by ID
 */
router.get('/invoices/:id', async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const invoice = await blockchainService.getInvoice(invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const metadata = invoice.metadata ? JSON.parse(invoice.metadata) : {};
    const apy = await blockchainService.calculateAPY(invoiceId);

    res.json({
      success: true,
      invoice: {
        id: invoice.id,
        seller: invoice.seller,
        buyer: invoice.buyer,
        investor: invoice.investor,
        faceValue: blockchainService.formatFromWei(invoice.faceValue),
        discountedValue: blockchainService.formatFromWei(invoice.discountedValue),
        settlementDate: new Date(Number(invoice.settlementDate) * 1000).toISOString(),
        status: invoice.status,
        metadata,
        apy,
        daysUntilDue: Math.ceil(
          (Number(invoice.settlementDate) * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
        ),
      },
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

/**
 * Get user's invoices (as seller)
 */
router.get('/invoices/user/:address', async (req, res) => {
  try {
    const invoices = await blockchainService.getMyInvoices(req.params.address);
    
    const formatted = invoices.map(inv => {
      const metadata = inv.metadata ? JSON.parse(inv.metadata) : {};
      return {
        id: inv.id,
        seller: inv.seller,
        buyer: inv.buyer,
        investor: inv.investor,
        faceValue: blockchainService.formatFromWei(inv.faceValue),
        discountedValue: blockchainService.formatFromWei(inv.discountedValue),
        settlementDate: new Date(Number(inv.settlementDate) * 1000).toISOString(),
        status: inv.status,
        metadata,
      };
    });

    res.json({ success: true, invoices: formatted });
  } catch (error) {
    console.error('Error fetching user invoices:', error);
    res.status(500).json({ error: 'Failed to fetch user invoices' });
  }
});

/**
 * Calculate discount for given parameters
 */
router.post('/calculate-discount', async (req, res) => {
  try {
    const { faceValue, daysUntilSettlement } = req.body;

    if (!faceValue || !daysUntilSettlement) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Simulated calculation (matches smart contract logic)
    const baseAPY = 1200; // 12% in basis points
    const discount = (faceValue * daysUntilSettlement * baseAPY) / (365 * 10000);
    const discountedValue = faceValue - discount;
    const apy = (discount * 365 * 100) / (discountedValue * daysUntilSettlement);

    res.json({
      success: true,
      faceValue,
      discountedValue,
      discount,
      apy: apy.toFixed(2),
      daysUntilSettlement,
    });
  } catch (error) {
    console.error('Error calculating discount:', error);
    res.status(500).json({ error: 'Failed to calculate discount' });
  }
});

/**
 * Buy an invoice (investor purchases at discounted value)
 */
router.post('/buy', async (req, res) => {
  try {
    const { invoiceId, investorAddress } = req.body;

    if (invoiceId === undefined || !investorAddress) {
      return res.status(400).json({ error: 'Missing invoiceId or investorAddress' });
    }

    const result = await blockchainService.buyInvoice(Number(invoiceId), investorAddress);

    res.json({
      success: true,
      txHash: result.txHash,
      message: `Invoice ${invoiceId} purchased successfully`,
    });
  } catch (error: any) {
    console.error('Buy invoice error:', error);
    res.status(500).json({ error: error.message || 'Failed to buy invoice' });
  }
});

/**
 * Get AlphaUSD balance for an address
 */
router.get('/balance/:address', async (req, res) => {
  try {
    const balance = await blockchainService.getBalance(req.params.address);
    res.json({
      success: true,
      address: req.params.address,
      balance,
      token: 'AlphaUSD',
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

/**
 * Get contract stats
 */
router.get('/stats', async (req, res) => {
  try {
    const listedInvoices = await blockchainService.getListedInvoices();
    
    const totalValue = listedInvoices.reduce(
      (sum, inv) => sum + Number(blockchainService.formatFromWei(inv.faceValue)),
      0
    );

    res.json({
      success: true,
      stats: {
        totalInvoices: listedInvoices.length,
        totalValue,
        averageAPY: 12, // Would calculate from actual invoices
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
