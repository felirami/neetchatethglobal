import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const address = searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 })
  }

  // Try multiple endpoints if one fails
  // 1. Production Identity API
  // 2. History Service (sometimes has identity info)
  
  const endpoints = [
    `https://production.xmtp.network/v1/identities/${address}`, // RESTful style
    `https://production.xmtp.network/v1/identities?address=${address}`, // Query param style
    `https://message-history.production.ephemera.network/v1/identities/${address}` // History service
  ]

  let lastError = null

  for (const url of endpoints) {
    try {
      console.log(`Trying XMTP API: ${url}`)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Check for various response formats
        const inboxId = data.inboxId || (data[address] && data[address].inboxId) || (Array.isArray(data) && data[0]?.inboxId)
        
        if (inboxId) {
            return NextResponse.json({ inboxId })
        }
        
        // If data exists but no obvious inboxId, return full data
        if (Object.keys(data).length > 0) {
             return NextResponse.json(data)
        }
      } else {
          console.warn(`API call failed: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error('Proxy request failed:', error)
      lastError = error
    }
  }
  
  // Fallback: Try to POST to identity/bulk endpoint if GET fails
  try {
      // Using the correct endpoint for fetching inbox IDs by addresses
      // This corresponds to the get_inbox_ids gRPC method
      const postUrl = 'https://production.xmtp.network/message/v1/get-inbox-ids' 
      const response = await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              requests: [{
                  address: address,
                  // identifier_kind: 1 // Ethereum - some endpoints infer this
              }]
          })
      })
      
      if (response.ok) {
          const data = await response.json()
          if (data.responses && data.responses[0]?.inbox_id) {
               return NextResponse.json({ inboxId: data.responses[0].inbox_id })
          }
      }
  } catch (e) {
      console.warn('POST fallback failed', e)
  }

  // Fallback 2: Try to create a temporary "mock" inboxId check if the user insists
  // This is only for debugging - in production we shouldn't do this
  
  return NextResponse.json(
    { error: 'Failed to fetch identity', details: lastError },
    { status: 404 }
  )
}
