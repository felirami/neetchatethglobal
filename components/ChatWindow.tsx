'use client'

import { useEffect, useState, useRef } from 'react'
import { useAccount } from 'wagmi'
import { useXMTP } from '@/contexts/XMTPContext'
import { MessageWithMentions } from '@/components/MessageWithMentions'

// Define types locally to avoid build-time imports
type Conversation = any
type DecodedMessage = any

interface ChatWindowProps {
  conversation: Conversation | null
}

export function ChatWindow({ conversation }: ChatWindowProps) {
  const { client } = useXMTP()
  const { address } = useAccount()
  const [messages, setMessages] = useState<DecodedMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [myInboxId, setMyInboxId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch current user's inboxId for identifying own messages
  useEffect(() => {
    if (client) {
      // Try to get inboxId from client
      const inboxId = client.inboxId || client.installationId // Fallback if inboxId is not directly exposed
      if (inboxId) {
        console.log('👤 Current User Inbox ID:', inboxId)
        setMyInboxId(inboxId)
      }
    }
  }, [client])

  const refreshMessages = async () => {
    if (!conversation) return
    
    setIsLoading(true)
    try {
      // First, sync the conversation to get latest messages from the network
      console.log('🔄 Syncing conversation to get latest messages...')
      try {
        if (typeof conversation.sync === 'function') {
          await conversation.sync()
          console.log('✅ Conversation synced')
        } else {
          console.warn('⚠️ Conversation sync method not available')
        }
      } catch (syncError: any) {
        console.warn('⚠️ Error syncing conversation (will try to load from local database):', syncError?.message)
      }

      // Then, load messages from the local database
      if (typeof conversation.messages !== 'function') {
        console.error('Conversation messages method is not available')
        setMessages([])
        return
      }
      // Fetch all messages
      const allMessages = await conversation.messages()
      console.log(`📋 Loaded ${allMessages?.length || 0} messages from local database. First message date:`, 
        allMessages && allMessages.length > 0 ? (allMessages[0].sentAt || allMessages[0].sentAtNs) : 'none')
        
      setMessages(allMessages || [])
    } catch (error: any) {
      console.error('Error loading messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!conversation || !client) {
      setMessages([])
      return
    }

    refreshMessages()

    // Periodically sync messages (every 10s) to catch anything the stream missed
    const intervalId = setInterval(() => {
        console.log('🔄 Periodic message sync...')
        // Don't set isLoading true for background syncs to avoid UI flickering
        const backgroundSync = async () => {
            try {
                if (typeof conversation.sync === 'function') await conversation.sync()
                const latest = await conversation.messages()
                if (latest && latest.length > 0) {
                     setMessages(prev => {
                         // Only update if count changed to avoid re-renders
                         if (prev.length !== latest.length) return latest
                         return prev
                     })
                }
            } catch (e) { console.warn('Background sync error', e) }
        }
        backgroundSync()
    }, 10000)

    // Stream new messages using streamAllMessages and filter by conversation
    const streamMessages = async () => {
      try {
        const conversationId = conversation.id
        const conversationTopic = conversation.topic
        
        if (!conversationId) {
          console.warn('Conversation ID not available for streaming')
          return
        }

        console.log(`🎧 Starting message stream for convo ${conversationId.slice(0, 8)}... (Topic: ${conversationTopic})`)

        // Use streamAllMessages and filter by conversation ID
        const stream = await client.conversations.streamAllMessages({
          consentStates: ['allowed', 'unknown'],
        })

        for await (const message of stream) {
          // Debug: Log incoming stream message details
          console.log('📨 Stream received message:', {
            id: message.id,
            content: typeof message.content === 'string' ? message.content : 'object',
            msgConvoId: message.conversation?.id,
            msgTopic: message.conversation?.topic || (message as any).contentTopic,
            targetConvoId: conversationId,
            targetTopic: conversationTopic
          })

          // Check if this message belongs to the current conversation
          // enhanced check to catch more cases
          const isMatch = 
              (conversationId && (
                message.conversation?.id === conversationId || 
                message.conversationId === conversationId
              )) ||
              (conversationTopic && (
                (message as any).conversation?.topic === conversationTopic ||
                (message as any).contentTopic === conversationTopic
              ))

          if (isMatch) {
            console.log('✅ Message matched current conversation, adding to list')
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.find((m) => m.id === message.id)) {
                return prev
              }
              return [...prev, message]
            })
          } else {
             console.log('❌ Message ignored (different conversation)')
          }
        }
      } catch (error: any) {
        console.error('Error streaming messages:', error)
        // If streaming fails, we can still refresh messages periodically
      }
    }

    streamMessages()
  }, [conversation, client])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!conversation || !newMessage.trim() || isSending) return

    const messageText = newMessage.trim()
    setIsSending(true)
    setError(null)
    
    // Optimistically add message to UI immediately
    // Set both senderAddress and senderInboxId so isFromMe check works immediately
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      content: messageText,
      senderAddress: address || '',
      senderInboxId: myInboxId || undefined, // Set inboxId so isFromMe check works immediately
      sentAt: new Date(),
      isOptimistic: true,
    }
    setMessages((prev) => [...prev, optimisticMessage as any])
    setNewMessage('')

    try {
      if (typeof conversation.send !== 'function') {
        throw new Error('Conversation send method is not available')
      }
      
      // Ensure consent is set to allowed for this conversation
      // This is important for messages to be delivered
      try {
        if (typeof conversation.updateConsentState === 'function') {
          const { ConsentState } = await import('@xmtp/browser-sdk')
          await conversation.updateConsentState(ConsentState.Allowed)
          console.log('✅ Consent set to Allowed for conversation')
        }
      } catch (consentError: any) {
        console.warn('Could not set consent state (may already be set):', consentError?.message)
        // Continue anyway - consent might already be set
      }
      
      // Try using sendOptimistic + publishMessages to ensure message is published
      // This is more explicit than just send() and ensures the message reaches the network
      let messageSent = false
      
      if (typeof conversation.sendOptimistic === 'function' && typeof conversation.publishMessages === 'function') {
        console.log('📤 Using sendOptimistic + publishMessages')
        conversation.sendOptimistic(messageText)
        await conversation.publishMessages()
        messageSent = true
        console.log('✅ Message published successfully')
      } else {
        // Fallback to regular send() if sendOptimistic is not available
        console.log('📤 Using regular send() method')
        await conversation.send(messageText)
        messageSent = true
        console.log('✅ Message sent successfully')
      }
      
      // Try to sync the conversation to ensure messages are published
      try {
        if (client?.conversations?.syncAll) {
          console.log('🔄 Syncing conversations...')
          await client.conversations.syncAll(['allowed', 'unknown'])
          console.log('✅ Sync completed')
        }
      } catch (syncError: any) {
        console.warn('Could not sync conversations (may not be needed):', syncError?.message)
      }
      
      // Wait a bit for the message to be processed
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Reload messages to get the real message from the server
      try {
        if (typeof conversation.messages === 'function') {
          const updatedMessages = await conversation.messages()
          console.log('📥 Reloaded messages, count:', updatedMessages?.length || 0)
          setMessages(updatedMessages || [])
        }
      } catch (refreshError) {
        console.warn('Error refreshing messages after send:', refreshError)
        // Don't remove optimistic message - it might still be processing
      }
    } catch (error: any) {
      console.error('❌ Error sending message:', error)
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        conversation: {
          id: conversation?.id,
          hasSend: typeof conversation?.send === 'function',
          hasUpdateConsent: typeof conversation?.updateConsentState === 'function',
        }
      })
      
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id))
      setNewMessage(messageText) // Restore message text
      
      let errorMessage = 'Failed to send message.'
      if (error?.message) {
        if (error.message.includes('not a function')) {
          errorMessage = 'Conversation error. Please try selecting the conversation again.'
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (error.message.includes('consent')) {
          errorMessage = 'Consent error. Please try again.'
        } else {
          errorMessage = `Error: ${error.message}`
        }
      }
      setError(errorMessage)
    } finally {
      setIsSending(false)
    }
  }

  const formatAddress = (addr: string) => {
    if (!addr || typeof addr !== 'string' || addr.length < 10) {
      return 'Unknown'
    }
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const formatTime = (timestamp: Date | number | string | bigint | undefined) => {
    if (!timestamp) return ''
    try {
      let date: Date
      
      // Handle BigInt (nanoseconds)
      if (typeof timestamp === 'bigint') {
        date = new Date(Number(timestamp / 1000000n))
      } 
      // Handle sentAtNs (string representation of nanoseconds)
      else if (typeof timestamp === 'string' && /^\d+$/.test(timestamp) && timestamp.length > 13) {
        // Convert string nanoseconds to milliseconds
        const ns = BigInt(timestamp)
        date = new Date(Number(ns / 1000000n))
      }
      else {
        date = new Date(timestamp)
      }

      if (isNaN(date.getTime())) {
        console.warn('Invalid date in formatTime:', timestamp)
        return ''
      }
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (e) {
      console.error('Error formatting time:', e)
      return ''
    }
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Select a conversation</p>
          <p className="text-sm">Choose a conversation from the list to start chatting</p>
        </div>
      </div>
    )
  }

  // Try multiple ways to get peer address/info from DM conversation
  // DM conversations might have: peerAddress, peerInboxId, topic, or we stored the address
  let peerAddress: string = ''
  
  // Check if peerInboxId is a function (getter) or a property
  const peerInboxIdValue = typeof (conversation as any).peerInboxId === 'function'
    ? (conversation as any).peerInboxId()
    : (conversation as any).peerInboxId
  
  peerAddress = 
    conversation.peerAddress || 
    (conversation as any).peer?.address ||
    (conversation as any).address ||
    conversation.topic || 
    (typeof peerInboxIdValue === 'string' ? peerInboxIdValue : '') ||
    ''
  
  // For DM conversations, if we have peerInboxId but no address, try to get it from the client
  // But for now, we'll use what we have or show a fallback
  const displayAddress = peerAddress && typeof peerAddress === 'string' && peerAddress.length >= 10
    ? peerAddress
    : conversation.id || 'Unknown'
  
  if (!conversation || !conversation.id) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <p className="text-sm">Invalid conversation</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Chat Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium text-sm">
            {displayAddress.length >= 4 && displayAddress.startsWith('0x') 
              ? displayAddress.slice(2, 4).toUpperCase() 
              : displayAddress.length >= 2 
                ? displayAddress.slice(0, 2).toUpperCase() 
                : '??'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="font-medium text-sm" title={displayAddress}>
                {displayAddress.startsWith('0x') ? formatAddress(displayAddress) : displayAddress.slice(0, 8)}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(displayAddress)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="text-gray-400 hover:text-primary-600 transition-colors"
                title="Copy full address"
              >
                {copied ? (
                  <span className="text-xs text-green-600 font-medium">Copied!</span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                )}
              </button>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]" title={displayAddress}>
              {displayAddress}
            </div>
          </div>
        </div>
        <button 
            onClick={refreshMessages}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Refresh messages"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900 min-h-0">
        {isLoading ? (
          <div className="text-center text-gray-500">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages
            .filter(message => {
              // Filter out system messages and non-text content
              if (!message.content) return false
              
              // Filter out group membership changes (objects with initiatedByInboxId)
              if (typeof message.content === 'object' && 'initiatedByInboxId' in message.content) {
                return false
              }

              // Keep strings and objects with text property
              return typeof message.content === 'string' || (typeof message.content === 'object' && message.content.text)
            })
            .map((message) => {
              // Check if message is from me using multiple methods:
              // 1. Compare senderInboxId (most reliable for V3/MLS)
              // 2. Compare senderAddress (legacy/V2)
              const isFromMe = 
                (myInboxId && message.senderInboxId && message.senderInboxId === myInboxId) ||
                (address && message.senderAddress && message.senderAddress.toLowerCase() === address.toLowerCase())
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      isFromMe
                        ? 'bg-primary-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="text-sm break-words">
                      {typeof message.content === 'string' ? (
                        <MessageWithMentions 
                          text={message.content} 
                          isFromMe={isFromMe}
                          onMentionClick={(identity, handle) => {
                            // Optional: Open profile modal, start DM, etc.
                            console.log('Mention clicked:', { identity, handle })
                          }}
                        />
                      ) : (
                        <MessageWithMentions 
                          text={message.content.text || String(message.content)} 
                          isFromMe={isFromMe}
                          onMentionClick={(identity, handle) => {
                            console.log('Mention clicked:', { identity, handle })
                          }}
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className={`text-xs ${isFromMe ? 'text-white/70' : 'text-gray-500'}`}>
                        {formatTime(message.sentAt || message.sentAtNs || (message as any).sent || (message as any).timestamp)}
                      </span>
                      {isFromMe && (
                        <span className="text-xs" title={message.id.startsWith('temp-') ? "Sending..." : "Sent"}>
                          {message.id.startsWith('temp-') ? (
                            <svg className="animate-spin h-3 w-3 text-primary-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-primary-100">
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        {error && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-red-600 dark:text-red-400 font-semibold text-xs">⚠️ Error</span>
                </div>
                <div className="text-xs text-red-700 dark:text-red-300">
                  {error}
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 text-lg font-bold leading-none"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value)
              setError(null) // Clear error when user starts typing
            }}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={isSending}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}