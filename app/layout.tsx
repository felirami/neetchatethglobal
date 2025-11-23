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
    // Farcaster frame meta tag as JSON string (required format)
    'fc:frame': JSON.stringify({
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
    }),
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
        {/* Inject Farcaster frame meta tag immediately for crawlers */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof document !== 'undefined' && document.head) {
                  const baseUrl = 'https://neetchat3.vercel.app';
                  const frameMeta = {
                    version: 'next',
                    imageUrl: baseUrl + '/og-image.svg',
                    button: {
                      title: '💬 Chat',
                      action: {
                        type: 'launch_miniapp',
                        name: 'NeetChat',
                        url: baseUrl + '/chat',
                        splashImageUrl: baseUrl + '/logo.svg',
                        splashBackgroundColor: '#0ea5e9'
                      }
                    }
                  };
                  const existingTag = document.querySelector('meta[name="fc:frame"]');
                  if (!existingTag) {
                    const meta = document.createElement('meta');
                    meta.name = 'fc:frame';
                    meta.content = JSON.stringify(frameMeta);
                    document.head.appendChild(meta);
                  }
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

