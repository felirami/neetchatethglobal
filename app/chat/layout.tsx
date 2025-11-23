import type { Metadata } from 'next'

const baseUrl = 'https://neetchat3.vercel.app'

export const metadata: Metadata = {
  title: 'NeetChat - Chat',
  description: 'Chat with other wallets using XMTP',
  openGraph: {
    title: 'NeetChat - Chat',
    description: 'Chat with other wallets using XMTP',
    url: `${baseUrl}/chat`,
    images: [
      {
        url: `${baseUrl}/og-image.svg`,
        width: 1200,
        height: 630,
        alt: 'NeetChat - XMTP Wallet-to-Wallet Messaging',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NeetChat - Chat',
    description: 'Chat with other wallets using XMTP',
    images: [`${baseUrl}/og-image.svg`],
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': `${baseUrl}/og-image.svg`,
    'fc:frame:button:1': '💬 Chat',
    'fc:frame:button:1:action': 'launch_miniapp',
    'fc:frame:button:1:target': `${baseUrl}/chat`,
  },
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

