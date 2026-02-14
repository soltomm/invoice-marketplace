import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Explicitly load .env from backend root to avoid path issues
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface StripeInvoiceData {
  id: string;
  number: string;
  customer: string;
  customerEmail: string | null;
  customerName: string | null;
  amount: number;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string;
  dueDate: number | null;
  created: number;
  description: string | null;
  lines: Array<{
    description: string;
    amount: number;
    quantity: number;
  }>;
}

export class StripeService {
  private _stripe: Stripe | undefined;

  private get stripe(): Stripe {
    if (!this._stripe) {
      const apiKey = process.env.STRIPE_SECRET_KEY;
      if (!apiKey) {
        console.error('CRITICAL: STRIPE_SECRET_KEY is missing.');
        console.error('Looking for .env at:', path.resolve(__dirname, '../../.env'));
        throw new Error('STRIPE_SECRET_KEY not configured');
      }
      this._stripe = new Stripe(apiKey, {
        apiVersion: '2023-10-16',
      });
    }
    return this._stripe;
  }

  constructor() {}

  /**
   * Get all open (unpaid) invoices
   */
  async getUnpaidInvoices(limit: number = 100): Promise<StripeInvoiceData[]> {
    try {
      const invoices = await this.stripe.invoices.list({
        status: 'open',
        limit,
        expand: ['data.customer'],
      });

      return invoices.data.map(inv => this.formatInvoice(inv));
    } catch (error: any) {
      console.error('Error fetching Stripe invoices:', error.message);
      throw new Error('Failed to fetch invoices from Stripe');
    }
  }

  /**
   * Get single invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<StripeInvoiceData> {
    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId, {
        expand: ['customer'],
      });

      return this.formatInvoice(invoice);
    } catch (error: any) {
      console.error('Error fetching Stripe invoice:', error.message);
      throw new Error('Failed to fetch invoice from Stripe');
    }
  }

  /**
   * Mark invoice as paid (when settled on blockchain)
   */
  async markInvoiceAsPaid(invoiceId: string): Promise<void> {
    try {
      await this.stripe.invoices.pay(invoiceId, {
        paid_out_of_band: true, // Mark as paid outside of Stripe
      });
    } catch (error: any) {
      console.error('Error marking invoice as paid:', error.message);
      throw new Error('Failed to mark invoice as paid');
    }
  }

  /**
   * Create a test invoice (for demo purposes)
   */
  async createTestInvoice(
    customerId: string,
    amount: number,
    dueInDays: number,
    description: string
  ): Promise<StripeInvoiceData> {
    try {
      // 1. Create empty draft invoice
      const invoice = await this.stripe.invoices.create({
        customer: customerId,
        auto_advance: false, // Don't auto-finalize
        collection_method: 'send_invoice',
        days_until_due: dueInDays,
        expand: ['customer'],
      });

      // 2. Create invoice item explicitly linked to the invoice
      await this.stripe.invoiceItems.create({
        customer: customerId,
        invoice: invoice.id, // Explicitly link
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        description,
      });

      // 3. Finalize the invoice
      const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(invoice.id, {
        expand: ['customer'],
      });

      return this.formatInvoice(finalizedInvoice);
    } catch (error: any) {
      console.error('Error creating test invoice:', error.message);
      throw new Error('Failed to create test invoice');
    }
  }

  /**
   * Get or create test customer
   */
  async getOrCreateTestCustomer(
    email: string,
    name: string
  ): Promise<string> {
    try {
      // Search for existing customer
      const customers = await this.stripe.customers.list({
        email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        return customers.data[0].id;
      }

      // Create new customer
      const customer = await this.stripe.customers.create({
        email,
        name,
        description: 'Test customer for invoice marketplace demo',
      });

      return customer.id;
    } catch (error: any) {
      console.error('Error with customer:', error.message);
      throw new Error('Failed to get/create customer');
    }
  }

  /**
   * Format Stripe invoice to our standard format
   */
  private formatInvoice(invoice: Stripe.Invoice): StripeInvoiceData {
    const customer = invoice.customer as Stripe.Customer | null;
    
    return {
      id: invoice.id,
      number: invoice.number || invoice.id,
      customer: typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id || '',
      customerEmail: customer?.email || null,
      customerName: customer?.name || null,
      amount: invoice.total / 100, // Convert from cents to dollars
      amountDue: invoice.amount_due / 100,
      amountPaid: invoice.amount_paid / 100,
      currency: invoice.currency.toUpperCase(),
      status: invoice.status || 'unknown',
      dueDate: invoice.due_date,
      created: invoice.created,
      description: invoice.description || null,
      lines: (invoice.lines?.data || []).map(line => ({
        description: line.description || '',
        amount: line.amount / 100,
        quantity: line.quantity || 1,
      })),
    };
  }

  /**
   * Get invoice payment status
   */
  async getInvoiceStatus(invoiceId: string): Promise<'open' | 'paid' | 'void' | 'uncollectible'> {
    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId);
      return invoice.status as any;
    } catch (error) {
      return 'open';
    }
  }

  /**
   * Validate Stripe connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.stripe.balance.retrieve();
      return true;
    } catch (error: any) {
      console.error('Stripe connection validation failed:', error.message);
      return false;
    }
  }

  /**
   * Generate test invoices for demo
   */
  async generateDemoInvoices(): Promise<StripeInvoiceData[]> {
    const demoInvoices = [
      { email: 'acme@example.com', name: 'Acme Corp', amount: 5000, days: 30, desc: 'Website Development' },
      { email: 'techstart@example.com', name: 'TechStart Inc', amount: 12000, days: 45, desc: 'Mobile App Design' },
      { email: 'globalco@example.com', name: 'Global Co', amount: 8500, days: 60, desc: 'Consulting Services' },
    ];

    const results = await Promise.allSettled(
      demoInvoices.map(async (demo) => {
        const customerId = await this.getOrCreateTestCustomer(demo.email, demo.name);
        return this.createTestInvoice(
          customerId,
          demo.amount,
          demo.days,
          demo.desc
        );
      })
    );

    const created: StripeInvoiceData[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        created.push(result.value);
      } else {
        const demoName = demoInvoices[index].name;
        const errorMessage = (result.reason as Error).message;
        console.error(`Failed to create demo invoice for ${demoName}:`, errorMessage);
        errors.push(`Failed for ${demoName}: ${errorMessage}`);
      }
    });

    if (errors.length > 0 && created.length === 0) {
      throw new Error(`Failed to generate any demo invoices. First error: ${errors[0]}`);
    }

    return created;
  }
}
