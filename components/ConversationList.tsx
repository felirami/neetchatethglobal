'use client'

import { useEffect, useState } from 'react'
import { useXMTP } from '@/contexts/XMTPContext'
import { useIdentity } from '@/contexts/IdentityContext'
import { resolveMention, ResolvedIdentity } from '@/lib/identity/resolve'
import { extractMentions } from '@/lib/mentions'
import { IdentityConfirmationModal } from '@/components/IdentityConfirmationModal'

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
      const allConversations = await client.conversations.list()
      console.log('📋 Found', allConversations.length, 'total conversations (all consent states)')

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

      setConversations(uniqueConversations)
    } catch (err: any) {
      console.error('Error refreshing conversations:', err)
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
      
      try {
        console.log('🔍 Checking canMessage for address:', inputAddress)
        const canMessageResult = await Client.canMessage([
          { identifier: inputAddress, identifierKind: 'Ethereum' }
        ])
        
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
        
        // Log all existing DMs for debugging
        existingDms.forEach((dm: any, index: number) => {
          const peerAddr = dm.peerAddress || dm.peer?.address || dm.address
          console.log(`   DM ${index + 1}:`, {
            id: dm.id,
            peerAddress: peerAddr || '(no address)',
            matches: peerAddr?.toLowerCase() === inputAddress.toLowerCase()
          })
        })
        
        const existingDm = existingDms.find((dm: any) => {
          const peerAddr = dm.peerAddress || dm.peer?.address || dm.address
          if (!peerAddr) {
            // Skip DMs without addresses - they can't match
            return false
          }
          const matches = peerAddr.toLowerCase() === inputAddress.toLowerCase()
          if (matches) {
            console.log('✅ Found existing DM with matching address:', {
              dmId: dm.id,
              peerAddress: peerAddr,
              targetAddress: inputAddress
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

      // Method 2: Try getInboxIdByIdentities (plural) - Browser SDK v5.1.0
      // According to XMTP docs, Browser SDK uses getInboxIdByIdentities (plural)
      // WASM methods aren't enumerable, so we MUST call directly without typeof checks
      if (!inboxId) {
        try {
          console.log('🔍 Method 2: Attempting getInboxIdByIdentities (plural)...')
          console.log('   Address:', inputAddress)
          console.log('   Client type:', typeof client)
          console.log('   Client has getInboxIdByIdentities:', 'getInboxIdByIdentities' in client)
          
          // Call directly - WASM methods exist but aren't enumerable
          const result = await client.getInboxIdByIdentities([
            { identifier: inputAddress, identifierKind: 'Ethereum' }
          ])
          
          console.log('📦 getInboxIdByIdentities result:', result)
          console.log('📦 Result type:', typeof result)
          console.log('📦 Result is Map:', result instanceof Map)
          console.log('📦 Result is Array:', Array.isArray(result))
          console.log('📦 Result constructor:', result?.constructor?.name)
          
          // Result can be a Map or array
          if (result instanceof Map) {
            inboxId = result.get(inputAddress) || result.get(inputAddress.toLowerCase()) || null
            if (inboxId) {
              console.log('✅ Extracted inboxId from Map:', inboxId)
            } else {
              console.log('⚠️ Map exists but no inboxId found for address')
              console.log('   Map keys:', Array.from(result.keys()))
              console.log('   Map entries:', Array.from(result.entries()))
            }
          } else if (Array.isArray(result) && result.length > 0) {
            // If array, first element might be the inboxId
            inboxId = result[0]
            console.log('✅ Extracted inboxId from Array:', inboxId)
          } else if (typeof result === 'string' && result.length > 0) {
            inboxId = result
            console.log('✅ Result is string (inboxId):', inboxId)
          } else if (result && typeof result === 'object') {
            // Try to extract from object
            const keys = Object.keys(result)
            console.log('📋 Result object keys:', keys)
            if (keys.length > 0) {
              inboxId = (result as any)[keys[0]] || null
              console.log('✅ Extracted inboxId from object:', inboxId)
            }
          } else {
            console.log('⚠️ getInboxIdByIdentities returned unexpected format:', result)
          }
        } catch (err: any) {
          console.error('❌ getInboxIdByIdentities failed:', err)
          console.error('   Error message:', err?.message)
          console.error('   Error stack:', err?.stack)
          // Method might not exist or address might not have XMTP identity
        }
      }

      // Method 2b: Try getInboxIdByIdentifier (singular) as fallback
      if (!inboxId) {
        try {
          console.log('🔍 Trying getInboxIdByIdentifier (singular) as fallback...')
          const result = await client.getInboxIdByIdentifier({
            identifier: inputAddress,
            identifierKind: 'Ethereum',
          })
          
          console.log('📦 getInboxIdByIdentifier result:', result)
          
          if (result && typeof result === 'string' && result.length > 0) {
            inboxId = result
            console.log('✅ Successfully got inboxId using getInboxIdByIdentifier:', inboxId)
          } else {
            console.log('⚠️ getInboxIdByIdentifier returned unexpected result:', result)
          }
        } catch (err: any) {
          console.warn('❌ getInboxIdByIdentifier failed:', err?.message || err)
          // Method might not exist in this SDK version
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

      // Method 4: Try creating DM directly with address (some SDK versions might support this)
      if (!inboxId) {
        console.log('Attempting to create DM directly with address...')
        try {
          // Try newDm with address directly - this might work in some SDK versions
          const testConversation = await client.conversations.newDm(inputAddress as any)
          if (testConversation) {
            console.log('✅ Successfully created DM with address directly!')
            onSelectConversation(testConversation)
            setSearchAddress('')
            setResolvedIdentity(null)
            setPendingAddress(null)
            setShowConfirmationModal(false)
            setIsCreatingConversation(false)
            return
          }
        } catch (err: any) {
          console.log('newDm with address failed:', err?.message || err)
          // If error mentions inboxId, we know we need the actual inboxId
          if (err?.message?.includes('inboxId') || err?.message?.includes('inbox')) {
            console.log('Error confirms we need inboxId, not address')
          }
        }
      }

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
        console.error('2. ❌ getInboxIdByIdentifier (tried but may not be available or failed)')
        console.error('3. ❌ Extract from canMessage result (no inboxId found)')
        console.error('4. ❌ getDmByInboxId with address (failed)')
        console.error('5. ❌ newDm with address directly (failed)')
        console.error('')
        console.error('SOLUTION: Browser SDK v5.1.0 may require inboxId to create DMs.')
        console.error('Possible solutions:')
        console.error('- Check if getInboxIdByIdentifier exists but needs different parameters')
        console.error('- Query the XMTP network API directly (attempted below)')
        console.error('- Use existing conversations if available')
        console.error('==============================')
        
        // Try one more thing - check all conversations (not just DMs)
        // Only do this if we still don't have an inboxId and need to find existing conversation
        if (!inboxId) {
          try {
            console.log('🔍 Checking all conversations (not just DMs) for address:', inputAddress)
            const allConversations = await client.conversations.list()
            console.log('   Total conversations:', allConversations.length)
            
            // Log all conversations for debugging
            allConversations.forEach((conv: any, index: number) => {
              const peerAddr = conv.peerAddress || conv.peer?.address || conv.address
              console.log(`   Conversation ${index + 1}:`, {
                id: conv.id,
                peerAddress: peerAddr || '(no address)',
                matches: peerAddr?.toLowerCase() === inputAddress.toLowerCase()
              })
            })
            
            // Look for any conversation with this EXACT address
            for (const conv of allConversations) {
              const peerAddr = conv.peerAddress || conv.peer?.address || conv.address
              if (!peerAddr) {
                // Skip conversations without addresses
                continue
              }
              if (peerAddr.toLowerCase() === inputAddress.toLowerCase()) {
                console.log('✅ Found existing conversation with matching address:', {
                  convId: conv.id,
                  peerAddress: peerAddr,
                  targetAddress: inputAddress
                })
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
          } catch (err: any) {
            console.error('Error checking all conversations:', err?.message || err)
          }
        }
        
        // Try querying XMTP network API directly as last resort
        console.log('Attempting to query XMTP network API directly...')
        try {
          // XMTP production API endpoint for identity lookup
          const apiUrl = 'https://production.xmtp.network/v1/identities'
          const response = await fetch(`${apiUrl}?address=${inputAddress}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })
          
          if (response.ok) {
            const data = await response.json()
            console.log('XMTP API response:', data)
            if (data.inboxId) {
              inboxId = data.inboxId
              console.log('Got inboxId from XMTP API:', inboxId)
            }
          } else {
            console.log('XMTP API query failed:', response.status, response.statusText)
          }
        } catch (err: any) {
          console.warn('Direct API query failed (CORS or network issue):', err?.message || err)
        }
        
        if (!inboxId) {
          // Build detailed error message for console
          const errorDetails = [
            `❌ Failed to get inboxId for address: ${inputAddress}`,
            `canMessage result: ${canMessage ? '✅ true' : '❌ false'}`,
            ``,
            `Methods attempted:`,
            `  1. ✅ Checked existing DMs`,
            `  2. ${canMessageDebugInfo ? '✅' : '❌'} getInboxIdByIdentities (plural)`,
            `  3. ✅ getInboxIdByIdentifier (singular)`,
            `  4. ✅ getDmByInboxId with address`,
            `  5. ✅ newDm with address directly`,
            `  6. ✅ Checked all conversations`,
            `  7. ✅ Direct XMTP API query`,
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
            errorMsg += `❌ This address doesn't have an XMTP identity yet.\n\n`
            errorMsg += `What this means:\n`
            errorMsg += `• They haven't connected their wallet to an XMTP app\n`
            errorMsg += `• They need to initialize their XMTP identity first\n\n`
            errorMsg += `What you can do:\n`
            errorMsg += `1. Ask them to connect to an XMTP app (like Converse, Coinbase Wallet, etc.)\n`
            errorMsg += `2. Have them send you a message first (then you can reply)\n`
            errorMsg += `3. Try a different address that has XMTP\n\n`
          } else {
            errorMsg += `⚠️ This address has XMTP, but we couldn't retrieve the inboxId.\n\n`
            errorMsg += `This might be a temporary issue. Try:\n`
            errorMsg += `1. Refreshing the page and trying again\n`
            errorMsg += `2. Checking your internet connection\n`
            errorMsg += `3. Having them send you a message first\n\n`
          }
          
          errorMsg += `💡 Tip: Open browser console (F12) for detailed debugging information.`
          
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
