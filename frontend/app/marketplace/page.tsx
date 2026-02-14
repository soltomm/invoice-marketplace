"use client"

import { useState, useEffect, useCallback } from "react"
import { getListedInvoices } from "@/lib/api"
import { InvoiceCard } from "@/components/invoice-card"
import { StatsBar } from "@/components/stats-bar"
import type { BlockchainInvoice } from "@/lib/types"

type SortOption = "apy" | "value" | "due"

export default function MarketplacePage() {
  const [invoices, setInvoices] = useState<BlockchainInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortOption>("apy")

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      const invs = await getListedInvoices()
      setInvoices(invs)
    } catch {
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const sorted = [...invoices].sort((a, b) => {
    switch (sort) {
      case "apy":
        return parseFloat(b.apy || "0") - parseFloat(a.apy || "0")
      case "value":
        return parseFloat(b.faceValue) - parseFloat(a.faceValue)
      case "due":
        return a.daysUntilDue - b.daysUntilDue
      default:
        return 0
    }
  })

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">Marketplace</h1>
          <p className="mt-1 text-slate-400">
            Browse available invoices and invest for 10-15% APY returns.
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <StatsBar />
        </div>

        {/* Sort Controls */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-slate-400">
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} available
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Sort by:</span>
            {(
              [
                { key: "apy", label: "Highest APY" },
                { key: "value", label: "Highest Value" },
                { key: "due", label: "Soonest Due" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSort(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  sort === opt.key
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Invoice Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass-card p-6 animate-pulse">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="h-5 w-36 bg-slate-700 rounded" />
                    <div className="h-4 w-20 bg-slate-700/50 rounded mt-2" />
                  </div>
                  <div className="h-6 w-20 bg-slate-700/50 rounded-full" />
                </div>
                <div className="h-4 w-full bg-slate-700/30 rounded mb-5" />
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="h-12 bg-slate-700/30 rounded" />
                  <div className="h-12 bg-slate-700/30 rounded" />
                </div>
                <div className="h-8 bg-slate-700/20 rounded" />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <svg className="w-12 h-12 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
            <h3 className="text-lg font-semibold text-white mb-2">No invoices listed yet</h3>
            <p className="text-slate-400 mb-6">
              Be the first to invest! Invoices will appear here once sellers list them from their dashboard.
            </p>
            <a
              href="/dashboard"
              className="inline-flex px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-medium hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/25"
            >
              Go to Seller Dashboard
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((inv) => (
              <InvoiceCard key={inv.id} invoice={inv} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
