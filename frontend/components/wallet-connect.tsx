"use client"

import { usePrivy, useWallets } from "@privy-io/react-auth"
import { formatAddress } from "@/lib/utils"

export function WalletConnect() {
  let authenticated = false
  let ready = false
  let login: (() => void) | undefined
  let logout: (() => void) | undefined
  let address = ""

  try {
    const privy = usePrivy()
    const { wallets } = useWallets()
    authenticated = privy.authenticated
    ready = privy.ready
    login = privy.login
    logout = privy.logout
    address = wallets[0]?.address || ""
  } catch {
    // Privy provider not available (no app ID configured)
    // Fall through to disconnected state
  }

  if (!ready) {
    return (
      <div className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700">
        <span className="text-sm text-slate-500">Loading...</span>
      </div>
    )
  }

  if (authenticated && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-mono text-slate-300">
            {formatAddress(address)}
          </span>
        </div>
        <button
          onClick={logout}
          className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={login}
      className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-medium hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/25"
    >
      Connect Wallet
    </button>
  )
}

/**
 * Hook to get the connected wallet address.
 * Returns empty string if not connected or Privy not configured.
 */
export function useWalletAddress(): string {
  try {
    const { wallets } = useWallets()
    return wallets[0]?.address || ""
  } catch {
    return ""
  }
}
