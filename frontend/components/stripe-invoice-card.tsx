"use client"

import type { StripeInvoice } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/utils"

interface StripeInvoiceCardProps {
  invoice: StripeInvoice
  onList: (invoice: StripeInvoice) => void
}

export function StripeInvoiceCard({ invoice, onList }: StripeInvoiceCardProps) {
  return (
    <div className="glass-card-hover p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white text-lg">
            {invoice.customerName}
          </h3>
          <p className="text-sm text-slate-400 mt-0.5">
            {invoice.invoiceNumber || invoice.stripeId.slice(0, 16)}
          </p>
        </div>
        {invoice.isOnBlockchain ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Listed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-400/10 text-slate-400 border border-slate-400/20">
            Stripe
          </span>
        )}
      </div>

      <p className="text-sm text-slate-500 mb-4 line-clamp-1">
        {invoice.description}
      </p>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Amount</p>
          <p className="text-xl font-bold text-white mt-0.5">
            {formatCurrency(invoice.amount, invoice.currency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Due Date</p>
          <p className="text-sm font-medium text-white mt-1">
            {formatDate(invoice.dueDate)}
          </p>
          <p className={`text-xs mt-0.5 ${invoice.isPastDue ? "text-red-400" : "text-slate-500"}`}>
            {invoice.isPastDue ? "Past due" : `${invoice.daysUntilDue} days left`}
          </p>
        </div>
      </div>

      {invoice.isOnBlockchain ? (
        <a
          href={`/invoice/${invoice.blockchainId}`}
          className="block w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium text-center hover:bg-emerald-500/20 transition-colors"
        >
          View on Marketplace
        </a>
      ) : invoice.isPastDue ? (
        <button
          disabled
          className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-500 text-sm font-medium cursor-not-allowed"
        >
          Past Due &mdash; Cannot List
        </button>
      ) : (
        <button
          onClick={() => onList(invoice)}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-medium hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/20"
        >
          List on Marketplace
        </button>
      )}
    </div>
  )
}
