"use client"

import Link from "next/link"
import type { BlockchainInvoice } from "@/lib/types"
import { formatCurrency, formatDate, formatAddress } from "@/lib/utils"
import { ApyBadge } from "./apy-badge"

interface InvoiceCardProps {
  invoice: BlockchainInvoice
}

export function InvoiceCard({ invoice }: InvoiceCardProps) {
  const faceValue = parseFloat(invoice.faceValue)
  const discountedValue = parseFloat(invoice.discountedValue)
  const profit = faceValue - discountedValue
  const apy = invoice.apy || "12.0"

  return (
    <Link href={`/invoice/${invoice.id}`} className="block">
      <div className="glass-card-hover p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-lg truncate">
              {invoice.metadata?.customerName || "Unknown Customer"}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {invoice.metadata?.invoiceNumber || `Invoice #${invoice.id}`}
            </p>
          </div>
          <ApyBadge apy={apy} />
        </div>

        {/* Description */}
        <p className="text-sm text-slate-500 mb-5 line-clamp-1">
          {invoice.metadata?.description || "Invoice factoring opportunity"}
        </p>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Face Value</p>
            <p className="text-xl font-bold text-white mt-0.5">
              {formatCurrency(faceValue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Buy Price</p>
            <p className="text-xl font-bold text-blue-400 mt-0.5">
              {formatCurrency(discountedValue)}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1" />
        <div className="pt-4 border-t border-slate-700/50 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-500">Due </span>
              <span className="text-slate-300">{formatDate(invoice.settlementDate)}</span>
            </div>
            <div>
              <span className="text-slate-500">Profit </span>
              <span className="text-emerald-400 font-medium">
                +{formatCurrency(profit)}
              </span>
            </div>
          </div>
          <span className="text-slate-600 font-mono text-xs">
            {formatAddress(invoice.seller)}
          </span>
        </div>
      </div>
    </Link>
  )
}
