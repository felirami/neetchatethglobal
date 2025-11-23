'use client'

import { useEffect, useState } from 'react'
import { extractMentions, type MentionToken } from '@/lib/mentions'
import { useIdentity } from '@/contexts/IdentityContext'
import type { ResolvedIdentity } from '@/lib/identity/resolve'

interface MessageWithMentionsProps {
  text: string
  isFromMe?: boolean // Used for styling mentions differently for sent vs received messages
  onMentionClick?: (identity: ResolvedIdentity | null, handle: string) => void // Callback when mention is clicked
}

/**
 * Component that renders message text with clickable mentions
 * Automatically resolves mentions and displays them with proper styling
 */
export function MessageWithMentions({ 
  text, 
  isFromMe = false,
  onMentionClick 
}: MessageWithMentionsProps) {
  const { resolveMentionsInText, getIdentityByHandle } = useIdentity()
  const [resolvedMentions, setResolvedMentions] = useState<
    Array<{ mention: MentionToken; identity: ResolvedIdentity | null }>
  >([])

  // Extract mentions and resolve them
  useEffect(() => {
    const mentions = extractMentions(text)
    
    if (mentions.length === 0) {
      setResolvedMentions([])
      return
    }

    // Resolve all mentions
    resolveMentionsInText(text).then(setResolvedMentions)
  }, [text, resolveMentionsInText])

  // If no mentions, just render plain text
  const mentions = extractMentions(text)
  if (mentions.length === 0) {
    return <span>{text}</span>
  }

  // Build parts array for rendering
  const parts: React.ReactNode[] = []
  let lastIndex = 0

  mentions.forEach((mention, idx) => {
    // Add text before this mention
    const before = text.slice(lastIndex, mention.index)
    if (before) {
      parts.push(<span key={`before-${idx}`}>{before}</span>)
    }

    // Get resolved identity (from cache or resolved)
    const resolved = resolvedMentions.find((r) => r.mention.index === mention.index)
    const identity = resolved?.identity || getIdentityByHandle(mention.username)

    // Determine display label
    const displayLabel = identity?.displayLabel || mention.raw

    // Determine styling based on whether identity was resolved
    const mentionClassName = isFromMe
      ? 'text-blue-200 hover:text-blue-100 underline' // Lighter for sent messages
      : identity
        ? 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium cursor-pointer hover:underline'
        : 'text-gray-500 dark:text-gray-400 italic' // Unresolved mentions are grayed out

    parts.push(
      <span
        key={`mention-${idx}`}
        className={mentionClassName}
        onClick={() => {
          if (onMentionClick) {
            onMentionClick(identity, mention.username)
          } else {
            // Default behavior: log to console
            console.log('Mention clicked:', { identity, handle: mention.username })
          }
        }}
        title={
          identity
            ? `${displayLabel}${identity.walletAddress ? ` (${identity.walletAddress.slice(0, 6)}...${identity.walletAddress.slice(-4)})` : ''}`
            : `@${mention.username} (unresolved)`
        }
      >
        {identity ? `@${displayLabel}` : mention.raw}
      </span>
    )

    lastIndex = mention.index + mention.length
  })

  // Add remaining text after last mention
  const after = text.slice(lastIndex)
  if (after) {
    parts.push(<span key="after">{after}</span>)
  }

  return <>{parts}</>
}

