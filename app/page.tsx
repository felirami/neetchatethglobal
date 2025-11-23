'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { WalletConnect } from '@/components/WalletConnect'
import { useTestWallet } from '@/contexts/TestWalletContext'

export default function Home() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const { isConnected } = useAccount()
  const { isTestWallet } = useTestWallet()
  
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
                const deleteReq = indexedDB.deleteDatabase(db.name!)
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

  // Redirect to /chat when wallet connects
  useEffect(() => {
    if (mounted && isWalletConnected) {
      router.push('/chat')
    }
  }, [mounted, isWalletConnected, router])

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

  // Show wallet connection UI
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md">
        <WalletConnect />
      </div>
    </main>
  )
}

