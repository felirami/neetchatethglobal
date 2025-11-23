'use client'

import { useEffect } from 'react'

export function FarcasterMeta() {
  useEffect(() => {
    // Ensure Farcaster frame meta tags are present (backup for client-side)
    // These should already be in the HTML head via Next.js metadata, but we ensure they're there
    const baseUrl = 'https://neetchat3.vercel.app'
    
    const metaTags = [
      { name: 'fc:frame', content: 'vNext' },
      { name: 'fc:frame:image', content: `${baseUrl}/og-image.svg` },
      { name: 'fc:frame:button:1', content: '💬 Chat' },
      { name: 'fc:frame:button:1:action', content: 'launch_miniapp' },
      { name: 'fc:frame:button:1:target', content: `${baseUrl}/chat` },
    ]
    
    metaTags.forEach(({ name, content }) => {
      // Check if tag already exists
      const existingTag = document.querySelector(`meta[name="${name}"]`)
      if (!existingTag) {
        const metaTag = document.createElement('meta')
        metaTag.name = name
        metaTag.content = content
        document.head.appendChild(metaTag)
      } else if (existingTag.getAttribute('content') !== content) {
        // Update if content differs
        existingTag.setAttribute('content', content)
      }
    })
  }, [])

  return null
}

