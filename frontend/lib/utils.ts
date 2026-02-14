import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string, currency = "USD"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function statusLabel(status: number): string {
  switch (status) {
    case 0: return "Listed"
    case 1: return "Sold"
    case 2: return "Settled"
    case 3: return "Cancelled"
    default: return "Unknown"
  }
}

export function statusColor(status: number): string {
  switch (status) {
    case 0: return "text-blue-400 bg-blue-400/10 border-blue-400/20"
    case 1: return "text-amber-400 bg-amber-400/10 border-amber-400/20"
    case 2: return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
    case 3: return "text-red-400 bg-red-400/10 border-red-400/20"
    default: return "text-slate-400 bg-slate-400/10 border-slate-400/20"
  }
}
