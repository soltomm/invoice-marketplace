"use client"

import { useEffect, useState } from "react"
import { getPlatformStats } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import type { PlatformStats } from "@/lib/types"

export function StatsBar() {
  const [stats, setStats] = useState<PlatformStats | null>(null)

  useEffect(() => {
    getPlatformStats()
      .then(setStats)
      .catch(() => setStats({ totalInvoices: 0, totalValue: 0, averageAPY: 12 }))
  }, [])

  const items = [
    {
      label: "Total Value Locked",
      value: stats ? formatCurrency(stats.totalValue) : "$0",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      label: "Active Invoices",
      value: stats ? String(stats.totalInvoices) : "0",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      ),
    },
    {
      label: "Average APY",
      value: stats ? `${stats.averageAPY}%` : "12%",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
        </svg>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="glass-card px-6 py-5 flex items-center gap-4"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400">
            {item.icon}
          </div>
          <div>
            <p className="text-sm text-slate-400">{item.label}</p>
            <p className="text-2xl font-bold text-white">{item.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
