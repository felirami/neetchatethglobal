import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { FarcasterMeta } from '@/components/FarcasterMeta'
import { MiniAppInit } from '@/components/MiniAppInit'

const inter = Inter({ subsets: ['latin'] })

const baseUrl = 'https://neetchat3.vercel.app'

export const metadata: Metadata = {
  title: 'NeetChat - XMTP Chat',
  description: 'Connect your wallet and chat with other wallets using XMTP',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  openGraph: {
    title: 'NeetChat - XMTP Chat',
    description: 'Connect your wallet and chat with other wallets using XMTP',
    url: baseUrl,
    siteName: 'NeetChat',
    images: [
      {
        url: `${baseUrl}/og-image.svg`,
        width: 1200,
        height: 630,
        alt: 'NeetChat - XMTP Wallet-to-Wallet Messaging',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NeetChat - XMTP Chat',
    description: 'Connect your wallet and chat with other wallets using XMTP',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Inject Farcaster frame meta tags immediately for crawlers */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof document !== 'undefined' && document.head) {
                  const baseUrl = 'https://neetchat3.vercel.app';
                  const metaTags = [
                    { name: 'fc:frame', content: 'vNext' },
                    { name: 'fc:frame:image', content: baseUrl + '/og-image.svg' },
                    { name: 'fc:frame:button:1', content: '💬 Chat' },
                    { name: 'fc:frame:button:1:action', content: 'launch_miniapp' },
                    { name: 'fc:frame:button:1:target', content: baseUrl + '/chat' }
                  ];
                  metaTags.forEach(function(tag) {
                    if (!document.querySelector('meta[name="' + tag.name + '"]')) {
                      const meta = document.createElement('meta');
                      meta.name = tag.name;
                      meta.content = tag.content;
                      document.head.appendChild(meta);
                    }
                  });
                }
              })();
            `,
          }}
        />
        <FarcasterMeta />
        <ErrorBoundary>
          <Providers>
            <MiniAppInit />
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}

