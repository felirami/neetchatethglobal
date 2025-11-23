'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, http, type WalletClient } from 'viem'
import { mainnet } from 'viem/chains'

// Test wallet private key (ONLY FOR DEVELOPMENT - NEVER USE IN PRODUCTION)
// This is a well-known test private key - DO NOT use with real funds
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as `0x${string}`

interface TestWalletContextType {
  isTestWallet: boolean
  testWalletAddress: string | null
  activateTestWallet: () => void
  stopUsingTestWallet: () => void
  testWalletClient: WalletClient | null
  signMessageWithTestWallet: (message: string) => Promise<Uint8Array>
}

const TestWalletContext = createContext<TestWalletContextType | undefined>(undefined)

export function TestWalletProvider({ children }: { children: ReactNode }) {
  const [isTestWallet, setIsTestWallet] = useState(false)
  const [testWalletClient, setTestWalletClient] = useState<WalletClient | null>(null)
  const [testWalletAddress, setTestWalletAddress] = useState<string | null>(null)
  const [testAccount, setTestAccount] = useState<ReturnType<typeof privateKeyToAccount> | null>(null)

  const activateTestWallet = useCallback(() => {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('Test wallet is only available in development mode')
      return
    }

    try {
      const account = privateKeyToAccount(TEST_PRIVATE_KEY)
      const walletClient = createWalletClient({
        account,
        chain: mainnet,
        transport: http(),
      })

      setTestWalletClient(walletClient)
      setTestAccount(account)
      setTestWalletAddress(account.address)
      setIsTestWallet(true)
      
      console.log('✅ Test wallet activated:', account.address)
      console.log('⚠️ WARNING: This is a test wallet. Do NOT use with real funds!')
    } catch (error) {
      console.error('Failed to create test wallet:', error)
    }
  }, [])

  const stopUsingTestWallet = useCallback(() => {
    setTestWalletClient(null)
    setTestAccount(null)
    setTestWalletAddress(null)
    setIsTestWallet(false)
    console.log('Test wallet deactivated')
  }, [])

  const signMessageWithTestWallet = useCallback(async (message: string): Promise<Uint8Array> => {
    if (!testAccount) {
      throw new Error('Test wallet not initialized')
    }

    try {
      // Use the account's signMessage method directly
      const signature = await testAccount.signMessage({ message })
      
      // Convert hex string to Uint8Array
      const { toBytes } = await import('viem')
      return toBytes(signature)
    } catch (error) {
      console.error('Error signing message with test wallet:', error)
      throw error
    }
  }, [testAccount])

  return (
    <TestWalletContext.Provider
      value={{
        isTestWallet,
        testWalletAddress,
        activateTestWallet,
        stopUsingTestWallet,
        testWalletClient,
        signMessageWithTestWallet,
      }}
    >
      {children}
    </TestWalletContext.Provider>
  )
}

export function useTestWallet() {
  const context = useContext(TestWalletContext)
  if (context === undefined) {
    throw new Error('useTestWallet must be used within a TestWalletProvider')
  }
  return context
}

