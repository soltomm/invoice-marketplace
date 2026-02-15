"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useWalletAddress } from "@/components/wallet-connect"
import { StripeInvoiceCard } from "@/components/stripe-invoice-card"
import { CreateListingDialog } from "@/components/create-listing-dialog"
import {
  getStripeInvoices,
  getStripeStatus,
  generateDemoInvoices,
  connectStripeAccount,
  getStripeConnectStatus,
  getConnectedStripeInvoices,
  generateConnectedDemoInvoices,
} from "@/lib/api"
import type { StripeInvoice } from "@/lib/types"

type ConnectStatus = "loading" | "not_connected" | "onboarding" | "connected"

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-8 w-48 bg-slate-700 rounded mb-4 animate-pulse" />
        <div className="h-4 w-72 bg-slate-700/50 rounded mb-10 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-5 w-32 bg-slate-700 rounded mb-2" />
              <div className="h-4 w-20 bg-slate-700/50 rounded mb-4" />
              <div className="h-10 bg-slate-700/20 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DashboardContent() {
  const walletAddress = useWalletAddress()
  const searchParams = useSearchParams()
  const [invoices, setInvoices] = useState<StripeInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [stripeConnected, setStripeConnected] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<StripeInvoice | null>(null)
  const [generating, setGenerating] = useState(false)

  // Stripe Connect state
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>("loading")
  const [connectEmail, setConnectEmail] = useState("")
  const [connectLoading, setConnectLoading] = useState(false)
  const [connectError, setConnectError] = useState("")

  // Check Stripe Connect status when wallet is connected
  useEffect(() => {
    if (!walletAddress) {
      setConnectStatus("not_connected")
      return
    }

    async function checkConnectStatus() {
      try {
        const status = await getStripeConnectStatus(walletAddress)
        if (status.connected) {
          setConnectStatus("connected")
        } else if (status.detailsSubmitted) {
          setConnectStatus("onboarding")
        } else if (status.accountId) {
          setConnectStatus("onboarding")
        } else {
          setConnectStatus("not_connected")
        }
      } catch {
        setConnectStatus("not_connected")
      }
    }

    checkConnectStatus()
  }, [walletAddress, searchParams])

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)

      // If seller has a connected account, fetch from their account
      if (connectStatus === "connected" && walletAddress) {
        const [statusRes, invs] = await Promise.all([
          getStripeStatus(),
          getConnectedStripeInvoices(walletAddress),
        ])
        setStripeConnected(statusRes.connected)
        setInvoices(invs)
      } else {
        // Fallback to platform invoices (demo mode)
        const [statusRes, invs] = await Promise.all([
          getStripeStatus(),
          getStripeInvoices(),
        ])
        setStripeConnected(statusRes.connected)
        setInvoices(invs)
      }
    } catch {
      setStripeConnected(false)
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [connectStatus, walletAddress])

  useEffect(() => {
    if (connectStatus !== "loading") {
      fetchInvoices()
    }
  }, [fetchInvoices, connectStatus])

  async function handleGenerateDemo() {
    setGenerating(true)
    try {
      if (connectStatus === "connected" && walletAddress) {
        await generateConnectedDemoInvoices(walletAddress)
      } else {
        await generateDemoInvoices()
      }
      await fetchInvoices()
    } catch {
      // Ignore
    } finally {
      setGenerating(false)
    }
  }

  async function handleConnectStripe() {
    if (!walletAddress || !connectEmail) return
    setConnectLoading(true)
    setConnectError("")

    try {
      const result = await connectStripeAccount(walletAddress, connectEmail)
      if (result.alreadyConnected) {
        setConnectStatus("connected")
      } else if (result.url) {
        // Redirect to Stripe onboarding
        window.location.href = result.url
      }
    } catch (err: unknown) {
      setConnectError(err instanceof Error ? err.message : "Failed to start onboarding")
    } finally {
      setConnectLoading(false)
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
              Connect your Stripe account and list invoices on the marketplace for instant cash.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center gap-3">
            {/* Stripe Connect status */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/50">
              <div
                className={`h-2 w-2 rounded-full ${
                  connectStatus === "connected"
                    ? "bg-emerald-400"
                    : connectStatus === "onboarding"
                    ? "bg-amber-400"
                    : stripeConnected
                    ? "bg-blue-400"
                    : "bg-red-400"
                }`}
              />
              <span className="text-sm text-slate-300">
                {connectStatus === "connected"
                  ? "Stripe Connected"
                  : connectStatus === "onboarding"
                  ? "Onboarding..."
                  : stripeConnected
                  ? "Demo Mode"
                  : "Stripe Disconnected"}
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

        {/* Stripe Connect onboarding card */}
        {walletAddress && connectStatus !== "connected" && connectStatus !== "loading" && (
          <div className="mb-8 glass-card p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">
                  Connect Your Stripe Account
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  Link your Stripe account to import your invoices and list them on the marketplace.
                  When your customers pay, the funds are automatically settled on-chain.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="email"
                    placeholder="Your email address"
                    value={connectEmail}
                    onChange={(e) => setConnectEmail(e.target.value)}
                    className="flex-1 max-w-xs px-4 py-2.5 rounded-xl bg-slate-900/50 border border-slate-700/50 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
                  />
                  <button
                    onClick={handleConnectStripe}
                    disabled={connectLoading || !connectEmail}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-medium hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {connectLoading ? "Redirecting..." : connectStatus === "onboarding" ? "Continue Onboarding" : "Connect Stripe"}
                  </button>
                </div>
                {connectError && (
                  <p className="mt-2 text-sm text-red-400">{connectError}</p>
                )}
              </div>
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
              {connectStatus === "connected"
                ? "No unpaid invoices in your connected Stripe account. Generate demo invoices to try it out."
                : stripeConnected
                ? "No unpaid invoices. Generate demo invoices to try it out, or connect your Stripe account above."
                : "Connect your Stripe account or make sure the backend is running."}
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
