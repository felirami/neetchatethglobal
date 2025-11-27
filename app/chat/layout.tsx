import type { Metadata } from 'next'

const baseUrl = 'https://neetchat3.vercel.app'

export const metadata: Metadata = {
  title: 'NeetChat - XMTP Wallet-to-Wallet Messaging',
  description: 'Decentralized messaging built on XMTP. Chat securely with any Ethereum wallet address. No sign-ups required.',
  openGraph: {
    title: 'NeetChat - XMTP Wallet-to-Wallet Messaging',
    description: 'Decentralized messaging built on XMTP. Chat securely with any Ethereum wallet address. No sign-ups required.',
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
    title: 'NeetChat - XMTP Wallet-to-Wallet Messaging',
    description: 'Decentralized messaging built on XMTP. Chat securely with any Ethereum wallet address. No sign-ups required.',
    images: [`${baseUrl}/og-image.svg`],
  },
  other: {
    // Farcaster frame meta tag as JSON string (required format)
    'fc:frame': JSON.stringify({
      version: 'next',
      imageUrl: `${baseUrl}/og-image.svg`,
      button: {
        title: '💬 Chat',
        action: {
          type: 'launch_miniapp',
          name: 'NeetChat',
          url: `${baseUrl}/`,
          splashImageUrl: `${baseUrl}/logo.svg`,
          splashBackgroundColor: '#0ea5e9',
        },
      },
    }),
  },
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

