import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Providers } from "@/components/providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "InvoiceMarket - Instant Invoice Liquidity",
  description: "Sell your invoices for instant cash or invest in invoices for 10-15% APY. Built on Tempo blockchain with Stripe integration.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-white antialiased">
        <Providers>
          <Navbar />
          <main className="pt-16">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
