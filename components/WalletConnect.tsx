'use client'

import { useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useXMTP } from '@/contexts/XMTPContext'
import { useTestWallet } from '@/contexts/TestWalletContext'

export function WalletConnect() {
  const [mounted, setMounted] = useState(false)
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { client, isLoading, error } = useXMTP()
  const { isTestWallet, testWalletAddress, activateTestWallet, stopUsingTestWallet } = useTestWallet()
  
  // Use test wallet address if test wallet is active
  const displayAddress = isTestWallet ? testWalletAddress : address
  const displayIsConnected = isTestWallet ? !!testWalletAddress : isConnected

  useEffect(() => {
    setMounted(true)
  }, [])

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex flex-col items-center gap-4 p-6">
        <div className="w-full max-w-sm h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
      </div>
    )
  }

  if (displayIsConnected && displayAddress) {
    return (
      <div className="flex flex-col items-center gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">
            {formatAddress(displayAddress)}
            {isTestWallet && (
              <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-yellow-900 text-xs rounded">
                TEST
              </span>
            )}
          </span>
        </div>
        {isTestWallet && (
          <div className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
            ⚠️ Test Wallet Active (Dev Only)
          </div>
        )}
        {client ? (
          <div className="text-sm text-green-600 dark:text-green-400">
            ✓ XMTP Connected
          </div>
        ) : isLoading ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Connecting to XMTP...
          </div>
        ) : error ? (
          <div className="text-sm text-red-600 dark:text-red-400 max-w-md">
            <div className="whitespace-pre-line">{error}</div>
            {error.includes('Installation Limit') && (
              <button
                onClick={async () => {
                  if (confirm('This will clear all XMTP data in your browser. Continue?')) {
                    try {
                      // Clear IndexedDB
                      const databases = await indexedDB.databases()
                      for (const db of databases) {
                        if (db.name && (db.name.includes('xmtp') || db.name.includes('production-'))) {
                          indexedDB.deleteDatabase(db.name)
                        }
                      }
                      // Clear localStorage
                      Object.keys(localStorage).forEach(key => {
                        if (key.includes('xmtp') || key.includes('production-')) {
                          localStorage.removeItem(key)
                        }
                      })
                      alert('XMTP data cleared! Please refresh the page.')
                      window.location.reload()
                    } catch (e) {
                      alert('Error clearing data: ' + e)
                    }
                  }
                }}
                className="mt-2 px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs"
              >
                Clear XMTP Data
              </button>
            )}
          </div>
        ) : null}
        <div className="flex gap-2">
               <div className="flex flex-col gap-2">
                 {isTestWallet ? (
                   <button
                     onClick={stopUsingTestWallet}
                     className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors"
                   >
                     Stop Test Wallet
                   </button>
                 ) : (
                   <button
                     onClick={() => disconnect()}
                     className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                   >
                     Disconnect
                   </button>
                 )}
                 {process.env.NODE_ENV === 'development' && (
                   <button
                     onClick={async () => {
                       if (typeof window !== 'undefined' && (window as any).clearXMTPData) {
                         await (window as any).clearXMTPData()
                       } else {
                         alert('clearXMTPData function not available. Please refresh the page.')
                       }
                     }}
                     className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                   >
                     Clear XMTP Data
                   </button>
                 )}
               </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <h2 className="text-xl font-bold text-center">Connect Your Wallet</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
        Connect your wallet to start chatting with other wallets using XMTP
      </p>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={activateTestWallet}
            className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors border-2 border-yellow-600"
          >
            🧪 Use Test Wallet (Dev Only)
          </button>
        )}
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isPending}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Connecting...' : `Connect ${connector.name}`}
          </button>
        ))}
      </div>
    </div>
  )
}

