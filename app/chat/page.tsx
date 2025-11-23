'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { WalletConnect } from '@/components/WalletConnect'
import { ConversationList } from '@/components/ConversationList'
import { ChatWindow } from '@/components/ChatWindow'
import { DebugPanel } from '@/components/DebugPanel'
import { useTestWallet } from '@/contexts/TestWalletContext'

// Define Conversation type locally
type Conversation = any

export default function ChatPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const { isConnected, status } = useAccount()
  const { isTestWallet } = useTestWallet()
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  
  // Consider connected if either regular wallet or test wallet is active
  const isWalletConnected = isConnected || isTestWallet
  
  // Wait for wagmi to finish hydrating before checking connection status
  // status can be: 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
  const isWagmiReady = status !== 'reconnecting' && status !== 'connecting'

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Only redirect if we're mounted, wagmi is ready, and wallet is definitely not connected
    // Don't redirect during initial hydration
    if (mounted && isWagmiReady && !isWalletConnected) {
      router.push('/')
    }
  }, [mounted, isWagmiReady, isWalletConnected, router])

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center gap-4 p-6">
            <div className="w-full max-w-sm h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </main>
    )
  }

  // Show loading/redirect message if not connected
  if (!isWalletConnected) {
    const message = !isWagmiReady ? "Connecting wallet..." : "Redirecting..."

    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">{message}</p>
          <p className="text-sm text-gray-500">Please connect your wallet</p>
        </div>
      </main>
    )
  }

  return (
    <main className="fixed inset-0 bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
      <div className="w-full h-full flex flex-col">
        {/* Header - Fixed at top */}
        <header className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center justify-between">
            {selectedConversation && (
              <button
                onClick={() => setSelectedConversation(null)}
                className="md:hidden mr-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                ← Back
              </button>
            )}
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex-1">
              NeetChat
            </h1>
            <div className="flex-shrink-0">
              <WalletConnect />
            </div>
          </div>
        </header>

        {/* Main Content - Scrollable area */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Sidebar - Conversation List */}
          <div className={`w-full md:w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col min-w-0 ${
            selectedConversation ? 'hidden md:flex' : 'flex'
          }`}>
            <ConversationList
              onSelectConversation={setSelectedConversation}
              selectedConversationId={selectedConversation?.id}
            />
          </div>

          {/* Chat Window */}
          <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${
            selectedConversation ? 'flex' : 'hidden md:flex'
          }`}>
            {selectedConversation ? (
              <ChatWindow conversation={selectedConversation} />
            ) : (
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0">
                <div className="flex flex-col items-center justify-center text-gray-500 min-h-full">
                  <div className="text-center max-w-md">
                    <div className="mb-4">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium mb-2">Select a conversation</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Choose a conversation from the list to start chatting</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <DebugPanel />
    </main>
  )
}

