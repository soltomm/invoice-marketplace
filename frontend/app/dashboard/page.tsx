"use client"

import { useState, useEffect, useCallback } from "react"
import { useWalletAddress } from "@/components/wallet-connect"
import { StripeInvoiceCard } from "@/components/stripe-invoice-card"
import { CreateListingDialog } from "@/components/create-listing-dialog"
import { getStripeInvoices, getStripeStatus, generateDemoInvoices } from "@/lib/api"
import type { StripeInvoice } from "@/lib/types"

export default function DashboardPage() {
  const walletAddress = useWalletAddress()
  const [invoices, setInvoices] = useState<StripeInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [stripeConnected, setStripeConnected] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<StripeInvoice | null>(null)
  const [generating, setGenerating] = useState(false)

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      const [statusRes, invs] = await Promise.all([
        getStripeStatus(),
        getStripeInvoices(),
      ])
      setStripeConnected(statusRes.connected)
      setInvoices(invs)
    } catch {
      setStripeConnected(false)
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  async function handleGenerateDemo() {
    setGenerating(true)
    try {
      await generateDemoInvoices()
      await fetchInvoices()
    } catch {
      // Ignore
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white">Seller Dashboard</h1>
            <p className="mt-1 text-slate-400">
              Import invoices from Stripe and list them on the marketplace for instant cash.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center gap-3">
            {/* Stripe status */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/50">
              <div className={`h-2 w-2 rounded-full ${stripeConnected ? "bg-emerald-400" : "bg-red-400"}`} />
              <span className="text-sm text-slate-300">
                {stripeConnected ? "Stripe Connected" : "Stripe Disconnected"}
              </span>
            </div>
          </div>
        </div>

        {/* Wallet warning */}
        {!walletAddress && (
          <div className="mb-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-400">Wallet not connected</p>
              <p className="text-sm text-slate-400 mt-0.5">
                Connect your wallet using the button in the top right to list invoices on the marketplace.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Syncing..." : "Sync Invoices"}
          </button>
          <button
            onClick={handleGenerateDemo}
            disabled={generating}
            className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate Demo Invoices"}
          </button>
        </div>

        {/* Invoice Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-6 animate-pulse">
                <div className="h-5 w-32 bg-slate-700 rounded mb-2" />
                <div className="h-4 w-20 bg-slate-700/50 rounded mb-4" />
                <div className="h-4 w-full bg-slate-700/30 rounded mb-4" />
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="h-10 bg-slate-700/30 rounded" />
                  <div className="h-10 bg-slate-700/30 rounded" />
                </div>
                <div className="h-10 bg-slate-700/20 rounded-xl" />
              </div>
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <svg className="w-12 h-12 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <h3 className="text-lg font-semibold text-white mb-2">No invoices found</h3>
            <p className="text-slate-400 mb-6">
              {stripeConnected
                ? "No unpaid invoices in your Stripe account. Generate demo invoices to try it out."
                : "Connect your Stripe account or make sure the backend is running on port 4000."}
            </p>
            <button
              onClick={handleGenerateDemo}
              disabled={generating}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-medium hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Demo Invoices"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {invoices.map((inv) => (
              <StripeInvoiceCard
                key={inv.stripeId}
                invoice={inv}
                onList={setSelectedInvoice}
              />
            ))}
          </div>
        )}
      </div>

      {/* Listing Dialog */}
      <CreateListingDialog
        invoice={selectedInvoice}
        walletAddress={walletAddress}
        onClose={() => setSelectedInvoice(null)}
        onSuccess={() => {
          setSelectedInvoice(null)
          fetchInvoices()
        }}
      />
    </div>
  )
}
