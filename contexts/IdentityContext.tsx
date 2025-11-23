'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react'
import { resolveMention, resolveMentionsInText, type ResolvedIdentity } from '@/lib/identity/resolve'
import type { MentionToken } from '@/lib/mentions'

interface IdentityContextType {
  // Cache of resolved identities (handle → ResolvedIdentity)
  identityCache: Map<string, ResolvedIdentity | null>
  
  // Resolve a single mention
  resolveMention: (username: string) => Promise<ResolvedIdentity | null>
  
  // Resolve all mentions in text
  resolveMentionsInText: (text: string) => Promise<Array<{ mention: MentionToken; identity: ResolvedIdentity | null }>>
  
  // Get cached identity by handle
  getIdentityByHandle: (handle: string) => ResolvedIdentity | null
  
  // Clear the cache
  clearCache: () => void
  
  // Preload identities (useful for batch loading)
  preloadIdentities: (handles: string[]) => Promise<void>
}

const IdentityContext = createContext<IdentityContextType | undefined>(undefined)

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [identityCache, setIdentityCache] = useState<Map<string, ResolvedIdentity | null>>(new Map())

  // Get identity from cache
  const getIdentityByHandle = useCallback((handle: string): ResolvedIdentity | null => {
    return identityCache.get(handle.toLowerCase()) || null
  }, [identityCache])

  // Resolve a single mention (with caching)
  const resolveMentionCached = useCallback(async (username: string, options?: { isMention?: boolean }): Promise<ResolvedIdentity | null> => {
    const normalizedHandle = username.toLowerCase()
    
    // Check cache first
    const cached = identityCache.get(normalizedHandle)
    if (cached !== undefined) {
      return cached
    }

    // Resolve using API routes (client-side)
    // isMention defaults to true for mentions
    const identity = await resolveMention(username, { useApiRoutes: true, isMention: options?.isMention ?? true })

    // Update cache
    setIdentityCache((prev) => {
      const next = new Map(prev)
      next.set(normalizedHandle, identity)
      return next
    })

    return identity
  }, [identityCache])

  // Resolve all mentions in text (with caching)
  const resolveMentionsInTextCached = useCallback(async (text: string) => {
    return await resolveMentionsInText(text, { useApiRoutes: true })
  }, [])

  // Clear the cache
  const clearCache = useCallback(() => {
    setIdentityCache(new Map())
  }, [])

  // Preload multiple identities in parallel
  const preloadIdentities = useCallback(async (handles: string[]) => {
    const toResolve = handles.filter((handle) => {
      const normalized = handle.toLowerCase()
      return !identityCache.has(normalized)
    })

    if (toResolve.length === 0) {
      return // All already cached
    }

    // Resolve all in parallel
    const results = await Promise.all(
      toResolve.map(async (handle) => {
        const identity = await resolveMention(handle, { useApiRoutes: true })
        return [handle.toLowerCase(), identity] as [string, ResolvedIdentity | null]
      })
    )

    // Update cache
    setIdentityCache((prev) => {
      const next = new Map(prev)
      results.forEach(([handle, identity]) => {
        next.set(handle, identity)
      })
      return next
    })
  }, [identityCache])

  const value = useMemo(
    () => ({
      identityCache,
      resolveMention: resolveMentionCached,
      resolveMentionsInText: resolveMentionsInTextCached,
      getIdentityByHandle,
      clearCache,
      preloadIdentities,
    }),
    [identityCache, resolveMentionCached, resolveMentionsInTextCached, getIdentityByHandle, clearCache, preloadIdentities]
  )

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>
}

export function useIdentity() {
  const context = useContext(IdentityContext)
  if (context === undefined) {
    throw new Error('useIdentity must be used within an IdentityProvider')
  }
  return context
}

