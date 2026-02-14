"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { getBlockchainInvoice } from "@/lib/api"
import { useContractBuy } from "@/lib/useContractBuy"
import { formatCurrency, formatDate, formatAddress, statusLabel, statusColor } from "@/lib/utils"
import { ApyBadge } from "@/components/apy-badge"
import { useWalletAddress } from "@/components/wallet-connect"
import type { BlockchainInvoice } from "@/lib/types"
import { InvoiceStatus } from "@/lib/types"

export default function InvoiceDetailPage() {
  const params = useParams()
  const walletAddress = useWalletAddress()
  const { buyInvoiceOnChain } = useContractBuy()
  const [invoice, setInvoice] = useState<BlockchainInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [buying, setBuying] = useState(false)
  const [buySuccess, setBuySuccess] = useState("")
  const [buyError, setBuyError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const id = Number(params.id)
        const inv = await getBlockchainInvoice(id)
        setInvoice(inv)
      } catch {
        setError("Failed to load invoice")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  async function handleBuy() {
    if (!invoice || !walletAddress) return
    setBuying(true)
    setBuyError("")
    setBuySuccess("")
    try {
      // Sign and send the transaction directly from the user's wallet
      const result = await buyInvoiceOnChain(invoice.id)
      setBuySuccess(`Purchased! Tx: ${result.txHash.slice(0, 10)}...`)
      // Reload invoice to reflect new status
      const updated = await getBlockchainInvoice(invoice.id)
      setInvoice(updated)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to buy invoice"
      setBuyError(msg.includes("user rejected") ? "Transaction rejected by user" : msg)
    } finally {
      setBuying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-8 w-48 bg-slate-700 rounded mx-auto mb-4" />
          <div className="h-4 w-32 bg-slate-700/50 rounded mx-auto" />
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <h2 className="text-xl font-bold text-white mb-2">Invoice Not Found</h2>
          <p className="text-slate-400 mb-6">{error || "This invoice doesn't exist or has been removed."}</p>
          <Link
            href="/marketplace"
            className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    )
  }

  const faceValue = parseFloat(invoice.faceValue)
  const discountedValue = parseFloat(invoice.discountedValue)
  const profit = faceValue - discountedValue
  const apy = invoice.apy || "12.0"
  const status = invoice.status

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/marketplace" className="hover:text-white transition-colors">
            Marketplace
          </Link>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-slate-300">Invoice #{invoice.id}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Invoice Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Card */}
            <div className="glass-card p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-white">
                      {invoice.metadata?.customerName || "Unknown Customer"}
                    </h1>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor(status)}`}>
                      {statusLabel(status)}
                    </span>
                  </div>
                  <p className="text-slate-400">
                    {invoice.metadata?.invoiceNumber || `Invoice #${invoice.id}`}
                    {invoice.metadata?.description && ` — ${invoice.metadata.description}`}
                  </p>
                </div>
                <ApyBadge apy={apy} size="lg" />
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Face Value</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(faceValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Buy Price</p>
                  <p className="text-2xl font-bold text-blue-400">{formatCurrency(discountedValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Settlement Date</p>
                  <p className="text-lg font-semibold text-white">{formatDate(invoice.settlementDate)}</p>
                  <p className="text-sm text-slate-500">{invoice.daysUntilDue} days remaining</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Expected Profit</p>
                  <p className="text-2xl font-bold text-emerald-400">+{formatCurrency(profit)}</p>
                </div>
              </div>
            </div>

            {/* Details Card */}
            <div className="glass-card p-8">
              <h2 className="text-lg font-semibold text-white mb-4">Invoice Details</h2>
              <div className="space-y-3">
                {[
                  { label: "Seller", value: formatAddress(invoice.seller), mono: true },
                  { label: "Buyer (Client)", value: invoice.buyer === "0x0000000000000000000000000000000000000000" ? "TBD" : formatAddress(invoice.buyer), mono: true },
                  { label: "Investor", value: invoice.investor === "0x0000000000000000000000000000000000000000" ? "None yet" : formatAddress(invoice.investor), mono: true },
                  { label: "Customer Email", value: invoice.metadata?.customerEmail || "N/A" },
                  { label: "Currency", value: (invoice.metadata?.currency || "usd").toUpperCase() },
                  { label: "Original Due Date", value: invoice.metadata?.originalDueDate ? formatDate(invoice.metadata.originalDueDate) : "N/A" },
                  { label: "Stripe Invoice ID", value: invoice.metadata?.stripeInvoiceId || "N/A", mono: true },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-2.5 border-b border-slate-700/30 last:border-0"
                  >
                    <span className="text-sm text-slate-400">{row.label}</span>
                    <span className={`text-sm text-slate-200 ${row.mono ? "font-mono" : ""}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Timeline */}
            <div className="glass-card p-8">
              <h2 className="text-lg font-semibold text-white mb-6">Status Timeline</h2>
              <div className="flex items-center gap-0">
                {[
                  { label: "Listed", step: 0 },
                  { label: "Sold", step: 1 },
                  { label: "Settled", step: 2 },
                ].map((s, i) => (
                  <div key={s.label} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          status >= s.step
                            ? "bg-emerald-500 text-white"
                            : status === InvoiceStatus.CANCELLED
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-slate-800 text-slate-500 border border-slate-700"
                        }`}
                      >
                        {status >= s.step ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span className={`mt-2 text-xs font-medium ${status >= s.step ? "text-emerald-400" : "text-slate-500"}`}>
                        {s.label}
                      </span>
                    </div>
                    {i < 2 && (
                      <div
                        className={`h-0.5 flex-1 -mt-5 ${
                          status > s.step ? "bg-emerald-500" : "bg-slate-700"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Action Panel */}
          <div className="space-y-6">
            {/* Investment Calculator */}
            <div className="glass-card p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-white mb-5">
                Investment Summary
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-400">You Pay</span>
                  <span className="text-xl font-bold text-white">
                    {formatCurrency(discountedValue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">You Receive</span>
                  <span className="text-xl font-bold text-emerald-400">
                    {formatCurrency(faceValue)}
                  </span>
                </div>
                <div className="h-px bg-slate-700/50" />
                <div className="flex justify-between">
                  <span className="text-slate-400">Net Profit</span>
                  <span className="text-lg font-bold text-emerald-400">
                    +{formatCurrency(profit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">APY</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {apy}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Duration</span>
                  <span className="text-sm font-medium text-white">
                    {invoice.daysUntilDue} days
                  </span>
                </div>
              </div>

              {/* Profit visualization */}
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Return on Investment</p>
                    <p className="text-lg font-bold text-emerald-400">
                      {((profit / discountedValue) * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>

              {buySuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                  {buySuccess}
                </div>
              )}

              {buyError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {buyError}
                </div>
              )}

              {status === InvoiceStatus.LISTED ? (
                <button
                  onClick={handleBuy}
                  disabled={!walletAddress || buying}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-base hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {buying ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Purchasing...
                    </span>
                  ) : walletAddress ? "Buy This Invoice" : "Connect Wallet to Buy"}
                </button>
              ) : status === InvoiceStatus.SOLD ? (
                <div className="py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium text-center">
                  Awaiting Settlement
                </div>
              ) : status === InvoiceStatus.SETTLED ? (
                <div className="py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium text-center">
                  Settled Successfully
                </div>
              ) : (
                <div className="py-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
                  Cancelled
                </div>
              )}

              {!walletAddress && status === InvoiceStatus.LISTED && (
                <p className="mt-3 text-xs text-slate-500 text-center">
                  Connect your wallet using the button in the top right corner
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
