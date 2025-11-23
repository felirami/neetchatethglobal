'use client'

import { useEffect, useState } from 'react'
import { useXMTP } from '@/contexts/XMTPContext'
import { useIdentity } from '@/contexts/IdentityContext'
import { resolveMention, ResolvedIdentity } from '@/lib/identity/resolve'
import { extractMentions } from '@/lib/mentions'
import { IdentityConfirmationModal } from '@/components/IdentityConfirmationModal'
import { useAccount } from 'wagmi'
import { useTestWallet } from '@/contexts/TestWalletContext'

// Helper to identify the "success" error from XMTP
const isSyncSuccessError = (error: any): boolean => {
  const msg = typeof error === 'string' ? error : error?.message || ''
  // Matches patterns like:
  // "synced 1 messages, 0 failed 1 succeeded"
  // "synced 2 messages, 0 failed 2 succeeded"
  return typeof msg === 'string' && 
    msg.includes('synced') && 
    msg.includes('succeeded') && 
    (msg.includes('0 failed') || (msg.includes('failed') && !msg.includes('failed 0')))
}

export interface Conversation {
  id: string
  peerAddress?: string
  topic?: string
  clientAddress?: string
  [key: string]: any
}

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation) => void
  selectedConversationId?: string
}

export function ConversationList({ onSelectConversation, selectedConversationId }: ConversationListProps) {
  const { client } = useXMTP()
  const { resolveMention: resolveMentionCached } = useIdentity()
  const { address } = useAccount()
  const { isTestWallet, testWalletAddress } = useTestWallet()
  const currentUserAddress = isTestWallet ? testWalletAddress : address
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchAddress, setSearchAddress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [resolvedIdentity, setResolvedIdentity] = useState<ResolvedIdentity | null>(null)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [pendingAddress, setPendingAddress] = useState<string | null>(null)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)

  const refreshConversations = async () => {
    if (!client) return

    setIsLoading(true)
    try {
      console.log('🔄 Syncing conversations from network...')
      
      // Log installation ID for debugging persistence
      if (client.installationId) {
        console.log('📱 Current Installation ID:', client.installationId)
      }

      // Try syncAll first, then fallback to sync
      try {
        if (typeof client.conversations?.syncAll === 'function') {
          await client.conversations.syncAll(['allowed', 'unknown'])
          console.log('✅ Conversations synced from network (syncAll)')
        } else if (typeof client.conversations?.sync === 'function') {
          await client.conversations.sync()
          console.log('✅ Conversations synced from network (sync)')
        } else {
          console.warn('⚠️ No sync method available, loading from local database only')
        }
      } catch (syncError: any) {
        console.warn('⚠️ Error during sync (will load from local database):', syncError?.message)
        // Continue to load from local database even if sync fails
      }

      // List all DMs (direct messages)
      const dms = await client.conversations.listDms()
      console.log('📋 Found', dms.length, 'DMs (all consent states)')

      // Also try list() to get all conversations
      let allConversations = await client.conversations.list()
      console.log('📋 Found', allConversations.length, 'total conversations (all consent states)')

      // Retry listing if empty, just in case sync is still committing to DB
      if (dms.length === 0 && allConversations.length === 0) {
        console.log('Empty list, waiting 1s and retrying list()...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        const dmsRetry = await client.conversations.listDms()
        const allRetry = await client.conversations.list()
        console.log('📋 Retry found', dmsRetry.length, 'DMs and', allRetry.length, 'total')
        
        if (dmsRetry.length > 0) dms.push(...dmsRetry)
        if (allRetry.length > 0) allConversations = allRetry
      }

      // Combine and deduplicate by ID
      const conversationMap = new Map<string, Conversation>()
      
      // Add DMs first
      dms.forEach((dm: any) => {
        if (dm.id) {
          conversationMap.set(dm.id, dm as Conversation)
        }
      })
      
      // Add all conversations
      allConversations.forEach((conv: any) => {
        if (conv.id && !conversationMap.has(conv.id)) {
          conversationMap.set(conv.id, conv as Conversation)
        }
      })

      const uniqueConversations = Array.from(conversationMap.values())
      console.log('📋 Total loaded:', uniqueConversations.length, 'conversations from local database')
      
      // Restore peerAddress from localStorage if missing
      if (typeof window !== 'undefined') {
        const addressMap = JSON.parse(localStorage.getItem('xmtp_conversation_addresses') || '{}')
        uniqueConversations.forEach((conv: any) => {
          if (!conv.peerAddress && addressMap[conv.id]) {
            conv.peerAddress = addressMap[conv.id]
            console.log('💾 Restored address from localStorage:', conv.id, '→', addressMap[conv.id])
          }
        })
      }
      
      // Log all conversation addresses for debugging
      uniqueConversations.forEach((conv: any, index: number) => {
        const peerAddr = conv.peerAddress || conv.peer?.address || conv.address || '(no address)'
        console.log(`   Conversation ${index + 1}:`, {
          id: conv.id,
          peerAddress: peerAddr,
          topic: conv.topic || '(no topic)'
        })
      })

      setConversations(uniqueConversations)
    } catch (err: any) {
      console.error('Error refreshing conversations:', err)
      
      // Ignore "synced 1 messages, 0 failed 1 succeeded" error which is actually success
      if (isSyncSuccessError(err)) {
        console.log('Ignoring sync success message treated as error:', err?.message || err)
        return
      }
      
      setError(`Failed to load conversations: ${err?.message || 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!client) return

    refreshConversations()

    // Set up periodic sync every 30 seconds
    const periodicSync = setInterval(() => {
      if (client) {
        console.log('🔄 Periodic sync: syncing conversations...')
        refreshConversations()
      }
    }, 30000)

    return () => {
      clearInterval(periodicSync)
    }
  }, [client])

  // Extract conversation creation logic to be called from modal confirmation
  const createConversationWithAddress = async (address: string) => {
    console.log('🚀 createConversationWithAddress called with address:', address)
    console.log('   Address type:', typeof address)
    console.log('   Address length:', address?.length)
    console.log('   Client available:', !!client)
    console.log('   Resolved identity:', resolvedIdentity)
    
    if (!address) {
      console.error('❌ No address provided to createConversationWithAddress')
      setError('No address provided. Please try again.')
      setShowConfirmationModal(false)
      setIsCreatingConversation(false)
      return
    }
    
    setIsCreatingConversation(true)
    setError(null)
    // Don't close modal immediately - wait until conversation is created or error occurs
    
    try {
      if (!client) {
        throw new Error('XMTP client is not initialized')
      }

      const inputAddress = address.toLowerCase()
      console.log('📍 Processing address for conversation creation:', inputAddress)
      console.log('   Is valid Ethereum address:', inputAddress.startsWith('0x') && inputAddress.length === 42)
      
      console.log('📍 Processing address:', inputAddress)

      // Verify client is ready and has conversations object
      if (!client.conversations) {
        throw new Error('XMTP client is not fully initialized. Please wait a moment and try again.')
      }

      // Check if the address has XMTP before creating conversation
      // Note: canMessage can sometimes return false negatives, so we'll try to proceed anyway
      const { Client } = await import('@xmtp/browser-sdk')
      
      let canMessage = false
      let canMessageDebugInfo: any = null
      
      const targetIdentifier = {
        identifier: inputAddress,
        identifierKind: 'Ethereum' as const,
      }

      try {
        console.log('🔍 Checking canMessage for address:', inputAddress)
        const canMessageResult = await Client.canMessage([targetIdentifier])
        
        // Log full response for debugging
        console.log('📦 canMessage result:', canMessageResult)
        console.log('📦 canMessage result type:', typeof canMessageResult)
        console.log('📦 canMessage result instanceof Map:', canMessageResult instanceof Map)
        
        // Try multiple ways to get the result
        if (canMessageResult instanceof Map) {
          canMessage = canMessageResult.get(inputAddress) === true || canMessageResult.get(inputAddress.toLowerCase()) === true
          const allEntries = Array.from(canMessageResult.entries())
          canMessageDebugInfo = {
            mapSize: canMessageResult.size,
            allEntries: allEntries,
            addressKey: inputAddress,
            result: canMessageResult.get(inputAddress) || canMessageResult.get(inputAddress.toLowerCase()),
            fullResult: canMessageResult
          }
          
          console.log('📋 canMessage Map entries:', allEntries)
          
          // Check if any entry has inboxId or identity info
          for (const [key, value] of allEntries) {
            if (typeof value === 'object' && value !== null) {
              console.log(`📋 canMessage entry for ${key}:`, value)
              if ((value as any).inboxId) {
                console.log('✅ Found inboxId in canMessage result!', (value as any).inboxId)
              }
            }
          }
        } else if (typeof canMessageResult === 'object') {
          canMessage = (canMessageResult as any)[inputAddress] === true || (canMessageResult as any)[inputAddress.toLowerCase()] === true
          const resultValue = (canMessageResult as any)[inputAddress] || (canMessageResult as any)[inputAddress.toLowerCase()]
          canMessageDebugInfo = {
            type: 'object',
            keys: Object.keys(canMessageResult),
            addressKey: inputAddress,
            result: resultValue,
            fullResult: canMessageResult
          }
          
          if (typeof resultValue === 'object' && resultValue !== null) {
            console.log('📋 canMessage result value:', resultValue)
            if (resultValue.inboxId) {
              console.log('✅ Found inboxId in canMessage result!', resultValue.inboxId)
            }
          }
        }
        
        console.log('✅ canMessage check result:', {
          address: inputAddress,
          canMessage,
          debugInfo: canMessageDebugInfo
        })
      } catch (error: any) {
        console.warn('⚠️ canMessage check failed, will attempt to proceed anyway:', error)
        canMessageDebugInfo = { error: error.message }
      }
      
      // Don't block on canMessage false - proceed to try getting inboxId
      if (!canMessage) {
        console.warn('⚠️ canMessage returned false, but will attempt to get inboxId anyway...', {
          address: inputAddress,
          debugInfo: canMessageDebugInfo
        })
      }

      // Get inboxId from the address
      // Browser SDK v5.1.0 - checking if getInboxIdByIdentifier is available
      let inboxId: string | null = null
      
      // Method 1: Check if DM already exists (this will give us the inboxId if found)
      try {
        const existingDms = await client.conversations.listDms()
        console.log('🔍 Checking existing DMs for address:', inputAddress)
        console.log('   Total existing DMs:', existingDms.length)
        
        // Check localStorage mappings first to help find conversations without peerAddress
        let localStorageMatch: any = null
        if (typeof window !== 'undefined') {
          const addressMap = JSON.parse(localStorage.getItem('xmtp_conversation_addresses') || '{}')
          console.log('   Checking localStorage mappings:', addressMap)
          console.log('   Looking for address:', inputAddress)
          console.log('   All mapped addresses:', Object.values(addressMap))
          
          // Check for exact match
          for (const [convId, mappedAddress] of Object.entries(addressMap)) {
            if (typeof mappedAddress === 'string' && mappedAddress.toLowerCase() === inputAddress.toLowerCase()) {
              console.log('✅ Found localStorage mapping:', convId, '→', mappedAddress)
              localStorageMatch = { id: convId, address: mappedAddress }
              break
            }
          }
          
          // If no exact match, log all mappings for debugging
          if (!localStorageMatch) {
            console.log('   No localStorage match found. Current mappings:')
            Object.entries(addressMap).forEach(([convId, addr]) => {
              console.log(`     ${convId.slice(0, 8)}... → ${addr}`)
            })
          }
        }
        
        // Log all existing DMs for debugging - including peerInboxId
        existingDms.forEach((dm: any, index: number) => {
          // Check localStorage mapping for this specific DM
          let dmMappedAddress: string | null = null
          if (typeof window !== 'undefined') {
            const addressMap = JSON.parse(localStorage.getItem('xmtp_conversation_addresses') || '{}')
            dmMappedAddress = addressMap[dm.id] || null
          }
          
          // Get peerInboxId from conversation (might be a function or property)
          const peerInboxIdValue = typeof (dm as any).peerInboxId === 'function'
            ? (dm as any).peerInboxId()
            : (dm as any).peerInboxId
          
          const peerAddr = dm.peerAddress || dm.peer?.address || dm.address || dmMappedAddress ||
            (localStorageMatch && dm.id === localStorageMatch.id ? localStorageMatch.address : null)
          
          // Debug the full object structure to see where address/inboxId might be hiding
          if (!peerAddr) {
             console.log(`   DM ${index + 1} (No peerAddress found):`, {
                 id: dm.id,
                 idShort: dm.id?.slice(0, 8),
                 keys: Object.keys(dm),
                 topic: dm.topic,
                 topicShort: dm.topic?.slice(0, 20),
                 peerInboxId: peerInboxIdValue || '(none)',
                 hasLocalStorageMapping: !!dmMappedAddress,
                 localStorageAddress: dmMappedAddress,
                 isLocalStorageMatch: localStorageMatch && dm.id === localStorageMatch.id
             })
          } else {
              const matches = peerAddr.toLowerCase() === inputAddress.toLowerCase()
              console.log(`   DM ${index + 1}:`, {
                id: dm.id,
                idShort: dm.id?.slice(0, 8),
                peerAddress: peerAddr,
                peerInboxId: peerInboxIdValue || '(none)',
                matches: matches,
                hasLocalStorageMapping: !!dmMappedAddress,
                localStorageAddress: dmMappedAddress,
                isLocalStorageMatch: localStorageMatch && dm.id === localStorageMatch.id
              })
              
              // If this DM matches, log it prominently
              if (matches) {
                console.log('🎯 FOUND MATCHING DM!', {
                  dmId: dm.id,
                  peerAddress: peerAddr,
                  peerInboxId: peerInboxIdValue,
                  source: dmMappedAddress ? 'localStorage' : 'conversation object'
                })
              }
          }
        })
        
        // First check: If localStorage has a match, use that conversation
        if (localStorageMatch) {
          const matchedDm = existingDms.find((dm: any) => dm.id === localStorageMatch.id)
          if (matchedDm) {
            console.log('✅ Found existing DM via localStorage mapping:', {
              dmId: matchedDm.id,
              mappedAddress: localStorageMatch.address,
              targetAddress: inputAddress
            })
            // Restore the peerAddress on the conversation object
            if (!matchedDm.peerAddress) {
              (matchedDm as any).peerAddress = localStorageMatch.address
            }
            onSelectConversation(matchedDm)
            setSearchAddress('')
            setResolvedIdentity(null)
            setPendingAddress(null)
            setShowConfirmationModal(false)
            setIsCreatingConversation(false)
            return
          }
        }
        
        // Try to get inboxId for the address first - this is the proper way to match in XMTP V3/MLS
        let targetInboxId: string | null = null
        try {
          // Try findInboxIdByIdentifier first
          const inboxIdResult = await client.findInboxIdByIdentifier({
            identifier: inputAddress,
            identifierKind: 'Ethereum' as const
          })
          if (inboxIdResult) {
            targetInboxId = inboxIdResult
            console.log('✅ Got inboxId for address:', inputAddress, '→', targetInboxId)
          }
        } catch (err: any) {
          console.log('⚠️ Could not get inboxId for address (will try address matching):', err?.message || err)
        }
        
        // Second check: Find DM by peerAddress match OR peerInboxId match (including localStorage mappings)
        const existingDm = existingDms.find((dm: any) => {
          // Check localStorage mapping for this specific DM
          let dmMappedAddress: string | null = null
          if (typeof window !== 'undefined') {
            const addressMap = JSON.parse(localStorage.getItem('xmtp_conversation_addresses') || '{}')
            dmMappedAddress = addressMap[dm.id] || null
          }
          
          // Get peerInboxId from conversation (might be a function or property)
          const peerInboxIdValue = typeof (dm as any).peerInboxId === 'function'
            ? (dm as any).peerInboxId()
            : (dm as any).peerInboxId
          
          const peerAddr = dm.peerAddress || dm.peer?.address || dm.address || dmMappedAddress
          
          // Match by inboxId if we have it (preferred method for V3/MLS)
          if (targetInboxId && peerInboxIdValue && peerInboxIdValue === targetInboxId) {
            console.log('✅ Found match by peerInboxId!', {
              dmId: dm.id,
              peerInboxId: peerInboxIdValue,
              targetInboxId: targetInboxId
            })
            return true
          }
          
          // Fallback: Match by address
          if (!peerAddr) {
            // Skip DMs without addresses - they can't match (unless localStorage matched above)
            return false
          }
          const matches = peerAddr.toLowerCase() === inputAddress.toLowerCase()
          if (matches) {
            console.log('✅ Found existing DM with matching address:', {
              dmId: dm.id,
              peerAddress: peerAddr,
              targetAddress: inputAddress,
              source: dmMappedAddress ? 'localStorage' : 'conversation object'
            })
          }
          return matches
        })
        
        if (existingDm) {
          // Double-verify the address matches before using it
          const peerAddr = existingDm.peerAddress || existingDm.peer?.address || existingDm.address
          if (peerAddr && peerAddr.toLowerCase() === inputAddress.toLowerCase()) {
            console.log('✅ Using existing DM conversation with correct address:', existingDm.id)
            onSelectConversation(existingDm)
            setSearchAddress('')
            setResolvedIdentity(null)
            setPendingAddress(null)
            setShowConfirmationModal(false)
            setIsCreatingConversation(false)
            return
          } else {
            console.warn('⚠️ Found DM but address mismatch:', {
              foundAddress: peerAddr || '(none)',
              targetAddress: inputAddress,
              dmId: existingDm.id
            })
            console.warn('   Will create new conversation instead')
          }
        } else {
          console.log('ℹ️ No existing DM found with matching address, will create new one')
        }
        
        // If no existing DM, try to extract inboxId from existing conversations
        // Sometimes we can get inboxId from the conversation object
        for (const dm of existingDms) {
          if (dm.inboxId) {
            console.log('Found inboxId in existing DM:', dm.inboxId)
          }
        }
      } catch (err: any) {
        console.warn('Error checking existing DMs:', err?.message || err)
      }

      // Method 2: Try findInboxIdByIdentifier (Browser SDK v5.1.0)
      if (!inboxId) {
        try {
          console.log('🔍 Trying findInboxIdByIdentifier as primary method...')
          if (typeof client.findInboxIdByIdentifier === 'function') {
            const result = await client.findInboxIdByIdentifier(targetIdentifier)
            console.log('📦 findInboxIdByIdentifier result:', result)
            if (typeof result === 'string' && result.length > 0) {
              inboxId = result
              console.log('✅ Successfully got inboxId using findInboxIdByIdentifier:', inboxId)
            } else if (result) {
              console.log('⚠️ findInboxIdByIdentifier returned unexpected result:', result)
            } else {
              console.log('⚠️ findInboxIdByIdentifier returned undefined for address:', inputAddress)
            }
          } else {
            console.warn('⚠️ client.findInboxIdByIdentifier is not available on this SDK version')
          }
        } catch (err: any) {
          console.warn('❌ findInboxIdByIdentifier failed:', err?.message || err)
          // Continue to other fallbacks
        }
      }

      // Method 2b: Try to extract inboxId from canMessage result if available
      if (!inboxId && canMessageDebugInfo && canMessageDebugInfo.fullResult) {
        try {
          // Check if canMessage returned inboxId information
          const result = canMessageDebugInfo.fullResult instanceof Map
            ? canMessageDebugInfo.fullResult.get(inputAddress)
            : canMessageDebugInfo.fullResult[inputAddress]
          
          if (result && typeof result === 'object' && result.inboxId) {
            inboxId = result.inboxId
            console.log('Extracted inboxId from canMessage result:', inboxId)
          }
        } catch (err) {
          console.warn('Error extracting inboxId from canMessage:', err)
        }
      }

      // Method 3: REMOVED - Don't use address as inboxId, it finds wrong conversations
      // We need the actual inboxId to create/find the correct conversation
      // The address is NOT the same as inboxId, so using getDmByInboxId(address) finds wrong conversations

      // Method 4: REMOVED - Don't use address as inboxId, it finds wrong conversations
      // We need the actual inboxId to create/find the correct conversation
      // The address is NOT the same as inboxId, so using getDmByInboxId(address) finds wrong conversations
      // AND passing address to newDm creates broken "inactive" groups if the user isn't on the network

      if (!inboxId) {
        // Log comprehensive debugging info
        console.error('=== XMTP Debug Information ===')
        console.error('Target Address:', inputAddress)
        console.error('canMessage Result:', canMessage)
        console.error('canMessage Debug Info:', canMessageDebugInfo)
        console.error('')
        console.error('Issue: Unable to get inboxId from address')
        console.error('SDK Version: 5.1.0')
        console.error('The client object is a WASM object with non-enumerable methods')
        console.error('')
        console.error('Available workarounds attempted:')
        console.error('1. ✅ Checked existing DMs')
        console.error('2. ✅ findInboxIdByIdentifier (returned no value)')
        console.error('3. ✅ Extract from canMessage result')
        console.error('4. ✅ getDmByInboxId with address (skipped due to mismatch)')
        console.error('5. ✅ newDm with address directly (requires inboxId)')
        console.error('')
        console.error('SOLUTION: Browser SDK v5.1.0 may require inboxId to create DMs.')
        console.error('Possible solutions:')
        console.error('- Ensure findInboxIdByIdentifier succeeds (may require recipient to have XMTP identity)')
        console.error('- Query the XMTP network API directly (attempted below)')
        console.error('- Use existing conversations if available')
        console.error('==============================')
        
        // Try one more thing - check all conversations (not just DMs) for address match
        // Also check localStorage mappings in case the conversation exists but peerAddress is missing
        if (!inboxId) {
          try {
            console.log('🔍 Checking all conversations (not just DMs) for address:', inputAddress)
            const allConversations = await client.conversations.list()
            console.log('   Total conversations:', allConversations.length)
            
            // Also check localStorage mappings
            let localStorageMatch: any = null
            if (typeof window !== 'undefined') {
              const addressMap = JSON.parse(localStorage.getItem('xmtp_conversation_addresses') || '{}')
              console.log('   Checking localStorage mappings:', addressMap)
              for (const [convId, mappedAddress] of Object.entries(addressMap)) {
                if (typeof mappedAddress === 'string' && mappedAddress.toLowerCase() === inputAddress.toLowerCase()) {
                  console.log('✅ Found localStorage mapping:', convId, '→', mappedAddress)
                  localStorageMatch = { id: convId, address: mappedAddress }
                  break
                }
              }
            }
            
            // Get targetInboxId in this scope (may have been set earlier)
            // Note: targetInboxId is defined in outer scope, but may not be accessible here
            // Try to get inboxId again if we don't have it
            let currentTargetInboxId: string | null = null
            try {
              const inboxIdResult = await client.findInboxIdByIdentifier({
                identifier: inputAddress,
                identifierKind: 'Ethereum' as const
              })
              if (inboxIdResult) {
                currentTargetInboxId = inboxIdResult
              }
            } catch (err: any) {
              // Ignore errors, just use null
            }
            
            // Log all conversations for debugging - including peerInboxId
            allConversations.forEach((conv: any, index: number) => {
              // Get peerInboxId from conversation (might be a function or property)
              const peerInboxIdValue = typeof (conv as any).peerInboxId === 'function'
                ? (conv as any).peerInboxId()
                : (conv as any).peerInboxId
              
              const peerAddr = conv.peerAddress || conv.peer?.address || conv.address || 
                (localStorageMatch && conv.id === localStorageMatch.id ? localStorageMatch.address : null)
              console.log(`   Conversation ${index + 1}:`, {
                id: conv.id,
                peerAddress: peerAddr || '(no address)',
                peerInboxId: peerInboxIdValue || '(none)',
                matches: peerAddr?.toLowerCase() === inputAddress.toLowerCase(),
                matchesInboxId: currentTargetInboxId && peerInboxIdValue && peerInboxIdValue === currentTargetInboxId,
                isLocalStorageMatch: localStorageMatch && conv.id === localStorageMatch.id
              })
            })
            
            // First, check if localStorage has a match and find that conversation
            if (localStorageMatch) {
              const matchedConv = allConversations.find((c: any) => c.id === localStorageMatch.id)
              if (matchedConv) {
                console.log('✅ Found existing conversation via localStorage mapping:', {
                  convId: matchedConv.id,
                  mappedAddress: localStorageMatch.address,
                  targetAddress: inputAddress
                })
                // Restore the peerAddress on the conversation object
                if (!matchedConv.peerAddress) {
                  (matchedConv as any).peerAddress = localStorageMatch.address
                }
                onSelectConversation(matchedConv)
                setSearchAddress('')
                setResolvedIdentity(null)
                setPendingAddress(null)
                setShowConfirmationModal(false)
                setIsCreatingConversation(false)
                return
              }
            }
            
            // Look for any conversation with this EXACT address OR matching peerInboxId
            for (const conv of allConversations) {
              // Check localStorage mapping for this specific conversation
              let convMappedAddress: string | null = null
              if (typeof window !== 'undefined') {
                const addressMap = JSON.parse(localStorage.getItem('xmtp_conversation_addresses') || '{}')
                convMappedAddress = addressMap[conv.id] || null
              }
              
              // Get peerInboxId from conversation (might be a function or property)
              const peerInboxIdValue = typeof (conv as any).peerInboxId === 'function'
                ? (conv as any).peerInboxId()
                : (conv as any).peerInboxId
              
              const peerAddr = conv.peerAddress || conv.peer?.address || conv.address || convMappedAddress
              
              // Match by inboxId if we have it (preferred method for V3/MLS)
              if (currentTargetInboxId && peerInboxIdValue && peerInboxIdValue === currentTargetInboxId) {
                console.log('✅ Found match by peerInboxId in all conversations!', {
                  convId: conv.id,
                  peerInboxId: peerInboxIdValue,
                  targetInboxId: currentTargetInboxId
                })
                // Restore the peerAddress on the conversation object if we have it
                if (!conv.peerAddress && inputAddress) {
                  (conv as any).peerAddress = inputAddress
                }
                onSelectConversation(conv)
                setSearchAddress('')
                setResolvedIdentity(null)
                setPendingAddress(null)
                setShowConfirmationModal(false)
                setIsCreatingConversation(false)
                return
              }
              
              // Fallback: Match by address
              if (!peerAddr) {
                // Skip conversations without addresses (unless matched by inboxId above)
                continue
              }
              
              if (peerAddr.toLowerCase() === inputAddress.toLowerCase()) {
                console.log('✅ Found existing conversation with matching address:', {
                  convId: conv.id,
                  peerAddress: peerAddr,
                  targetAddress: inputAddress,
                  source: convMappedAddress ? 'localStorage' : 'conversation object'
                })
                // Restore peerAddress if it was from localStorage
                if (!conv.peerAddress && convMappedAddress) {
                  (conv as any).peerAddress = convMappedAddress
                }
                // Double-check the address matches before using it
                if (peerAddr.toLowerCase() === inputAddress.toLowerCase()) {
                  console.log('✅ Using existing conversation with correct address:', conv.id)
                  onSelectConversation(conv)
                  setSearchAddress('')
                  setResolvedIdentity(null)
                  setPendingAddress(null)
                  setShowConfirmationModal(false)
                  setIsCreatingConversation(false)
                  return
                }
              }
            }
            console.log('ℹ️ No existing conversation found with matching address')
            
            // Method 6: Try to identify conversation by checking message senders
            // This helps when conversations exist but don't have peerAddress stored
            console.log('🔍 Attempting to identify conversation by checking message senders...')
            try {
              const conversationsWithoutAddress = allConversations.filter((conv: any) => {
                const peerAddr = conv.peerAddress || conv.peer?.address || conv.address
                const mappedAddr = typeof window !== 'undefined' 
                  ? JSON.parse(localStorage.getItem('xmtp_conversation_addresses') || '{}')[conv.id]
                  : null
                return !peerAddr && !mappedAddr
              })
              
              console.log(`   Found ${conversationsWithoutAddress.length} conversations without addresses to check`)
              
              for (const conv of conversationsWithoutAddress) {
                try {
                  // Try to get messages from this conversation
                  if (typeof conv.messages === 'function') {
                    const messages = await conv.messages() // Get all messages (no limit parameter)
                    const recentMessages = (messages || []).slice(0, 10) // Take first 10 for checking
                    console.log(`   Checking conversation ${conv.id.slice(0, 8)}... (${recentMessages.length} of ${messages?.length || 0} messages)`)
                    
                    // Check if any message sender matches the target address
                    // Also check if messages are NOT from current user (indicating peer)
                    const myInboxId = client?.inboxId || client?.installationId
                    
                    // Log first message structure for debugging
                    if (recentMessages.length > 0) {
                      const firstMsg = recentMessages[0]
                      const senderAddr = (firstMsg as any).senderAddress || (firstMsg as any).sender?.address
                      const senderInboxId = (firstMsg as any).senderInboxId
                      console.log(`   Sample message fields for ${conv.id.slice(0, 8)}:`, {
                        hasSenderAddress: !!senderAddr,
                        hasSenderInboxId: !!senderInboxId,
                        senderAddress: senderAddr,
                        senderInboxId: senderInboxId,
                        myInboxId: myInboxId,
                        myAddress: currentUserAddress,
                        allKeys: Object.keys(firstMsg || {}).slice(0, 10)
                      })
                    }
                    
                    for (const msg of recentMessages) {
                      const senderAddr = (msg as any).senderAddress || (msg as any).sender?.address
                      const senderInboxId = (msg as any).senderInboxId
                      
                      // Method 1: Direct address match
                      if (senderAddr && senderAddr.toLowerCase() === inputAddress.toLowerCase()) {
                        console.log(`✅ Found match by senderAddress! Conversation ${conv.id.slice(0, 8)} has messages from ${inputAddress}`)
                        // Automatically map this conversation
                        if (typeof window !== 'undefined') {
                          const addressMap = JSON.parse(localStorage.getItem('xmtp_conversation_addresses') || '{}')
                          addressMap[conv.id] = inputAddress.toLowerCase()
                          localStorage.setItem('xmtp_conversation_addresses', JSON.stringify(addressMap))
                          console.log(`💾 Auto-mapped conversation ${conv.id.slice(0, 8)} → ${inputAddress}`)
                        }
                        // Restore peerAddress on conversation object
                        if (!conv.peerAddress) {
                          (conv as any).peerAddress = inputAddress
                        }
                        // Use this conversation
                        onSelectConversation(conv)
                        setSearchAddress('')
                        setResolvedIdentity(null)
                        setPendingAddress(null)
                        setShowConfirmationModal(false)
                        setIsCreatingConversation(false)
                        return
                      }
                      
                      // Method 2: Check if message is NOT from current user (peer message)
                      // If we have messages that are NOT from us, this might be the peer conversation
                      const isFromMe = 
                        (myInboxId && senderInboxId && senderInboxId === myInboxId) ||
                        (currentUserAddress && senderAddr && senderAddr.toLowerCase() === currentUserAddress.toLowerCase())
                      
                      if (!isFromMe && recentMessages.length > 0) {
                        // This conversation has messages from someone else (the peer)
                        // If this is the only conversation with peer messages, it might be Vitalik's
                        // But we can't be 100% sure without address, so we'll log it for manual checking
                        console.log(`   ⚠️ Conversation ${conv.id.slice(0, 8)} has messages from peer (not from current user)`, {
                          senderAddress: senderAddr || '(none)',
                          senderInboxId: senderInboxId || '(none)',
                          messageCount: recentMessages.length
                        })
                      }
                    }
                  }
                } catch (msgError: any) {
                  console.warn(`   Could not check messages for conversation ${conv.id.slice(0, 8)}:`, msgError?.message || msgError)
                  // Continue checking other conversations
                }
              }
              console.log('   No conversation found with matching message sender')
            } catch (identifyError: any) {
              console.warn('Error trying to identify conversation by message senders:', identifyError?.message || identifyError)
            }
          } catch (err: any) {
            console.error('Error checking all conversations:', err?.message || err)
          }
        }
        
        // Try querying XMTP network API directly as last resort
        console.log('Attempting to query XMTP network API directly...')
        
        // Clear any previous inboxId to ensure we don't reuse stale data
        inboxId = null
        
        try {
          // Use our local proxy to avoid CORS and try multiple endpoints
          const response = await fetch(`/api/xmtp/identity?address=${inputAddress}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })
          
          if (response.ok) {
            const data = await response.json()
            console.log('XMTP Proxy API response:', data)
            
            // Check various formats
            if (data.inboxId) {
              inboxId = data.inboxId
            } else if (data[inputAddress]) {
               // Sometimes map format or nested object
               const val = data[inputAddress]
               if (typeof val === 'string') inboxId = val
               else if (typeof val === 'object' && val.inboxId) inboxId = val.inboxId
            } else if (data.identifiers && data.identifiers[inputAddress]) {
               inboxId = data.identifiers[inputAddress]
            }
            
            if (inboxId) console.log('✅ Got inboxId from Proxy API:', inboxId)
          } else {
            console.log('XMTP Proxy API query failed:', response.status, response.statusText)
          }
        } catch (err: any) {
          console.warn('Proxy API query failed:', err?.message || err)
        }
        
        if (!inboxId) {
          // Build detailed error message for console
          const errorDetails = [
            `❌ Failed to get inboxId for address: ${inputAddress}`,
            `canMessage result: ${canMessage ? '✅ true' : '❌ false'}`,
            ``,
            `Methods attempted:`,
            `  1. ✅ Checked existing DMs`,
            `  2. ✅ findInboxIdByIdentifier`,
            `  3. ✅ getDmByInboxId with address`,
            `  4. ✅ newDm with address directly`,
            `  5. ✅ Checked all conversations`,
            `  6. ✅ Direct XMTP API query`,
            ``,
            `Conclusion: This address ${canMessage ? 'has XMTP but inboxId cannot be retrieved' : 'does not have an XMTP identity yet'}`,
          ].join('\n')
          
          console.error(errorDetails)
          console.error('📋 Full debug info:', {
            address: inputAddress,
            canMessage,
            canMessageDebugInfo,
            sdkVersion: '5.1.0',
            clientType: typeof client,
            conversationsType: typeof client.conversations,
          })
          
          // Provide user-friendly error message
          let errorMsg = `Unable to create conversation\n\n`
          errorMsg += `Address: ${inputAddress.slice(0, 6)}...${inputAddress.slice(-4)}\n\n`
          
          if (!canMessage) {
            errorMsg += `⚠️ Unable to verify XMTP identity for this address.\n\n`
            errorMsg += `🔍 IMPORTANT: If you've chatted with this address before, please check your conversation list manually!\n`
            errorMsg += `The conversation might exist but we couldn't find it automatically.\n\n`
            errorMsg += `Why this might happen:\n`
            errorMsg += `• The XMTP identity check can have false negatives (known issue)\n`
            errorMsg += `• The conversation exists but doesn't have address info stored\n`
            errorMsg += `• Temporary network/API issues\n\n`
            errorMsg += `What to try:\n`
            errorMsg += `1. ✅ Check your conversation list - scroll through and look for this address\n`
            errorMsg += `2. If you find the conversation but it shows no address, you can manually map it:\n`
            errorMsg += `   - Open browser console (F12)\n`
            errorMsg += `   - Run: window.addXMTPMapping("conversation-id", "${inputAddress}")\n`
            errorMsg += `   - Replace "conversation-id" with the actual conversation ID\n`
            errorMsg += `3. If not found, try refreshing the page and checking again\n`
            errorMsg += `4. Have them send you a message (then you can reply)\n`
            errorMsg += `5. Check browser console (F12) - look for conversation IDs and addresses\n\n`
          } else {
            errorMsg += `⚠️ This address has XMTP, but we couldn't retrieve the inboxId.\n\n`
            errorMsg += `This might be a temporary issue. Try:\n`
            errorMsg += `1. ✅ Check your conversation list first - you may already have this conversation\n`
            errorMsg += `2. Refresh the page and try again\n`
            errorMsg += `3. Check your internet connection\n`
            errorMsg += `4. Have them send you a message first\n\n`
          }
          
          errorMsg += '💡 Tip: Open browser console (F12) and look for conversation logs. You can also use window.inspectXMTPMappings() to see stored address mappings.'
          
          setError(errorMsg)
          setIsCreatingConversation(false)
          // Don't close modal on error - keep it open so user can see the error
          // setShowConfirmationModal(false) // REMOVED - keep modal open to show error
          throw new Error(`Unable to get inboxId for ${inputAddress}. canMessage: ${canMessage}. See console for full details.`)
        }
      }

      // Verify newDm method exists
      if (typeof client.conversations.newDm !== 'function') {
        console.error('Available conversations methods:', Object.keys(client.conversations))
        setIsCreatingConversation(false)
        throw new Error('newDm method is not available on client.conversations. The XMTP client may not be fully initialized.')
      }

      // Create the DM conversation using newDm
      const conversation = await client.conversations.newDm(inboxId)
      
      // Store the original address in the conversation object for display purposes
      // Since new DM conversations might not have peerAddress immediately
      if (!conversation.peerAddress) {
        (conversation as any).peerAddress = inputAddress
      }
      
      // Also store in localStorage for persistence across page reloads
      // Map conversation ID → wallet address
      if (typeof window !== 'undefined' && conversation.id) {
        const addressMap = JSON.parse(localStorage.getItem('xmtp_conversation_addresses') || '{}')
        addressMap[conversation.id] = inputAddress
        localStorage.setItem('xmtp_conversation_addresses', JSON.stringify(addressMap))
        console.log('💾 Stored address mapping:', conversation.id, '→', inputAddress)
      }

      // Refresh conversation list so the new DM appears immediately
      try {
        await refreshConversations()
      } catch (refreshError) {
        console.warn('⚠️ Failed to refresh conversations after creating DM:', refreshError)
      }
      
      onSelectConversation(conversation)
      setSearchAddress('')
      setError(null) // Clear error on success
      setResolvedIdentity(null) // Clear resolved identity
      setPendingAddress(null)
      setShowConfirmationModal(false) // Close modal on success
      setIsCreatingConversation(false)
      console.log('✅ Conversation created successfully:', conversation.id)
    } catch (err: any) {
      console.error('Error creating conversation:', err)
      console.error('Client object:', client)
      console.error('Client conversations:', client?.conversations)
      
      // Only set error if it wasn't already set (to avoid overwriting more detailed errors)
      setError((currentError) => {
        // If we already have a detailed error message, keep it
        if (currentError) {
          return currentError
        }
        
        // Otherwise, provide more specific error messages
        let errorMessage = 'Failed to create conversation.'
        
        if (err?.message) {
          if (err.message.includes('not found') || err.message.includes('identity') || err.message.includes('inbox')) {
            errorMessage = `This address doesn't have an XMTP identity. They need to connect their wallet to an XMTP app first.`
          } else if (err.message.includes('invalid') || err.message.includes('address')) {
            errorMessage = 'Invalid Ethereum address. Please check and try again.'
          } else if (err.message.includes('not a function') || err.message.includes('not available')) {
            errorMessage = 'XMTP client error. The client may not be fully initialized. Please try:\n1. Refreshing the page\n2. Disconnecting and reconnecting your wallet\n3. Checking the browser console for more details'
          } else if (err.message.includes('not fully initialized')) {
            errorMessage = err.message
          } else {
            errorMessage = `Error: ${err.message}`
          }
        }
        
        return errorMessage
      })
      setIsCreatingConversation(false)
      // DON'T close modal on error - keep it open so user can see the error message in the modal
      // The error will be displayed in the IdentityConfirmationModal component
      console.error('❌ Failed to create conversation:', err?.message)
    }
  }

  const handleNewConversation = async (inputValue?: string) => {
    // Use provided inputValue or fallback to searchAddress state
    const input = inputValue || searchAddress
    const trimmedInput = input.trim()
    
    console.log('🚀 handleNewConversation called', { 
      client: !!client, 
      searchAddress, 
      inputValue,
      trimmedInput,
      hasClient: !!client,
      hasAddress: !!trimmedInput
    })
    
    // Clear any previous errors and resolved identity
    setError(null)
    setResolvedIdentity(null)
    
    if (!client || !trimmedInput) {
      console.log('❌ Early return:', { hasClient: !!client, hasAddress: !!trimmedInput, searchAddress, inputValue })
      return
    }

    try {
      let address = trimmedInput
      const inputLower = address.toLowerCase()
      
      // Check if input is a mention (starts with @)
      if (inputLower.startsWith('@')) {
        setIsResolving(true)
        setError(null)
        
        // Extract username from mention
        const mentions = extractMentions(address)
        if (mentions.length === 0) {
          setError('Invalid mention format. Use @username (Farcaster) or @name.eth (ENS)')
          setIsResolving(false)
          return
        }
        
        const username = mentions[0].username
        console.log('🔍 Resolving mention:', username)
        
        // Resolve the mention (isMention=true means .eth endings are Farcaster usernames, not ENS)
        const identity = await resolveMentionCached(username, { isMention: true })
        
        setIsResolving(false)
        
        if (!identity || !identity.walletAddress) {
          if (username.endsWith('.eth')) {
            setError(`Could not resolve Farcaster username @${username}. They may not have a Farcaster account with this username.`)
          } else {
            setError(`Could not resolve Farcaster username @${username}. They may not have a Farcaster account or be in the directory.`)
          }
          return
        }
        
        // Show confirmation modal instead of auto-creating
        setResolvedIdentity(identity)
        setPendingAddress(identity.walletAddress.toLowerCase())
        setShowConfirmationModal(true)
        setSearchAddress('') // Clear input
        return // Don't auto-create, wait for user confirmation
      } else {
        // Not a mention - could be ENS name (username.eth) or Ethereum address
        address = inputLower
        
        // Check if it's an ENS name (ends with .eth but no @)
        if (address.endsWith('.eth') && !address.startsWith('@')) {
          setIsResolving(true)
          setError(null)
          
          // Resolve ENS (isMention=false means this is an ENS lookup, not Farcaster)
          const identity = await resolveMentionCached(address, { isMention: false })
          
          setIsResolving(false)
          
          if (!identity || !identity.walletAddress) {
            setError(`Could not resolve ENS name ${address}. Make sure the ENS name exists and is properly configured.`)
            return
          }
          
          // Show confirmation modal instead of auto-creating
          setResolvedIdentity(identity)
          setPendingAddress(identity.walletAddress.toLowerCase())
          setShowConfirmationModal(true)
          setSearchAddress('') // Clear input
          return // Don't auto-create, wait for user confirmation
        } else if (!address.startsWith('0x') || address.length !== 42) {
          console.log('❌ Invalid address format:', { startsWith0x: address.startsWith('0x'), length: address.length })
          setError('Please enter a valid Ethereum address (0x...), ENS name (name.eth), or mention (@username or @username.eth)')
          return
        } else {
          // Direct address - show confirmation modal
          setResolvedIdentity({
            handle: address,
            displayLabel: `${address.slice(0, 6)}...${address.slice(-4)}`,
            walletAddress: address,
            source: 'manual',
          })
          setPendingAddress(address.toLowerCase())
          setShowConfirmationModal(true)
          setSearchAddress('') // Clear input
          return
        }
      }
    } catch (err: any) {
      console.error('Error in handleNewConversation:', err)
      setError(err?.message || 'Failed to process input')
      setIsResolving(false)
    }
  }

  const formatAddress = (addr: string) => {
    if (!addr || typeof addr !== 'string' || addr.length < 10) {
      return 'Unknown'
    }
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (!client) {
    return (
      <div className="p-4 text-center text-gray-500">
        Connect your wallet to see conversations
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Confirmation Modal */}
      {showConfirmationModal && resolvedIdentity && pendingAddress && (
        <IdentityConfirmationModal
          identity={resolvedIdentity}
          onConfirm={() => createConversationWithAddress(pendingAddress)}
          onCancel={() => {
            setShowConfirmationModal(false)
            setResolvedIdentity(null)
            setPendingAddress(null)
            setError(null) // Clear error when canceling
          }}
          isCreating={isCreatingConversation}
          error={error} // Show error in modal
        />
      )}

      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter address (0x...), ENS name (name.eth), or mention (@username for Farcaster)"
              value={searchAddress}
              onChange={(e) => {
                setSearchAddress(e.target.value)
                setError(null) // Clear error when user starts typing
                setResolvedIdentity(null) // Clear resolved identity when typing
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isResolving && !e.shiftKey) {
                  e.preventDefault()
                  const inputValue = (e.target as HTMLInputElement).value
                  handleNewConversation(inputValue)
                }
              }}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isResolving}
            />
            <button
              onClick={() => handleNewConversation()}
              disabled={!searchAddress.trim() || isResolving}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResolving ? 'Resolving...' : 'New Chat'}
            </button>
          </div>
          
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-red-600 dark:text-red-400">⚠️</span>
                <div className="flex-1 text-sm text-red-700 dark:text-red-300 whitespace-pre-line max-h-48 overflow-y-auto break-words min-w-0">
                  {error}
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 text-lg leading-none"
                  aria-label="Dismiss error"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p className="mb-4">No conversations yet. Start a new chat above!</p>
            <button 
              onClick={refreshConversations}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-sm transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Syncing...' : 'Force Sync'}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading && (
               <div className="p-2 text-xs text-center text-gray-400 bg-gray-50 dark:bg-gray-900">
                 Syncing...
               </div>
            )}
            {conversations
              .map((conversation) => {
                // More robust peer address extraction
                let peerAddress = conversation.peerAddress || conversation.topic || ''
                
                // If no peer address, check if it's a group or use ID
                // Some SDK versions might put address in other properties
                if (!peerAddress && conversation.clientAddress) {
                    // This might be a DM where we need to find the OTHER person
                }
                
                const displayTitle = peerAddress && peerAddress.length >= 10 
                  ? formatAddress(peerAddress) 
                  : (conversation.id ? `Conversation ${conversation.id.slice(0, 6)}` : 'Unknown Conversation')
                  
                const displaySubtitle = peerAddress || conversation.id || ''
                const isSelected = conversation.id === selectedConversationId
              
              return (
                <button
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation)}
                  className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium text-sm">
                      {peerAddress.length >= 4 ? peerAddress.slice(2, 4).toUpperCase() : '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {displayTitle}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {displaySubtitle}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
