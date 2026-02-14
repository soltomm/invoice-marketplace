"use client"

import { PrivyProvider } from "@privy-io/react-auth"
import type { ReactNode } from "react"

// Tempo testnet chain configuration
const tempoTestnet = {
  id: 42431,
  name: "Tempo Testnet (Moderato)",
  network: "tempo-testnet",
  nativeCurrency: {
    name: "TEMPO",
    symbol: "TEMPO",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://rpc.moderato.tempo.xyz"] },
  },
  blockExplorers: {
    default: { name: "Tempo Explorer", url: "https://explorer.moderato.tempo.xyz" },
  },
}

export function Providers({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID

  if (!appId || appId === "your-privy-app-id") {
    // Fallback: render children without Privy if no app ID configured
    return <>{children}</>
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#3b82f6",
        },
        loginMethods: ["email", "wallet"],
        defaultChain: tempoTestnet,
        supportedChains: [tempoTestnet],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "all-users",
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}
