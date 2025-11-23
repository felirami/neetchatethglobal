'use client'

import { useEffect } from 'react'

export function FarcasterMeta() {
  useEffect(() => {
    // Add Farcaster frame meta tag for mini app embeds
    const metaTag = document.createElement('meta')
    metaTag.name = 'fc:frame'
    metaTag.content = JSON.stringify({
      version: 'next',
      imageUrl: 'https://neetchat3.vercel.app/og-image.png',
      button: {
        title: '💬 Chat',
        action: {
          type: 'launch_miniapp',
          name: 'NeetChat',
          url: 'https://neetchat3.vercel.app/chat',
          splashImageUrl: 'https://neetchat3.vercel.app/logo.png',
          splashBackgroundColor: '#0ea5e9'
        }
      }
    })
    
    // Remove existing fc:frame tag if present
    const existingTag = document.querySelector('meta[name="fc:frame"]')
    if (existingTag) {
      existingTag.remove()
    }
    
    document.head.appendChild(metaTag)
    
    return () => {
      // Cleanup on unmount
      const tag = document.querySelector('meta[name="fc:frame"]')
      if (tag) {
        tag.remove()
      }
    }
  }, [])

  return null
}

