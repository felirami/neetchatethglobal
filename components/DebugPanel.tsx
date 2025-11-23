'use client'

import { useState, useEffect, useCallback } from 'react'
import { useXMTP } from '@/contexts/XMTPContext'
import { useAccount } from 'wagmi'

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [networkStats, setNetworkStats] = useState<any>(null)
  const { client } = useXMTP()
  const { address } = useAccount()

  // Auto-refresh network stats when client changes
  useEffect(() => {
    if (client && isOpen) {
      updateNetworkStats()
      const interval = setInterval(updateNetworkStats, 5000) // Update every 5 seconds
      return () => clearInterval(interval)
    }
  }, [client, isOpen])

  const updateNetworkStats = useCallback(async () => {
    if (!client) return

    try {
      // Get network statistics using XMTP debug API
      // Reference: https://docs.xmtp.org/chat-apps/debug-your-app
      if (client.debugInformation?.apiAggregateStatistics) {
        const stats = client.debugInformation.apiAggregateStatistics()
        setNetworkStats(stats)
      }
    } catch (error: any) {
      console.warn('Error getting network stats:', error)
    }
  }, [client])

  const runDiagnostics = useCallback(async () => {
    if (!client) {
      setDebugInfo({ error: 'Client not initialized' })
      return
    }

    const info: any = {
      timestamp: new Date().toISOString(),
      walletAddress: address,
      client: {
        type: typeof client,
        constructor: client.constructor?.name,
        methods: Object.keys(client).filter(k => 
          k.toLowerCase().includes('inbox') || 
          k.toLowerCase().includes('identifier') ||
          k.toLowerCase().includes('identity') ||
          k.toLowerCase().includes('conversation') ||
          k.toLowerCase().includes('debug')
        ),
        allMethods: Object.keys(client),
      },
      conversations: {
        type: typeof client.conversations,
        methods: Object.keys(client.conversations || {}),
      },
      debugInformation: {
        available: !!client.debugInformation,
        methods: client.debugInformation ? Object.keys(client.debugInformation) : [],
      },
      sdk: {
        version: '5.1.0',
      }
    }

    // Get network statistics using XMTP debug API
    // Reference: https://docs.xmtp.org/chat-apps/debug-your-app#network-statistics
    try {
      if (client.debugInformation?.apiAggregateStatistics) {
        const stats = client.debugInformation.apiAggregateStatistics()
        info.networkStatistics = stats
        setNetworkStats(stats)
      }
    } catch (error: any) {
      info.networkStatistics = { error: error.message }
    }

    // Test canMessage
    try {
      const { Client } = await import('@xmtp/browser-sdk')
      const testAddress = address || '0x0000000000000000000000000000000000000000'
      const canMessageResult = await Client.canMessage([
        { identifier: testAddress, identifierKind: 'Ethereum' }
      ])
      info.canMessage = {
        resultType: typeof canMessageResult,
        isMap: canMessageResult instanceof Map,
        testResult: canMessageResult instanceof Map 
          ? Array.from(canMessageResult.entries())
          : canMessageResult
      }
    } catch (error: any) {
      info.canMessage = { error: error.message }
    }

    // Get conversation debug info if available
    // Reference: https://docs.xmtp.org/chat-apps/debug-your-app#forked-group-debugging-tool
    try {
      const conversations = await client.conversations.list()
      const forkedConversations = conversations.filter((c: any) => c.isCommitLogForked)
      
      // Get detailed debug info for forked conversations
      const forkedDetails: any[] = []
      for (const conv of forkedConversations) {
        try {
          if (conv.debugInfo) {
            const debugInfo = await conv.debugInfo()
            forkedDetails.push({
              id: conv.id,
              peerAddress: conv.peerAddress || conv.topic || 'unknown',
              epoch: debugInfo.epoch,
              cursor: debugInfo.cursor,
              isCommitLogForked: debugInfo.isCommitLogForked,
              forkDetails: debugInfo.forkDetails,
            })
          } else {
            forkedDetails.push({
              id: conv.id,
              peerAddress: conv.peerAddress || conv.topic || 'unknown',
              isCommitLogForked: conv.isCommitLogForked,
            })
          }
        } catch (err: any) {
          forkedDetails.push({
            id: conv.id,
            peerAddress: conv.peerAddress || conv.topic || 'unknown',
            error: err.message,
          })
        }
      }
      
      info.conversations = {
        totalRaw: conversations.length,
        forked: forkedConversations.length,
        forkedDetails: forkedDetails,
        sample: conversations.slice(0, 3).map((c: any) => ({
          id: c.id,
          peerAddress: c.peerAddress || c.topic || 'unknown',
          isValid: (c.peerAddress || c.topic || '').length >= 10,
          isForked: c.isCommitLogForked,
        }))
      }

      // Get detailed debug info for first conversation if available
      if (conversations.length > 0) {
        try {
          if (conversations[0].debugInfo) {
            const debugInfo = await conversations[0].debugInfo()
            info.sampleConversationDebug = {
              epoch: debugInfo.epoch,
              cursor: debugInfo.cursor,
              isCommitLogForked: debugInfo.isCommitLogForked,
              forkDetails: debugInfo.forkDetails,
            }
          }
        } catch (err: any) {
          info.sampleConversationDebug = { error: err.message }
        }
      }

      if (forkedConversations.length > 0) {
        info.warnings = [
          `⚠️ Found ${forkedConversations.length} forked conversation(s). This can cause messages to not sync properly. Use "Resolve Forked Conversations" button below to fix.`
        ]
        info.forkedConversations = forkedConversations.map((c: any) => ({
          id: c.id,
          peerAddress: c.peerAddress || c.topic || 'unknown',
        }))
      }
    } catch (error: any) {
      info.conversations = { error: error.message }
    }

    // Test inboxId methods
    info.inboxIdMethods = {
      getInboxIdByIdentifier: typeof client.getInboxIdByIdentifier,
      getInboxIdByIdentities: typeof client.getInboxIdByIdentities,
    }

    setDebugInfo(info)
    updateNetworkStats()
  }, [client, address, updateNetworkStats])

  const clearStats = async () => {
    if (!client?.debugInformation?.clearAllStatistics) {
      alert('clearAllStatistics method not available')
      return
    }
    try {
      client.debugInformation.clearAllStatistics()
      updateNetworkStats()
      alert('Network statistics cleared!')
    } catch (error: any) {
      alert(`Error clearing stats: ${error.message}`)
    }
  }

  const inspectLocalStorageMappings = useCallback(() => {
    if (typeof window === 'undefined') return {}
    const addressMap = JSON.parse(localStorage.getItem('xmtp_conversation_addresses') || '{}')
    console.log('📋 Current localStorage conversation address mappings:', addressMap)
    return addressMap
  }, [])

  const clearLocalStorageMappings = useCallback(() => {
    if (typeof window === 'undefined') return
    if (confirm('Clear all conversation address mappings from localStorage? This will reset the address display for conversations.')) {
      localStorage.removeItem('xmtp_conversation_addresses')
      console.log('✅ Cleared localStorage conversation address mappings')
      alert('LocalStorage mappings cleared!')
    }
  }, [])

  const addLocalStorageMapping = useCallback((conversationId: string, address: string) => {
    if (typeof window === 'undefined') return
    if (!conversationId || !address) {
      console.error('❌ Both conversationId and address are required')
      return false
    }
    
    // Validate address format
    if (!address.startsWith('0x') || address.length !== 42) {
      console.error('❌ Invalid Ethereum address format')
      return false
    }
    
    const addressMap = JSON.parse(localStorage.getItem('xmtp_conversation_addresses') || '{}')
    addressMap[conversationId] = address.toLowerCase()
    localStorage.setItem('xmtp_conversation_addresses', JSON.stringify(addressMap))
    console.log(`✅ Added mapping: ${conversationId.slice(0, 8)}... → ${address}`)
    console.log('💡 Refresh the page or reload conversations to see the change')
    return true
  }, [])

  const resolveForkedConversations = useCallback(async () => {
    if (!client) {
      alert('XMTP client not initialized')
      return
    }

    try {
      const conversations = await client.conversations.list()
      const forkedConversations = conversations.filter((c: any) => c.isCommitLogForked)
      
      if (forkedConversations.length === 0) {
        alert('No forked conversations found!')
        return
      }

      if (!confirm(`Found ${forkedConversations.length} forked conversation(s). Attempt to resolve them? This will try to sync and repair the conversation state.`)) {
        return
      }

      const results: string[] = []
      
      for (const conv of forkedConversations) {
        try {
          console.log(`🔧 Attempting to resolve forked conversation: ${conv.id}`)
          
          // Try to sync the conversation - this often resolves forks
          if (typeof conv.sync === 'function') {
            await conv.sync()
            console.log(`✅ Synced conversation: ${conv.id}`)
          }
          
          // Try to repair if method exists
          if (typeof conv.repair === 'function') {
            await conv.repair()
            console.log(`✅ Repaired conversation: ${conv.id}`)
          }
          
          // Check if still forked after repair
          if (conv.debugInfo) {
            const debugInfo = await conv.debugInfo()
            if (!debugInfo.isCommitLogForked) {
              results.push(`✅ Resolved: ${conv.id}`)
            } else {
              results.push(`⚠️ Still forked: ${conv.id} (may need manual intervention)`)
            }
          } else {
            results.push(`✅ Attempted repair: ${conv.id}`)
          }
        } catch (error: any) {
          console.error(`❌ Error resolving conversation ${conv.id}:`, error)
          results.push(`❌ Failed: ${conv.id} - ${error.message}`)
        }
      }
      
      // Refresh diagnostics
      await runDiagnostics()
      
      alert(`Resolution attempt completed:\n\n${results.join('\n')}\n\nCheck console for details.`)
    } catch (error: any) {
      console.error('Error resolving forked conversations:', error)
      alert(`Error: ${error.message}`)
    }
  }, [client, runDiagnostics])

  // Expose utilities globally for console access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).inspectXMTPMappings = inspectLocalStorageMappings
      ;(window as any).clearXMTPMappings = clearLocalStorageMappings
      ;(window as any).addXMTPMapping = addLocalStorageMapping
      ;(window as any).resolveForkedConversations = resolveForkedConversations
      console.log('💡 Debug utilities available:')
      console.log('  - window.inspectXMTPMappings() - View all address mappings')
      console.log('  - window.clearXMTPMappings() - Clear all mappings')
      console.log('  - window.addXMTPMapping(conversationId, address) - Add a mapping manually')
      console.log('  - window.resolveForkedConversations() - Fix forked conversations')
      console.log('')
      console.log('💡 Example: window.addXMTPMapping("20fef03430d1df1a547645b90d12b6e7", "0xd8da6bf26964af9d7eed9e03e53415d37aa96045")')
    }
  }, [inspectLocalStorageMappings, clearLocalStorageMappings, addLocalStorageMapping, resolveForkedConversations])

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium shadow-lg transition-colors"
      >
        {isOpen ? 'Hide' : 'Show'} Debug
      </button>
      
      {isOpen && (
        <div className="mt-2 w-[500px] max-h-[600px] overflow-auto bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-4 text-xs">
          <div className="flex justify-between items-center mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
            <h3 className="font-bold text-sm">XMTP Debug Panel</h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={clearStats}
                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs disabled:opacity-50"
                disabled={!client?.debugInformation?.clearAllStatistics}
                title="Clear all network statistics"
              >
                Clear Stats
              </button>
              <button
                onClick={inspectLocalStorageMappings}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                title="Inspect localStorage conversation mappings (also logs to console)"
              >
                Inspect Mappings
              </button>
              <button
                onClick={clearLocalStorageMappings}
                className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs"
                title="Clear localStorage conversation mappings"
              >
                Clear Mappings
              </button>
              <button
                onClick={runDiagnostics}
                className="px-2 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs"
                title="Run full diagnostics"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Network Statistics */}
          {networkStats && (
            <div className="mb-4 p-2 bg-gray-50 dark:bg-gray-900 rounded">
              <h4 className="font-semibold mb-2 text-xs">📊 Network Statistics</h4>
              <div className="space-y-1 text-xs">
                <div><strong>API Calls:</strong></div>
                {networkStats.apiStats && Object.entries(networkStats.apiStats).map(([key, value]: [string, any]) => (
                  <div key={key} className="ml-2">- {key}: {value}</div>
                ))}
                <div className="mt-2"><strong>Identity:</strong></div>
                {networkStats.identityStats && Object.entries(networkStats.identityStats).map(([key, value]: [string, any]) => (
                  <div key={key} className="ml-2">- {key}: {value}</div>
                ))}
                <div className="mt-2"><strong>Stream:</strong></div>
                {networkStats.streamStats && Object.entries(networkStats.streamStats).map(([key, value]: [string, any]) => (
                  <div key={key} className="ml-2">- {key}: {value}</div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {debugInfo?.warnings && debugInfo.warnings.length > 0 && (
            <div className="mb-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
              <h4 className="font-semibold mb-1 text-xs text-yellow-800 dark:text-yellow-200">⚠️ Warnings</h4>
              {debugInfo.warnings.map((warning: string, i: number) => (
                <p key={i} className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">{warning}</p>
              ))}
              {debugInfo?.forkedConversations && debugInfo.forkedConversations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-yellow-300 dark:border-yellow-700">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200 font-semibold mb-2">
                    Forked Conversations:
                  </p>
                  <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 mb-3">
                    {debugInfo.forkedConversations.map((conv: any, i: number) => (
                      <li key={i} className="font-mono">
                        • {conv.id.slice(0, 8)}... ({conv.peerAddress || 'unknown'})
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={resolveForkedConversations}
                    className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs font-medium"
                    title="Attempt to resolve forked conversations by syncing and repairing"
                  >
                    🔧 Resolve Forked Conversations
                  </button>
                  {debugInfo?.conversations?.forkedDetails && debugInfo.conversations.forkedDetails.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-yellow-800 dark:text-yellow-200 hover:underline">
                        View fork details
                      </summary>
                      <pre className="whitespace-pre-wrap break-words text-xs bg-yellow-100 dark:bg-yellow-900/40 p-2 rounded mt-1 max-h-40 overflow-auto">
                        {JSON.stringify(debugInfo.conversations.forkedDetails, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Full Debug Info */}
          {debugInfo && (
            <div>
              <h4 className="font-semibold mb-2 text-xs">🔍 Full Debug Information</h4>
              <details className="mb-2">
                <summary className="cursor-pointer text-xs text-primary-600 dark:text-primary-400 mb-1 hover:underline">
                  Click to expand full debug data
                </summary>
                <pre className="whitespace-pre-wrap break-words text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded mt-1 max-h-64 overflow-auto">
                  {JSON.stringify(debugInfo, (key, value) =>
                    typeof value === 'bigint'
                      ? value.toString()
                      : value
                  , 2)}
                </pre>
              </details>
            </div>
          )}
          
          {!debugInfo && (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-2">Click "Refresh" to see debug information</p>
              {!client && (
                <p className="text-red-500 text-xs">⚠️ XMTP client not initialized</p>
              )}
              {client && (
                <p className="text-green-500 text-xs">✅ XMTP client ready</p>
              )}
            </div>
          )}

          {/* LocalStorage Mappings */}
          {typeof window !== 'undefined' && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold mb-2 text-xs">💾 LocalStorage Mappings</h4>
              <div className="text-xs space-y-1">
                <p className="text-gray-500">
                  Conversation ID → Wallet Address mappings stored in localStorage
                </p>
                <pre className="whitespace-pre-wrap break-words text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded mt-1 max-h-32 overflow-auto">
                  {JSON.stringify(inspectLocalStorageMappings(), null, 2)}
                </pre>
                <p className="text-gray-500 mt-2">
                  💡 Also available in console: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">window.inspectXMTPMappings()</code> and <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">window.clearXMTPMappings()</code>
                </p>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          {client && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500">
                💡 Tip: Check browser console for detailed logs
              </p>
              <p className="text-xs text-gray-500 mt-1">
                📚 Docs: <a href="https://docs.xmtp.org/chat-apps/debug-your-app" target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline">XMTP Debug Guide</a>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}