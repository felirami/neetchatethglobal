'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from '@wagmi/connectors'
import { XMTPProvider } from '@/contexts/XMTPContext'
import { TestWalletProvider } from '@/contexts/TestWalletContext'
import { IdentityProvider } from '@/contexts/IdentityContext'

const queryClient = new QueryClient()

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

// Build connectors array - only include WalletConnect if projectId is provided
const connectors = [
  injected({ shimDisconnect: true }),
  metaMask(),
]

// Only add WalletConnect if projectId is configured
if (projectId) {
  connectors.push(walletConnect({ projectId }))
} else {
  console.warn('WalletConnect Project ID not configured. Get one from https://cloud.walletconnect.com/')
}

const config = createConfig({
  chains: [mainnet, sepolia],
  connectors,
  transports: {
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

