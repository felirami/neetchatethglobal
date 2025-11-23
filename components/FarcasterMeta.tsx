'use client'

import { useEffect } from 'react'

export function FarcasterMeta() {
  useEffect(() => {
    // Ensure Farcaster frame meta tag is present (backup for client-side)
    // The meta tag should be a JSON string, not individual tags
    const baseUrl = 'https://neetchat3.vercel.app'
    
    const frameMeta = {
      version: 'next',
      imageUrl: `${baseUrl}/og-image.svg`,
      button: {
        title: '💬 Chat',
        action: {
          type: 'launch_miniapp',
          name: 'NeetChat',
          url: `${baseUrl}/chat`,
          splashImageUrl: `${baseUrl}/logo.svg`,
          splashBackgroundColor: '#0ea5e9',
        },
      },
    }
    
    const existingTag = document.querySelector('meta[name="fc:frame"]')
    if (!existingTag) {
      const metaTag = document.createElement('meta')
      metaTag.name = 'fc:frame'
      metaTag.content = JSON.stringify(frameMeta)
      document.head.appendChild(metaTag)
    } else {
      // Update if content differs
      const currentContent = existingTag.getAttribute('content')
      const newContent = JSON.stringify(frameMeta)
      if (currentContent !== newContent) {
        existingTag.setAttribute('content', newContent)
      }
    }
  }, [])

  return null
}

