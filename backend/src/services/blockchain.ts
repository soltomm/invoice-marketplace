import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Explicitly load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import InvoiceMarketABI from '../abi/InvoiceMarket.json';

export interface BlockchainInvoice {
  id: number;
  seller: string;
  buyer: string;
  investor: string;
  faceValue: bigint;
  discountedValue: bigint;
  settlementDate: bigint;
  metadata: string;
  status: number;
  createdAt: bigint;
}

export class BlockchainService {
  private _provider: ethers.JsonRpcProvider | undefined;
  private _contract: ethers.Contract | undefined;
  private signer?: ethers.Wallet;

  private get provider(): ethers.JsonRpcProvider {
    if (!this._provider) {
      this._provider = new ethers.JsonRpcProvider(
        process.env.TEMPO_RPC_URL || 'https://rpc.moderato.tempo.xyz'
      );
    }
    return this._provider;
  }

  private get contract(): ethers.Contract {
    if (!this._contract) {
      if (!process.env.CONTRACT_ADDRESS) {
        throw new Error('CONTRACT_ADDRESS not configured');
      }
      this._contract = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        InvoiceMarketABI,
        this.provider
      );
      if (process.env.PLATFORM_PRIVATE_KEY) {
        this.signer = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY, this.provider);
        this._contract = this._contract.connect(this.signer) as ethers.Contract;
      }
    }
    return this._contract;
  }

  constructor() {}

  /**
   * Create invoice on blockchain
   */
  async createInvoice(
    sellerAddress: string,
    buyerAddress: string,
    faceValue: number,
    daysUntilSettlement: number,
    metadata: object
  ): Promise<{ txHash: string; invoiceId: number }> {
    try {
      // Convert to 6 decimals (AlphaUSD / TIP20 stablecoins use 6 decimals)
      const faceValueWei = ethers.parseUnits(faceValue.toString(), 6);
      
      // Create signer for seller
      const sellerSigner = new ethers.Wallet(
        process.env.PLATFORM_PRIVATE_KEY!, // In production, user signs this
        this.provider
      );
      const contractWithSigner = this.contract.connect(sellerSigner) as ethers.Contract;

      const tx = await contractWithSigner.createInvoice(
        buyerAddress,
        faceValueWei,
        daysUntilSettlement,
        JSON.stringify(metadata)
      );

      const receipt = await tx.wait();
      
      // Extract invoice ID from event
      const event = receipt.logs.find((log: any) => {
        try {
          return this.contract.interface.parseLog(log)?.name === 'InvoiceCreated';
        } catch {
          return false;
        }
      });

      let invoiceId = 0;
      if (event) {
        const parsed = this.contract.interface.parseLog(event);
        invoiceId = Number(parsed?.args[0] || 0);
      }

      return {
        txHash: receipt.hash,
        invoiceId,
      };
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      throw new Error('Failed to create invoice on blockchain');
    }
  }

  /**
   * Buy an invoice (investor pays discounted value via ERC20 approve + transfer)
   * Note: In production, the frontend handles this directly via the user's wallet.
   * This backend method is a fallback for server-side purchases.
   */
  async buyInvoice(
    invoiceId: number,
    investorAddress: string
  ): Promise<{ txHash: string }> {
    try {
      const invoice = await this.contract.getInvoice(invoiceId);
      if (!invoice || Number(invoice.id) === 0) {
        throw new Error('Invoice not found');
      }

      const investorKey = process.env.INVESTOR_PRIVATE_KEY || process.env.PLATFORM_PRIVATE_KEY!;
      const investorSigner = new ethers.Wallet(investorKey, this.provider);

      // First approve the contract to spend investor's stablecoins
      const paymentTokenAddress = process.env.PAYMENT_TOKEN || '0x20C0000000000000000000000000000000000001';
      const erc20 = new ethers.Contract(
        paymentTokenAddress,
        ['function approve(address spender, uint256 amount) returns (bool)'],
        investorSigner
      );
      const approveTx = await erc20.approve(
        await this.contract.getAddress(),
        invoice.discountedValue
      );
      await approveTx.wait();

      // Now call buyInvoice (no msg.value needed, uses transferFrom)
      const contractWithSigner = new ethers.Contract(
        await this.contract.getAddress(),
        this.contract.interface,
        investorSigner
      );
      const tx = await contractWithSigner.buyInvoice(invoiceId);
      console.log(`Buy invoice ${invoiceId} for investor ${investorAddress}, tx: ${tx.hash}`);

      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    } catch (error: any) {
      console.error('Error buying invoice:', error);
      throw new Error(error.reason || 'Failed to buy invoice on blockchain');
    }
  }

  /**
   * Settle invoice — platform wallet pays faceValue in AlphaUSD to the investor
   */
  async settleInvoice(invoiceId: number): Promise<{ txHash: string }> {
    try {
      const invoice = await this.contract.getInvoice(invoiceId);
      if (!invoice || Number(invoice.id) === 0) {
        throw new Error('Invoice not found');
      }
      if (Number(invoice.status) !== 1) { // 1 = SOLD
        throw new Error(`Invoice cannot be settled (status: ${invoice.status})`);
      }

      if (!process.env.PLATFORM_PRIVATE_KEY) {
        throw new Error('PLATFORM_PRIVATE_KEY not configured');
      }
      const platformSigner = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY, this.provider);

      // Approve contract to spend faceValue in AlphaUSD
      const paymentTokenAddress = process.env.PAYMENT_TOKEN || '0x20C0000000000000000000000000000000000001';
      const erc20 = new ethers.Contract(
        paymentTokenAddress,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)',
          'function balanceOf(address account) view returns (uint256)',
        ],
        platformSigner
      );

      const faceValue: bigint = invoice.faceValue;
      const contractAddress = await this.contract.getAddress();

      // Check balance
      const balance: bigint = await erc20.balanceOf(platformSigner.address);
      if (balance < faceValue) {
        throw new Error(
          `Insufficient AlphaUSD. Need ${ethers.formatUnits(faceValue, 6)}, have ${ethers.formatUnits(balance, 6)}`
        );
      }

      // Approve if needed
      const allowance: bigint = await erc20.allowance(platformSigner.address, contractAddress);
      if (allowance < faceValue) {
        const approveTx = await erc20.approve(contractAddress, faceValue);
        await approveTx.wait();
      }

      // Call settleInvoice
      const contractWithSigner = new ethers.Contract(
        contractAddress,
        this.contract.interface,
        platformSigner
      );
      const tx = await contractWithSigner.settleInvoice(invoiceId);
      console.log(`Settling invoice ${invoiceId}, tx: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`Invoice ${invoiceId} settled successfully`);

      return { txHash: receipt.hash };
    } catch (error: any) {
      console.error('Error settling invoice:', error);
      throw new Error(error.reason || error.message || 'Failed to settle invoice');
    }
  }

  /**
   * Get platform wallet address derived from PLATFORM_PRIVATE_KEY
   */
  getPlatformWalletAddress(): string {
    if (!process.env.PLATFORM_PRIVATE_KEY) {
      throw new Error('PLATFORM_PRIVATE_KEY not configured');
    }
    return new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY).address;
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: number): Promise<BlockchainInvoice | null> {
    try {
      const invoice = await this.contract.getInvoice(invoiceId);
      
      return {
        id: Number(invoice.id),
        seller: invoice.seller,
        buyer: invoice.buyer,
        investor: invoice.investor,
        faceValue: invoice.faceValue,
        discountedValue: invoice.discountedValue,
        settlementDate: invoice.settlementDate,
        metadata: invoice.metadata,
        status: Number(invoice.status),
        createdAt: invoice.createdAt,
      };
    } catch (error) {
      console.error('Error getting invoice:', error);
      return null;
    }
  }

  /**
   * Get all listed invoices
   */
  async getListedInvoices(): Promise<BlockchainInvoice[]> {
    try {
      const invoices = await this.contract.getListedInvoices();
      
      return invoices.map((inv: any) => ({
        id: Number(inv.id),
        seller: inv.seller,
        buyer: inv.buyer,
        investor: inv.investor,
        faceValue: inv.faceValue,
        discountedValue: inv.discountedValue,
        settlementDate: inv.settlementDate,
        metadata: inv.metadata,
        status: Number(inv.status),
        createdAt: inv.createdAt,
      }));
    } catch (error) {
      console.error('Error getting listed invoices:', error);
      return [];
    }
  }

  /**
   * Get invoices for a specific seller
   */
  async getMyInvoices(userAddress: string): Promise<BlockchainInvoice[]> {
    try {
      const invoices = await this.contract.getMyInvoices(userAddress);
      
      return invoices.map((inv: any) => ({
        id: Number(inv.id),
        seller: inv.seller,
        buyer: inv.buyer,
        investor: inv.investor,
        faceValue: inv.faceValue,
        discountedValue: inv.discountedValue,
        settlementDate: inv.settlementDate,
        metadata: inv.metadata,
        status: Number(inv.status),
        createdAt: inv.createdAt,
      }));
    } catch (error) {
      console.error('Error getting user invoices:', error);
      return [];
    }
  }

  /**
   * Calculate APY for an invoice
   */
  async calculateAPY(invoiceId: number): Promise<number> {
    try {
      const apy = await this.contract.calculateAPY(invoiceId);
      // Convert from basis points to percentage
      return Number(apy) / 100;
    } catch (error) {
      console.error('Error calculating APY:', error);
      return 0;
    }
  }

  /**
   * Format token amount to readable number (6 decimals for TIP20 stablecoins)
   */
  formatFromWei(value: bigint): string {
    return ethers.formatUnits(value, 6);
  }

  /**
   * Get AlphaUSD balance for an address
   */
  async getBalance(address: string): Promise<string> {
    const paymentTokenAddress = process.env.PAYMENT_TOKEN || '0x20C0000000000000000000000000000000000001';
    const erc20 = new ethers.Contract(
      paymentTokenAddress,
      ['function balanceOf(address account) view returns (uint256)'],
      this.provider
    );
    const balance: bigint = await erc20.balanceOf(address);
    return ethers.formatUnits(balance, 6);
  }

  /**
   * Get the contract address
   */
  getContractAddress(): string {
    return process.env.CONTRACT_ADDRESS || '';
  }

  /**
   * Listen for invoice events
   */
  onInvoiceCreated(callback: (invoiceId: number, seller: string, buyer: string) => void) {
    this.contract.on('InvoiceCreated', (invoiceId, seller, buyer) => {
      callback(Number(invoiceId), seller, buyer);
    });
  }

  onInvoicePurchased(callback: (invoiceId: number, investor: string) => void) {
    this.contract.on('InvoicePurchased', (invoiceId, investor) => {
      callback(Number(invoiceId), investor);
    });
  }

  onInvoiceSettled(callback: (invoiceId: number) => void) {
    this.contract.on('InvoiceSettled', (invoiceId) => {
      callback(Number(invoiceId));
    });
  }
}
