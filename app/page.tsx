'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { WalletConnect } from '@/components/WalletConnect'
import { ConversationList } from '@/components/ConversationList'
import { ChatWindow } from '@/components/ChatWindow'
import { DebugPanel } from '@/components/DebugPanel'
import { useTestWallet } from '@/contexts/TestWalletContext'

// Define Conversation type locally
type Conversation = any

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const { isConnected } = useAccount()
  const { isTestWallet } = useTestWallet()
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  
  // Consider connected if either regular wallet or test wallet is active
  const isWalletConnected = isConnected || isTestWallet

  useEffect(() => {
    setMounted(true)
    
    // Expose clearXMTPData function globally for debugging
    if (typeof window !== 'undefined') {
      (window as any).clearXMTPData = async () => {
        try {
          const databases = await indexedDB.databases()
          let cleared = 0
          for (const db of databases) {
            if (db.name && (db.name.includes('xmtp') || db.name.includes('production-'))) {
              await new Promise<void>((resolve) => {
                const deleteReq = indexedDB.deleteDatabase(db.name)
                deleteReq.onsuccess = () => { cleared++; resolve() }
                deleteReq.onerror = () => resolve()
                deleteReq.onblocked = () => resolve()
              })
            }
          }
          
          let clearedStorage = 0
          Object.keys(localStorage).forEach(key => {
            if (key.includes('xmtp') || key.includes('production-')) {
              localStorage.removeItem(key)
              clearedStorage++
            }
          })
          
          console.log(`✅ Cleared ${cleared} IndexedDB databases and ${clearedStorage} localStorage items`)
          alert(`Cleared ${cleared} databases and ${clearedStorage} storage items. Refreshing...`)
          window.location.reload()
          return { cleared, clearedStorage }
        } catch (error) {
          console.error('Error clearing XMTP data:', error)
          alert('Error: ' + error)
          throw error
        }
      }
      console.log('💡 Run clearXMTPData() in console to clear XMTP data')
    }
  }, [])

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

  if (!isWalletConnected) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md">
          <WalletConnect />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container-mobile mx-auto h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between">
            {selectedConversation && (
              <button
                onClick={() => setSelectedConversation(null)}
                className="md:hidden mr-2 text-gray-600 dark:text-gray-400"
              >
                ← Back
              </button>
            )}
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex-1">
              NeetChat
            </h1>
            <WalletConnect />
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Conversation List */}
          <div className={`w-full md:w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col ${
            selectedConversation ? 'hidden md:flex' : 'flex'
          }`}>
            <ConversationList
              onSelectConversation={setSelectedConversation}
              selectedConversationId={selectedConversation?.id}
            />
          </div>

          {/* Chat Window */}
          <div className={`flex-1 flex flex-col min-w-0 ${
            selectedConversation ? 'flex' : 'hidden md:flex'
          }`}>
            {selectedConversation ? (
              <ChatWindow conversation={selectedConversation} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p className="text-lg font-medium mb-2">Select a conversation</p>
                  <p className="text-sm">Choose a conversation from the list to start chatting</p>
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

