import { NextResponse } from 'next/server'

const baseUrl = 'https://neetchat3.vercel.app'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url') || baseUrl
  
  const oembed = {
    version: '1.0',
    type: 'rich',
    title: 'NeetChat - XMTP Wallet-to-Wallet Messaging',
    description: 'Connect your wallet and chat with other wallets using XMTP',
    url: url,
    provider_name: 'NeetChat',
    provider_url: baseUrl,
    thumbnail_url: `${baseUrl}/og-image.svg`,
    thumbnail_width: 1200,
    thumbnail_height: 630,
    html: `<iframe src="${baseUrl}/chat" width="100%" height="600" frameborder="0" allow="clipboard-read; clipboard-write"></iframe>`,
    width: 1200,
    height: 630,
  }

  return NextResponse.json(oembed, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}


