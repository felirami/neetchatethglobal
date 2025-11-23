'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet, sepolia, base } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from '@wagmi/connectors'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'
import { XMTPProvider } from '@/contexts/XMTPContext'
import { TestWalletProvider } from '@/contexts/TestWalletContext'
import { IdentityProvider } from '@/contexts/IdentityContext'

const queryClient = new QueryClient()

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

// Build connectors array - Farcaster Mini App connector first (for Farcaster users)
// Then fallback to other connectors
const connectors = [
  farcasterMiniApp(), // Farcaster Mini App wallet connector
  injected({ shimDisconnect: true }),
  metaMask(),
]

// Only add WalletConnect if projectId is configured
if (projectId) {
  connectors.push(walletConnect({ projectId }) as any)
} else {
  console.warn('WalletConnect Project ID not configured. Get one from https://cloud.walletconnect.com/')
}

const config = createConfig({
  chains: [base, mainnet, sepolia], // Base first for Farcaster Mini Apps
  connectors,
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <TestWalletProvider>
          <IdentityProvider>
            <XMTPProvider>{children}</XMTPProvider>
          </IdentityProvider>
        </TestWalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

