'use client'

import { useEffect } from 'react'

export function MiniAppInit() {
  useEffect(() => {
    // Initialize Farcaster Mini App SDK
    const initMiniApp = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk')
        if (sdk && typeof sdk.actions?.ready === 'function') {
          await sdk.actions.ready()
          console.log('✅ Farcaster Mini App SDK initialized')
        }
      } catch (error) {
        console.warn('⚠️ Farcaster Mini App SDK not available (running outside Farcaster):', error)
        // This is fine - the app works without Farcaster
      }
    }

    initMiniApp()
  }, [])

  return null
}

