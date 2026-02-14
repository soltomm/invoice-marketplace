"use client"

import { useWallets } from "@privy-io/react-auth"
import { ethers } from "ethers"
import InvoiceMarketABI from "./InvoiceMarket.json"

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || ""
const PAYMENT_TOKEN = process.env.NEXT_PUBLIC_PAYMENT_TOKEN || "0x20C0000000000000000000000000000000000001"
const TEMPO_CHAIN_ID = 42431

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
]

/**
 * Hook that returns a function to buy an invoice using the connected Privy wallet.
 * The user's wallet approves AlphaUSD spending, then calls buyInvoice on the contract.
 */
export function useContractBuy() {
  let wallets: ReturnType<typeof useWallets>["wallets"] = []
  try {
    const result = useWallets()
    wallets = result.wallets
  } catch {
    // Privy provider not available
  }

  async function buyInvoiceOnChain(invoiceId: number): Promise<{ txHash: string }> {
    const wallet = wallets[0]
    if (!wallet) {
      throw new Error("No wallet connected. Please connect your wallet first.")
    }

    if (!CONTRACT_ADDRESS) {
      throw new Error("Contract address not configured")
    }

    // Switch the wallet to Tempo chain if needed
    try {
      await wallet.switchChain(TEMPO_CHAIN_ID)
    } catch {
      throw new Error("Failed to switch to Tempo network. Please switch manually.")
    }

    // Get the EIP-1193 provider from the Privy wallet
    const eip1193Provider = await wallet.getEthereumProvider()
    const provider = new ethers.BrowserProvider(eip1193Provider)
    const signer = await provider.getSigner()

    // Create contract instance with the user's signer
    const contract = new ethers.Contract(CONTRACT_ADDRESS, InvoiceMarketABI, signer)

    // Read the invoice to get the discounted value
    const invoice = await contract.getInvoice(invoiceId)
    if (!invoice || Number(invoice.id) === 0) {
      throw new Error("Invoice not found on blockchain")
    }

    const discountedValue: bigint = invoice.discountedValue

    // Check user's AlphaUSD balance
    const token = new ethers.Contract(PAYMENT_TOKEN, ERC20_ABI, signer)
    const balance: bigint = await token.balanceOf(await signer.getAddress())
    if (balance < discountedValue) {
      const needed = ethers.formatUnits(discountedValue, 6)
      const have = ethers.formatUnits(balance, 6)
      throw new Error(`Insufficient AlphaUSD balance. Need ${needed}, have ${have}. Use the Tempo faucet to get test tokens.`)
    }

    // Check current allowance and approve if needed
    const currentAllowance: bigint = await token.allowance(await signer.getAddress(), CONTRACT_ADDRESS)
    if (currentAllowance < discountedValue) {
      const approveTx = await token.approve(CONTRACT_ADDRESS, discountedValue)
      await approveTx.wait()
    }

    // Call buyInvoice (no msg.value needed — uses ERC20 transferFrom)
    const tx = await contract.buyInvoice(invoiceId)
    const receipt = await tx.wait()
    return { txHash: receipt.hash }
  }

  return { buyInvoiceOnChain }
}
