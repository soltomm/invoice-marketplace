"use client"

import { useState } from "react"
import type { StripeInvoice } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { createBlockchainInvoice, calculateDiscount } from "@/lib/api"

interface CreateListingDialogProps {
  invoice: StripeInvoice | null
  walletAddress: string
  onClose: () => void
  onSuccess: () => void
}

export function CreateListingDialog({
  invoice,
  walletAddress,
  onClose,
  onSuccess,
}: CreateListingDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [discount, setDiscount] = useState<{
    discountedValue: number
    discount: number
    apy: string
  } | null>(null)

  async function loadDiscount() {
    if (!invoice) return
    try {
      const result = await calculateDiscount(invoice.amount, invoice.daysUntilDue)
      setDiscount({
        discountedValue: result.discountedValue,
        discount: result.discount,
        apy: result.apy,
      })
    } catch {
      // Use a fallback calculation
      const disc = (invoice.amount * invoice.daysUntilDue * 1200) / (365 * 10000)
      setDiscount({
        discountedValue: invoice.amount - disc,
        discount: disc,
        apy: "12.00",
      })
    }
  }

  // Load discount when invoice changes
  if (invoice && !discount) {
    loadDiscount()
  }

  async function handleCreate() {
    if (!invoice || !walletAddress) return
    setLoading(true)
    setError("")

    try {
      await createBlockchainInvoice(invoice.stripeId, walletAddress)
      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create listing")
    } finally {
      setLoading(false)
    }
  }

  if (!invoice) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md glass-card p-6 shadow-2xl animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">List Invoice</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Invoice info */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Customer</span>
              <span className="text-sm font-medium text-white">{invoice.customerName}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Face Value</span>
              <span className="text-lg font-bold text-white">
                {formatCurrency(invoice.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Days to Due</span>
              <span className="text-sm font-medium text-white">
                {invoice.daysUntilDue} days
              </span>
            </div>
          </div>

          {/* Pricing */}
          {discount && (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
                You Will Receive
              </p>
              <p className="text-3xl font-bold text-emerald-400">
                {formatCurrency(discount.discountedValue)}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                <span>Discount: {formatCurrency(discount.discount)}</span>
                <span>APY: {discount.apy}%</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading || !walletAddress}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating on Blockchain...
              </span>
            ) : !walletAddress ? (
              "Connect Wallet First"
            ) : (
              "List on Marketplace"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
