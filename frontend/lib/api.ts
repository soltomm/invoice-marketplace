import type {
  StripeInvoice,
  BlockchainInvoice,
  PlatformStats,
  DiscountCalculation,
} from "./types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }))
    throw new Error(error.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Stripe ──────────────────────────────────────────────

export async function getStripeStatus(): Promise<{ connected: boolean }> {
  return fetchApi("/api/stripe/status")
}

export async function getStripeInvoices(): Promise<StripeInvoice[]> {
  const data = await fetchApi<{ success: boolean; invoices: StripeInvoice[] }>(
    "/api/stripe/invoices"
  )
  return data.invoices
}

export async function getStripeInvoice(id: string): Promise<StripeInvoice> {
  const data = await fetchApi<{ success: boolean; invoice: StripeInvoice }>(
    `/api/stripe/invoices/${id}`
  )
  return data.invoice
}

export async function createBlockchainInvoice(
  stripeInvoiceId: string,
  sellerAddress: string,
  connectedAccountId?: string
): Promise<{ txHash: string; blockchainInvoiceId: number }> {
  return fetchApi("/api/stripe/create-invoice", {
    method: "POST",
    body: JSON.stringify({ stripeInvoiceId, sellerAddress, connectedAccountId }),
  })
}

export async function generateDemoInvoices(): Promise<{ message: string }> {
  return fetchApi("/api/stripe/demo/generate", { method: "POST" })
}

// ── Stripe Connect ──────────────────────────────────────

export async function connectStripeAccount(
  walletAddress: string,
  email: string
): Promise<{ url?: string; alreadyConnected?: boolean; accountId: string }> {
  return fetchApi("/api/stripe/connect/onboard", {
    method: "POST",
    body: JSON.stringify({ walletAddress, email }),
  })
}

export async function getStripeConnectStatus(
  walletAddress: string
): Promise<{
  connected: boolean
  detailsSubmitted?: boolean
  accountId?: string
  email?: string
}> {
  return fetchApi(`/api/stripe/connect/status/${walletAddress}`)
}

export async function getConnectedStripeInvoices(
  walletAddress: string
): Promise<StripeInvoice[]> {
  const data = await fetchApi<{ success: boolean; invoices: StripeInvoice[] }>(
    `/api/stripe/connect/invoices/${walletAddress}`
  )
  return data.invoices
}

export async function generateConnectedDemoInvoices(
  walletAddress: string
): Promise<{ message: string }> {
  return fetchApi(`/api/stripe/connect/demo/generate/${walletAddress}`, {
    method: "POST",
  })
}

// ── Blockchain ──────────────────────────────────────────

export async function getListedInvoices(): Promise<BlockchainInvoice[]> {
  const data = await fetchApi<{ success: boolean; invoices: BlockchainInvoice[] }>(
    "/api/blockchain/invoices/listed"
  )
  return data.invoices
}

export async function getBlockchainInvoice(id: number): Promise<BlockchainInvoice> {
  const data = await fetchApi<{ success: boolean; invoice: BlockchainInvoice }>(
    `/api/blockchain/invoices/${id}`
  )
  return data.invoice
}

export async function getUserInvoices(address: string): Promise<BlockchainInvoice[]> {
  const data = await fetchApi<{ success: boolean; invoices: BlockchainInvoice[] }>(
    `/api/blockchain/invoices/user/${address}`
  )
  return data.invoices
}

export async function calculateDiscount(
  faceValue: number,
  daysUntilSettlement: number
): Promise<DiscountCalculation> {
  return fetchApi("/api/blockchain/calculate-discount", {
    method: "POST",
    body: JSON.stringify({ faceValue, daysUntilSettlement }),
  })
}

export async function buyInvoice(
  invoiceId: number,
  investorAddress: string
): Promise<{ txHash: string }> {
  return fetchApi("/api/blockchain/buy", {
    method: "POST",
    body: JSON.stringify({ invoiceId, investorAddress }),
  })
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const data = await fetchApi<{ success: boolean; stats: PlatformStats }>(
    "/api/blockchain/stats"
  )
  return data.stats
}
