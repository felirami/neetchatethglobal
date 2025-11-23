'use client'

import React from 'react'
import { ResolvedIdentity } from '@/lib/identity/resolve'

interface IdentityConfirmationModalProps {
  identity: ResolvedIdentity
  onConfirm: () => void
  onCancel: () => void
  isCreating?: boolean
  error?: string | null
}

export function IdentityConfirmationModal({
  identity,
  onConfirm,
  onCancel,
  isCreating = false,
  error = null,
}: IdentityConfirmationModalProps) {
  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'farcaster':
        return 'Farcaster User'
      case 'ens':
        return 'ENS Wallet'
      case 'directory':
        return 'AI Agent'
      default:
        return 'Wallet'
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'farcaster':
        return '👤'
      case 'ens':
        return '🔷'
      case 'directory':
        return '🤖'
      default:
        return '💼'
    }
  }

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'farcaster':
        return 'bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
      case 'ens':
        return 'bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      case 'directory':
        return 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      default:
        return 'bg-gray-100 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-full ${getSourceColor(identity.source)} flex items-center justify-center text-2xl flex-shrink-0`}>
            {getSourceIcon(identity.source)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Let's chat with this {getSourceLabel(identity.source)}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {identity.source === 'farcaster' && 'Start a conversation with this Farcaster user'}
              {identity.source === 'ens' && 'Start a conversation with this ENS wallet'}
              {identity.source === 'directory' && 'Start a conversation with this AI agent'}
              {!['farcaster', 'ens', 'directory'].includes(identity.source) && 'Start a conversation with this wallet'}
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Display Name</div>
            <div className="font-medium text-gray-900 dark:text-white">{identity.displayLabel}</div>
          </div>
          
          {identity.walletAddress && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Wallet Address</div>
              <div className="font-mono text-sm text-gray-900 dark:text-white break-all">
                {identity.walletAddress}
              </div>
            </div>
          )}

          {identity.avatarUrl && (
            <div className="flex items-center gap-2">
              <img 
                src={identity.avatarUrl} 
                alt={identity.displayLabel}
                className="w-8 h-8 rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">Profile picture</span>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-red-600 dark:text-red-400">⚠️</span>
              <div className="flex-1 text-sm text-red-700 dark:text-red-300 whitespace-pre-line max-h-48 overflow-y-auto break-words min-w-0">
                {error}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isCreating}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isCreating}
            className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              'Start Chat'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

