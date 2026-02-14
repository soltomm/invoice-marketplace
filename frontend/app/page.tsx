"use client"

import Link from "next/link"
import { StatsBar } from "@/components/stats-bar"

const steps = [
  {
    number: "01",
    title: "Upload Invoices",
    description: "Connect your Stripe account and import unpaid invoices. Pick the ones you want to get cash for now.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
      </svg>
    ),
    gradient: "from-blue-500 to-blue-600",
  },
  {
    number: "02",
    title: "Get Instant Cash",
    description: "Investors buy your invoices at a small discount. You get paid instantly — no more waiting 30-90 days.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    gradient: "from-emerald-500 to-emerald-600",
  },
  {
    number: "03",
    title: "Earn Returns",
    description: "Investors earn 10-15% APY when invoices settle. Everyone wins — sellers get cash, investors earn yield.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
    gradient: "from-violet-500 to-violet-600",
  },
]

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background effects */}
        <div className="mesh-gradient" />
        <div className="grid-pattern absolute inset-0" />

        {/* Floating orbs */}
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-blue-500/20 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-20 right-[10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-float" style={{ animationDelay: "-3s" }} />
        <div className="absolute top-40 right-[30%] w-64 h-64 bg-violet-500/10 rounded-full blur-[120px] animate-float" style={{ animationDelay: "-5s" }} />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium animate-fade-in">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              Built on Tempo Blockchain
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight animate-fade-in-up">
              <span className="text-white">Get Paid Now.</span>
              <br />
              <span className="gradient-text">Earn More Later.</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              The first blockchain-powered invoice marketplace. Sellers get instant liquidity.
              Investors earn 10-15% APY. Powered by Stripe and Tempo.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-base hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
              >
                I&apos;m a Seller
              </Link>
              <Link
                href="/marketplace"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold text-base hover:bg-slate-700 hover:border-slate-600 transition-all"
              >
                I&apos;m an Investor
              </Link>
            </div>

            {/* Social proof */}
            <div className="mt-16 flex items-center justify-center gap-8 text-sm text-slate-500 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                Instant settlement
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                Sub-cent fees
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                Stripe integrated
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-12 border-y border-slate-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <StatsBar />
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-slate-400 max-w-xl mx-auto">
              Three simple steps to unlock your cash flow or start earning yield on invoices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className="glass-card p-8 relative group"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {/* Step number */}
                <span className="text-6xl font-black text-slate-800/60 absolute top-4 right-6">
                  {step.number}
                </span>

                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${step.gradient} text-white mb-5`}>
                  {step.icon}
                </div>

                <h3 className="text-xl font-bold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Economics Section */}
      <section className="relative py-24 border-t border-slate-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="glass-card p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px]" />

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-white mb-4">
                  See the Math
                </h2>
                <p className="text-slate-400 mb-8">
                  A $10,000 invoice due in 60 days. Here&apos;s how everyone profits.
                </p>

                <div className="space-y-4">
                  {[
                    { label: "Invoice Face Value", value: "$10,000", color: "text-white" },
                    { label: "Seller Receives (Instant)", value: "$9,800", color: "text-blue-400" },
                    { label: "Investor Pays", value: "$9,800", color: "text-slate-300" },
                    { label: "Investor Gets Back (60 days)", value: "$10,000", color: "text-emerald-400" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-3 border-b border-slate-700/50">
                      <span className="text-slate-400">{row.label}</span>
                      <span className={`font-semibold font-mono ${row.color}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="w-48 h-48 rounded-full border-4 border-emerald-500/30 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-5xl font-black text-emerald-400">12%</p>
                      <p className="text-sm text-slate-400 mt-1">Annual APY</p>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                    $200 profit
                  </div>
                </div>
                <p className="mt-6 text-sm text-slate-500 text-center">
                  Platform fee: just 0.5% ($50)
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-slate-400 mb-10 max-w-lg mx-auto">
            Join the future of invoice financing. Instant settlement, minimal fees, maximum returns.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/25"
            >
              Start Selling Invoices
            </Link>
            <Link
              href="/marketplace"
              className="px-8 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold hover:bg-slate-700 transition-all"
            >
              Browse Marketplace
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            InvoiceMarket &mdash; Built on Tempo Blockchain
          </p>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>Stripe Integrated</span>
            <span>&middot;</span>
            <span>0.5% Platform Fee</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
