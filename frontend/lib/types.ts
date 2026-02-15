export interface StripeInvoice {
  stripeId: string
  invoiceNumber: string
  customerName: string
  customerEmail: string | null
  amount: number
  currency: string
  dueDate: string
  daysUntilDue: number
  isPastDue: boolean
  description: string
  status: string
  isOnBlockchain: boolean
  blockchainId?: number
  connectedAccountId?: string
  lines: Array<{ description: string; amount: number; quantity: number }>
}

export interface BlockchainInvoice {
  id: number
  seller: string
  buyer: string
  investor: string
  faceValue: string
  discountedValue: string
  settlementDate: string
  status: InvoiceStatus
  metadata: InvoiceMetadata
  daysUntilDue: number
  apy?: string
}

export interface InvoiceMetadata {
  stripeInvoiceId: string
  invoiceNumber: string
  customerName: string
  customerEmail: string
  description: string
  originalDueDate: string
  currency: string
}

export enum InvoiceStatus {
  LISTED = 0,
  SOLD = 1,
  SETTLED = 2,
  CANCELLED = 3,
}

export interface PlatformStats {
  totalInvoices: number
  totalValue: number
  averageAPY: number
}

export interface DiscountCalculation {
  faceValue: number
  discountedValue: number
  discount: number
  apy: string
  daysUntilSettlement: number
}
