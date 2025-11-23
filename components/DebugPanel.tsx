'use client'

import { useState, useEffect } from 'react'
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

  const updateNetworkStats = async () => {
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
  }

  const runDiagnostics = async () => {
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
      
      info.conversations = {
        totalRaw: conversations.length,
        forked: forkedConversations.length,
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
          `⚠️ Found ${forkedConversations.length} forked conversation(s). See https://docs.xmtp.org/chat-apps/debug-your-app for details.`
        ]
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
  }

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
            <div className="flex gap-2">
              <button
                onClick={clearStats}
                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs disabled:opacity-50"
                disabled={!client?.debugInformation?.clearAllStatistics}
                title="Clear all network statistics"
              >
                Clear Stats
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
                <p key={i} className="text-xs text-yellow-700 dark:text-yellow-300">{warning}</p>
              ))}
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