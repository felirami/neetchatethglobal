'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { toBytes } from 'viem'
import { useTestWallet } from './TestWalletContext'

// Define types locally to avoid build-time imports
type Identifier = {
  identifier: string
  identifierKind: 'Ethereum'
}

type Signer = {
  type: 'EOA' | 'SCW'
  getIdentifier: () => Identifier
  signMessage: (message: string) => Promise<Uint8Array>
}

interface XMTPContextType {
  client: any | null // Using any to avoid type imports
  isLoading: boolean
  error: string | null
  initializeClient: () => Promise<void>
}

const XMTPContext = createContext<XMTPContextType | undefined>(undefined)

export function XMTPProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revocationAttempted, setRevocationAttempted] = useState(false) // Track if we've tried revocation
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { isTestWallet, testWalletAddress, signMessageWithTestWallet } = useTestWallet()
  
  // Refs to track initialization status across renders/effects
  const isInitializing = useRef(false)
  const isUnmounting = useRef(false)

  // Use test wallet address if test wallet is active, otherwise use connected wallet
  const activeAddress = isTestWallet ? testWalletAddress : address
  const activeIsConnected = isTestWallet ? !!testWalletAddress : isConnected

  const createSigner = useCallback((): Signer => {
    const walletAddress = activeAddress
    if (!walletAddress) {
      throw new Error('Wallet not connected')
    }

    const accountIdentifier: Identifier = {
      identifier: walletAddress.toLowerCase(),
      identifierKind: 'Ethereum',
    }

    return {
      type: 'EOA',
      getIdentifier: () => accountIdentifier,
      signMessage: async (message: string): Promise<Uint8Array> => {
        try {
          let signature: string
          
          if (isTestWallet) {
            // Use test wallet signing (no user interaction needed)
            const signatureBytes = await signMessageWithTestWallet(message)
            // Convert Uint8Array back to hex string for consistency
            signature = `0x${Array.from(signatureBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`
          } else {
            // Use regular wallet signing (requires user interaction)
            signature = await signMessageAsync({ message })
          }
          
          // Convert hex string to Uint8Array
          return toBytes(signature)
        } catch (err) {
          console.error('Error signing message:', err)
          throw err
        }
      },
    }
  }, [activeAddress, isTestWallet, signMessageAsync, signMessageWithTestWallet])

  const initializeClient = useCallback(async () => {
    // Prevent duplicate initializations
    if (isInitializing.current) {
      console.log('⚠️ Client initialization already in progress')
      return
    }

    if (!activeIsConnected || !activeAddress) {
      setError('Please connect your wallet first')
      return
    }

    isInitializing.current = true
    setIsLoading(true)
    setError(null)

    try {
      // Dynamically import XMTP SDK to avoid SSR issues
      const { Client } = await import('@xmtp/browser-sdk')
      const signer = createSigner()
      const env = process.env.NEXT_PUBLIC_XMTP_ENV || 'production'
      
      // Explicitly set DB path to ensure persistence and avoid creating new installations on error fallback
      // Format: xmtp-{env}-{address}.db3
      // This is crucial for ensuring we use the same DB even if previous locks cause issues
      // Note: We removed the explicit dbPath for now as it might cause conflicts if SDK defaults change
      // Instead, we rely on the retry loop below to handle locking issues
      
      let xmtpClient = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      // Retry loop for client creation to handle database locking issues on reload
      while (!xmtpClient && retryCount < maxRetries) {
        try {
          if (retryCount > 0) {
            console.log(`🔄 Retrying client initialization (attempt ${retryCount + 1}/${maxRetries})...`)
            // Wait a bit before retrying to allow locks to release
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
          
          xmtpClient = await Client.create(signer, {
            env: env,
          })
          console.log('✅ XMTP Client created successfully')
        } catch (createError: any) {
          console.warn(`⚠️ Client creation attempt ${retryCount + 1} failed:`, createError?.message)
          
          // Check for DB lock errors
          if (createError?.message?.includes('Access Handles cannot be created') || 
              createError?.message?.includes('NoModificationAllowedError') ||
              createError?.message?.includes('database is locked')) {
            console.log('🔒 Database lock detected, waiting for release...')
          } else if (createError?.message?.includes('installations') && createError?.message?.includes('already registered')) {
            // If it's an installation limit error, don't retry creation, throw immediately to handle revocation
            throw createError
          }
          
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error('❌ Max retries reached for client initialization')
            throw createError
          }
        }
      }
      
      if (isUnmounting.current) {
        console.log('🛑 Component unmounted during initialization, aborting')
        return
      }
      
      // Perform initial sync to fetch conversations and messages from the network
      // This ensures the local database is populated with existing conversations
      console.log('🔄 Performing initial sync to fetch conversations from network...')
      try {
        if (typeof xmtpClient.conversations?.syncAll === 'function') {
          await xmtpClient.conversations.syncAll(['allowed', 'unknown'])
          console.log('✅ Initial syncAll completed')
        } else if (typeof xmtpClient.conversations?.sync === 'function') {
          await xmtpClient.conversations.sync()
          console.log('✅ Initial sync completed')
        } else {
          console.warn('⚠️ No sync method available on client')
        }
      } catch (syncError: any) {
        console.warn('⚠️ Error during initial sync (client will still work):', syncError?.message)
        // Don't fail client initialization if sync fails - it will retry later
      }
      
      if (!isUnmounting.current) {
        setClient(xmtpClient)
      }
    } catch (err: any) {
      console.error('Error initializing XMTP client:', err)
      
      let errorMessage = 'Failed to initialize XMTP client'
      
      if (err instanceof Error) {
        if (err.message.includes('User rejected') || err.message.includes('denied')) {
          errorMessage = 'Wallet signature was rejected. Please try again and approve the signature request.'
        } else if (err.message.includes('network') || err.message.includes('connection')) {
          errorMessage = 'Network error. Please check your internet connection and try again.'
        } else if (err.message.includes('signature')) {
          errorMessage = 'Signature error. Please try reconnecting your wallet.'
        } else if (err.message.includes('installations') && err.message.includes('already registered')) {
          // XMTP installation limit exceeded - try to revoke old installations
          // Only attempt revocation once to prevent infinite loops
          if (revocationAttempted) {
            errorMessage = `XMTP Installation Limit Exceeded\n\n` +
              `Automatic revocation was attempted but failed.\n\n` +
              `Please clear XMTP data:\n` +
              `1. Open browser DevTools (F12)\n` +
              `2. Run: clearXMTPData()\n` +
              `3. Refresh the page\n\n` +
              `Or use a different wallet address for testing.`
            setError(errorMessage)
            setIsLoading(false)
            isInitializing.current = false
            return
          }
          
          console.log('⚠️ Installation limit exceeded, attempting to revoke old installations...')
          setRevocationAttempted(true)
          
          try {
            // Get inboxId from the error or by querying the API
            let inboxId = null
            
            // Method 1: Try to parse from error message
            const inboxIdMatch = err.message.match(/InboxID ([a-f0-9]+)/i)
            if (inboxIdMatch) {
              inboxId = inboxIdMatch[1]
              console.log('✅ Found inboxId in error message:', inboxId)
            } else {
              // Method 2: Try to query from XMTP API
              console.log('⚠️ Could not parse inboxId from error, querying API...')
              try {
                const apiUrl = 'https://production.xmtp.network/v1/identities'
                const response = await fetch(`${apiUrl}?address=${activeAddress}`, {
                  method: 'GET',
                  headers: { 'Content-Type': 'application/json' },
                })
                
                if (response.ok) {
                  const data = await response.json()
                  if (data.inboxId) {
                    inboxId = data.inboxId
                    console.log('✅ Fetched inboxId from API:', inboxId)
                  }
                } else {
                  console.warn('❌ API query failed:', response.status)
                }
              } catch (apiErr) {
                console.warn('❌ Error querying XMTP API:', apiErr)
              }
            }
            
            if (inboxId) {
              // Try to get inbox states and revoke installations
              const { Client } = await import('@xmtp/browser-sdk')
              const inboxStates = await Client.inboxStateFromInboxIds([inboxId], 'production')
              
              if (inboxStates && inboxStates.length > 0 && inboxStates[0].installations) {
                const installations = inboxStates[0].installations
                console.log(`Found ${installations.length} installations`)
                
                // Revoke installations when we're at or over the limit (10)
                // Revoke all but keep the last 2-3 to ensure we have room for a new one
                if (installations.length >= 10) {
                  // Keep the last 2 installations, revoke the rest
                  const keepCount = 2
                  const toRevoke = installations.slice(0, installations.length - keepCount).map((i: any) => i.bytes)
                  console.log(`Revoking ${toRevoke.length} installations (keeping ${keepCount} most recent)...`)
                  
                  if (toRevoke.length > 0) {
                    const signer = createSigner()
                    await Client.revokeInstallations(
                      signer,
                      inboxId,
                      toRevoke,
                      'production',
                      true // enableLogging
                    )
                    
                    console.log('✅ Successfully revoked old installations')
                    // Reset revocation flag for retry
                    setRevocationAttempted(false)
                    isInitializing.current = false // Allow re-initialization
                    // Wait a bit longer for revocation to propagate, then retry
                    setTimeout(() => {
                      console.log('🔄 Retrying XMTP client initialization after revocation...')
                      initializeClient()
                    }, 2000)
                    return
                  } else {
                    console.warn('⚠️ No installations to revoke (all are recent)')
                  }
                }
              }
            } else {
              console.error('❌ Could not determine Inbox ID for revocation')
            }
          } catch (revokeError: any) {
            console.error('Failed to revoke installations:', revokeError)
          }
          
          // XMTP installation limit exceeded
          errorMessage = `XMTP Installation Limit Exceeded\n\n` +
            `This wallet has reached the maximum number of XMTP installations (10).\n\n` +
            `Attempting automatic revocation... If this doesn't work:\n` +
            `1. Open browser DevTools (F12)\n` +
            `2. Go to Application > Storage > IndexedDB\n` +
            `3. Delete all databases starting with "xmtp-" or "production-"\n` +
            `4. Refresh the page\n\n` +
            `Or use a different wallet address for testing.`
        } else {
          errorMessage = err.message || errorMessage
        }
      }
      
      setError(errorMessage)
    } finally {
      isInitializing.current = false
      setIsLoading(false)
    }
  }, [activeIsConnected, activeAddress, createSigner])

  useEffect(() => {
    isUnmounting.current = false;
    
    if (activeIsConnected && activeAddress && !client && !isLoading && !isInitializing.current) {
      initializeClient()
    }
    
    return () => {
      isUnmounting.current = true;
      // Note: XMTP Client doesn't have a synchronous destroy method exposed easily in this version
      // but we set the ref to prevent state updates after unmount
    }
  }, [activeIsConnected, activeAddress, client, isLoading, initializeClient])

  return (
    <XMTPContext.Provider value={{ client, isLoading, error, initializeClient }}>
      {children}
    </XMTPContext.Provider>
  )
}

export function useXMTP() {
  const context = useContext(XMTPContext)
  if (context === undefined) {
    throw new Error('useXMTP must be used within an XMTPProvider')
  }
  return context
}
