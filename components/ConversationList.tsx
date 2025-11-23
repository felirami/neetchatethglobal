'use client'

import { useEffect, useState } from 'react'
import { useXMTP } from '@/contexts/XMTPContext'
import { useIdentity } from '@/contexts/IdentityContext'
import { resolveMention } from '@/lib/identity/resolve'
import { extractMentions } from '@/lib/mentions'

// Define Conversation type locally
type Conversation = any

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
  const [resolvedIdentity, setResolvedIdentity] = useState<{ displayLabel: string; address: string; source: string } | null>(null)

  const refreshConversations = async () => {
    if (!client) return

    setIsLoading(true)
    try {
      // First, sync conversations from the network to populate the local database
      console.log('🔄 Syncing conversations from network...')
      try {
        if (typeof client.conversations?.sync === 'function') {
          await client.conversations.sync()
          console.log('✅ Conversations synced from network')
        } else if (typeof client.conversations?.syncAll === 'function') {
          // Use syncAll as fallback - it syncs conversations, messages, and preferences
          await client.conversations.syncAll(['allowed', 'unknown'])
          console.log('✅ SyncAll completed')
        } else {
          console.warn('⚠️ No sync method available, only loading from local database')
        }
      } catch (syncError: any) {
        console.warn('⚠️ Error syncing conversations (will try to load from local database):', syncError?.message)
        // Continue to load from local database even if sync fails
      }

      // Then, list conversations from the local database (which should now include synced conversations)
      // Try listDms first to get DMs, then fall back to list for all conversations
      let allConversations: any[] = []
      
      try {
        // Try listing DMs with all consent states to ensure we get everything
        if (typeof client.conversations?.listDms === 'function') {
          const { ConsentState } = await import('@xmtp/browser-sdk')
          // List DMs with all consent states (allowed, unknown, denied) to catch everything
          const dms = await client.conversations.listDms({
            consentStates: [ConsentState.Allowed, ConsentState.Unknown, ConsentState.Denied]
          })
          console.log(`📋 Found ${dms?.length || 0} DMs (all consent states)`)
          allConversations = [...allConversations, ...(dms || [])]
        }
      } catch (dmError: any) {
        console.warn('Error listing DMs:', dmError?.message)
        // Fallback: try without consent states filter
        try {
          if (typeof client.conversations?.listDms === 'function') {
            const dms = await client.conversations.listDms()
            console.log(`📋 Found ${dms?.length || 0} DMs (no filter)`)
            allConversations = [...allConversations, ...(dms || [])]
          }
        } catch (e: any) {
          console.warn('Error listing DMs (fallback):', e?.message)
        }
      }
      
      try {
        // Try listing all conversations with all consent states
        if (typeof client.conversations?.list === 'function') {
          const { ConsentState } = await import('@xmtp/browser-sdk')
          // List conversations with all consent states
          const conversations = await client.conversations.list({
            consentStates: [ConsentState.Allowed, ConsentState.Unknown, ConsentState.Denied]
          })
          console.log(`📋 Found ${conversations?.length || 0} total conversations (all consent states)`)
          // Merge with DMs, avoiding duplicates
          const existingIds = new Set(allConversations.map(c => c.id))
          const newConversations = (conversations || []).filter(c => !existingIds.has(c.id))
          allConversations = [...allConversations, ...newConversations]
        }
      } catch (listError: any) {
        console.warn('Error listing conversations:', listError?.message)
        // Fallback: try without consent states filter
        try {
          if (typeof client.conversations?.list === 'function') {
            const conversations = await client.conversations.list()
            console.log(`📋 Found ${conversations?.length || 0} total conversations (no filter)`)
            const existingIds = new Set(allConversations.map(c => c.id))
            const newConversations = (conversations || []).filter(c => !existingIds.has(c.id))
            allConversations = [...allConversations, ...newConversations]
          }
        } catch (e: any) {
          console.warn('Error listing conversations (fallback):', e?.message)
        }
      }
      
      console.log(`📋 Total loaded: ${allConversations.length} conversations from local database`)
      setConversations(allConversations)
      
      // Debug: Check for forked conversations
      const forkedConversations = allConversations.filter((c: any) => c.isCommitLogForked)
      if (forkedConversations.length > 0) {
        console.warn(`⚠️ Found ${forkedConversations.length} forked conversation(s)`)
        forkedConversations.forEach((conv: any) => {
          console.warn(`Forked conversation: ${conv.id}`, conv)
        })
      }
    } catch (error: any) {
      console.error('Error loading conversations:', error)
      setConversations([])
      // Show user-friendly error
      if (error?.message?.includes('not a function')) {
        console.error('XMTP client may not be fully initialized. Try reconnecting your wallet.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!client) return

    refreshConversations()

    // Stream new conversations
    const streamConversations = async () => {
      try {
        if (typeof client.conversations?.stream !== 'function') {
          console.error('client.conversations.stream is not a function')
          return
        }
        for await (const conversation of await client.conversations.stream()) {
          console.log('📨 New conversation streamed:', conversation.id)
          setConversations((prev) => {
            if (!prev.find((c) => c.id === conversation.id)) {
              console.log('✅ Adding new conversation to list')
              return [conversation, ...prev]
            }
            return prev
          })
        }
      } catch (error: any) {
        console.error('Error streaming conversations:', error)
        // Don't show alert for streaming errors, just log them
      }
    }

    streamConversations()

    // Periodically re-sync and re-list conversations to catch any that might have been missed
    // This is especially important after welcome messages are processed
    const periodicSync = setInterval(async () => {
      if (!client) return
      
      try {
        console.log('🔄 Periodic sync: syncing conversations...')
        if (typeof client.conversations?.sync === 'function') {
          await client.conversations.sync()
        }
        
        // Re-list conversations after sync
        let allConversations: any[] = []
        
        try {
          if (typeof client.conversations?.listDms === 'function') {
            const dms = await client.conversations.listDms()
            allConversations = [...allConversations, ...(dms || [])]
          }
        } catch (dmError: any) {
          console.warn('Error listing DMs in periodic sync:', dmError?.message)
        }
        
        try {
          if (typeof client.conversations?.list === 'function') {
            const conversations = await client.conversations.list()
            const existingIds = new Set(allConversations.map(c => c.id))
            const newConversations = (conversations || []).filter(c => !existingIds.has(c.id))
            allConversations = [...allConversations, ...newConversations]
          }
        } catch (listError: any) {
          console.warn('Error listing conversations in periodic sync:', listError?.message)
        }
        
        if (allConversations.length > 0) {
          console.log(`📋 Periodic sync: Found ${allConversations.length} conversations`)
          setConversations(allConversations)
        }
      } catch (error: any) {
        console.warn('Error in periodic sync:', error?.message)
      }
    }, 10000) // Sync every 10 seconds

    return () => {
      clearInterval(periodicSync)
    }
  }, [client])

  const handleNewConversation = async () => {
    console.log('🚀 handleNewConversation called', { client: !!client, searchAddress, trimmed: searchAddress.trim() })
    
    // Clear any previous errors and resolved identity
    setError(null)
    setResolvedIdentity(null)
    
    if (!client || !searchAddress.trim()) {
      console.log('❌ Early return:', { hasClient: !!client, hasAddress: !!searchAddress.trim() })
      return
    }

    try {
      let address = searchAddress.trim()
      const inputLower = address.toLowerCase()
      
      // Check if input is a mention (starts with @)
      if (inputLower.startsWith('@')) {
        setIsResolving(true)
        setError(null)
        
        // Extract username from mention
        const mentions = extractMentions(address)
        if (mentions.length === 0) {
          setError('Invalid mention format. Use @username, @name.eth, or @agent')
          setIsResolving(false)
          return
        }
        
        const username = mentions[0].username
        console.log('🔍 Resolving mention:', username)
        
        // Resolve the mention
        const identity = await resolveMentionCached(username)
        
        setIsResolving(false)
        
        if (!identity || !identity.walletAddress) {
          setError(`Could not resolve @${username}. They may not have a Farcaster account, ENS name, or be in the directory.`)
          return
        }
        
        // Show resolved identity
        setResolvedIdentity({
          displayLabel: identity.displayLabel,
          address: identity.walletAddress,
          source: identity.source,
        })
        
        address = identity.walletAddress.toLowerCase()
        console.log('✅ Resolved mention:', { username, address, source: identity.source })
      } else {
        // Not a mention, validate as Ethereum address
        address = inputLower
        
        if (!address.startsWith('0x') || address.length !== 42) {
          console.log('❌ Invalid address format:', { startsWith0x: address.startsWith('0x'), length: address.length })
          setError('Please enter a valid Ethereum address (must start with 0x and be 42 characters) or a mention like @username, @name.eth, or @agent')
          return
        }
      }
      
      console.log('📍 Processing address:', address)

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
        console.log('🔍 Checking canMessage for address:', address)
        const canMessageResult = await Client.canMessage([
          { identifier: address, identifierKind: 'Ethereum' }
        ])
        
        // Log full response for debugging
        console.log('📦 canMessage result:', canMessageResult)
        console.log('📦 canMessage result type:', typeof canMessageResult)
        console.log('📦 canMessage result instanceof Map:', canMessageResult instanceof Map)
        
        // Try multiple ways to get the result
        if (canMessageResult instanceof Map) {
          canMessage = canMessageResult.get(address) === true || canMessageResult.get(address.toLowerCase()) === true
          const allEntries = Array.from(canMessageResult.entries())
          canMessageDebugInfo = {
            mapSize: canMessageResult.size,
            allEntries: allEntries,
            addressKey: address,
            result: canMessageResult.get(address) || canMessageResult.get(address.toLowerCase()),
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
          canMessage = (canMessageResult as any)[address] === true || (canMessageResult as any)[address.toLowerCase()] === true
          const resultValue = (canMessageResult as any)[address] || (canMessageResult as any)[address.toLowerCase()]
          canMessageDebugInfo = {
            type: 'object',
            keys: Object.keys(canMessageResult),
            addressKey: address,
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
          address,
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
          address,
          debugInfo: canMessageDebugInfo
        })
      }

      // Get inboxId from the address
      // Browser SDK v5.1.0 - checking if getInboxIdByIdentifier is available
      let inboxId: string | null = null
      
      // Method 1: Check if DM already exists (this will give us the inboxId if found)
      try {
        const existingDms = await client.conversations.listDms()
        console.log('Existing DMs:', existingDms.length)
        
        const existingDm = existingDms.find((dm: any) => {
          const peerAddr = dm.peerAddress || dm.peer?.address || dm.address || dm.peerAddress
          const matches = peerAddr?.toLowerCase() === address.toLowerCase()
          if (matches) {
            console.log('Found existing DM:', dm)
          }
          return matches
        })
        
        if (existingDm) {
          console.log('Using existing DM conversation')
          onSelectConversation(existingDm)
          setSearchAddress('')
          return
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
          console.log('   Address:', address)
          console.log('   Client type:', typeof client)
          console.log('   Client has getInboxIdByIdentities:', 'getInboxIdByIdentities' in client)
          
          // Call directly - WASM methods exist but aren't enumerable
          const result = await client.getInboxIdByIdentities([
            { identifier: address, identifierKind: 'Ethereum' }
          ])
          
          console.log('📦 getInboxIdByIdentities result:', result)
          console.log('📦 Result type:', typeof result)
          console.log('📦 Result is Map:', result instanceof Map)
          console.log('📦 Result is Array:', Array.isArray(result))
          console.log('📦 Result constructor:', result?.constructor?.name)
          
          // Result can be a Map or array
          if (result instanceof Map) {
            inboxId = result.get(address) || result.get(address.toLowerCase()) || null
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
            identifier: address,
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
            ? canMessageDebugInfo.fullResult.get(address)
            : canMessageDebugInfo.fullResult[address]
          
          if (result && typeof result === 'object' && result.inboxId) {
            inboxId = result.inboxId
            console.log('Extracted inboxId from canMessage result:', inboxId)
          }
        } catch (err) {
          console.warn('Error extracting inboxId from canMessage:', err)
        }
      }

      // Method 3: Try using getDmByInboxId with address as inboxId (might work in some cases)
      // This is a workaround - normally we'd need the actual inboxId
      if (!inboxId) {
        console.log('Attempting workaround: trying address as inboxId...')
        try {
          // Some SDK versions might accept address directly
          // This is a long shot but worth trying
          const testDm = await client.conversations.getDmByInboxId(address)
          if (testDm) {
            console.log('Found DM using address as inboxId!')
            onSelectConversation(testDm)
            setSearchAddress('')
            return
          }
        } catch (err: any) {
          console.log('getDmByInboxId with address failed (expected):', err?.message || err)
        }
      }

      // Method 4: Try creating DM directly with address (some SDK versions might support this)
      if (!inboxId) {
        console.log('Attempting to create DM directly with address...')
        try {
          // Try newDm with address directly - this might work in some SDK versions
          const testConversation = await client.conversations.newDm(address as any)
          if (testConversation) {
            console.log('Successfully created DM with address directly!')
            onSelectConversation(testConversation)
            setSearchAddress('')
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
        console.error('Target Address:', address)
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
        try {
          console.log('Attempting to find conversation from all conversations...')
          const allConversations = await client.conversations.list()
          console.log('Found all conversations:', allConversations.length)
          
          // Look for any conversation with this address
          for (const conv of allConversations) {
            const peerAddr = conv.peerAddress || conv.peer?.address || conv.address
            if (peerAddr?.toLowerCase() === address.toLowerCase()) {
              console.log('Found existing conversation with this address:', conv)
              onSelectConversation(conv)
              setSearchAddress('')
              return
            }
          }
        } catch (err: any) {
          console.error('Error checking all conversations:', err?.message || err)
        }
        
        // Try querying XMTP network API directly as last resort
        console.log('Attempting to query XMTP network API directly...')
        try {
          // XMTP production API endpoint for identity lookup
          const apiUrl = 'https://production.xmtp.network/v1/identities'
          const response = await fetch(`${apiUrl}?address=${address}`, {
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
            `❌ Failed to get inboxId for address: ${address}`,
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
            address,
            canMessage,
            canMessageDebugInfo,
            sdkVersion: '5.1.0',
            clientType: typeof client,
            conversationsType: typeof client.conversations,
          })
          
          // Provide user-friendly error message
          let errorMsg = `Unable to create conversation\n\n`
          errorMsg += `Address: ${address.slice(0, 6)}...${address.slice(-4)}\n\n`
          
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
          throw new Error(`Unable to get inboxId for ${address}. canMessage: ${canMessage}. See console for full details.`)
        }
      }

      // Verify newDm method exists
      if (typeof client.conversations.newDm !== 'function') {
        console.error('Available conversations methods:', Object.keys(client.conversations))
        throw new Error('newDm method is not available on client.conversations. The XMTP client may not be fully initialized.')
      }

      // Create the DM conversation using newDm
      const conversation = await client.conversations.newDm(inboxId)
      
      // Store the original address in the conversation object for display purposes
      // Since new DM conversations might not have peerAddress immediately
      if (!conversation.peerAddress) {
        (conversation as any).peerAddress = address
      }
      
      onSelectConversation(conversation)
      setSearchAddress('')
      setError(null) // Clear error on success
      setResolvedIdentity(null) // Clear resolved identity
    } catch (err: any) {
      console.error('Error creating conversation:', err)
      console.error('Client object:', client)
      console.error('Client conversations:', client?.conversations)
      
      // Only set error if it wasn't already set (to avoid overwriting more detailed errors)
      // If error state is already set, it means we set a detailed error before throwing
      // We check the error state variable, not the caught exception
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
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg max-h-48 overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-600 dark:text-red-400 font-semibold text-sm">⚠️ Error</span>
                </div>
                <div className="text-sm text-red-700 dark:text-red-300 whitespace-pre-line break-words">
                  {error}
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 text-lg font-bold leading-none flex-shrink-0"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter address (0x...) or mention (@username, @name.eth, @agent)"
              value={searchAddress}
              onChange={(e) => {
                setSearchAddress(e.target.value)
                setError(null) // Clear error when user starts typing
                setResolvedIdentity(null) // Clear resolved identity when typing
              }}
              onKeyPress={(e) => e.key === 'Enter' && !isResolving && handleNewConversation()}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isResolving}
            />
            <button
              onClick={handleNewConversation}
              disabled={!searchAddress.trim() || isResolving}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResolving ? 'Resolving...' : 'New Chat'}
            </button>
          </div>
          
          {/* Show resolved identity */}
          {resolvedIdentity && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-blue-600 dark:text-blue-400 font-medium">✅ Resolved:</span>
                <span className="text-blue-700 dark:text-blue-300">{resolvedIdentity.displayLabel}</span>
                <span className="text-blue-500 dark:text-blue-400 text-xs">({resolvedIdentity.source})</span>
                <span className="text-blue-600 dark:text-blue-400 text-xs ml-auto">
                  {resolvedIdentity.address.slice(0, 6)}...{resolvedIdentity.address.slice(-4)}
                </span>
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

