# Farcaster Embed Fixes

## Issues Fixed

1. **Embed Present**: Meta tags were being added client-side (too late for crawlers)
2. **Embed Valid**: Meta tags format was incorrect (using JSON string instead of individual tags)

## Solutions Implemented

### 1. Server-Side Meta Tags via Next.js Metadata API
- Added OpenGraph tags (`og:title`, `og:description`, `og:image`, `og:url`)
- Added Twitter Card tags (`twitter:card`, `twitter:title`, `twitter:image`)
- Added Farcaster frame tags via `metadata.other`:
  - `fc:frame`: 'vNext'
  - `fc:frame:image`: Image URL
  - `fc:frame:button:1`: Button text
  - `fc:frame:button:1:action`: 'launch_miniapp'
  - `fc:frame:button:1:target`: Target URL

### 2. Early Script Injection
- Added a script in the body that runs immediately (before React loads)
- Injects meta tags into the HTML head as early as possible
- Ensures crawlers see the tags even if metadata API doesn't work

### 3. Created Assets
- `public/og-image.svg` - OpenGraph image (1200x630)
- `public/logo.svg` - App logo (200x200)
- Updated manifest to use SVG images

### 4. Page-Specific Metadata
- Created `app/chat/layout.tsx` with chat-specific metadata
- Ensures `/chat` route has proper embed metadata

## Meta Tags Structure

The correct format for Farcaster embeds is individual meta tags:
```html
<meta name="fc:frame" content="vNext" />
<meta name="fc:frame:image" content="https://neetchat3.vercel.app/og-image.svg" />
<meta name="fc:frame:button:1" content="💬 Chat" />
<meta name="fc:frame:button:1:action" content="launch_miniapp" />
<meta name="fc:frame:button:1:target" content="https://neetchat3.vercel.app/chat" />
```

NOT a JSON string in a single meta tag (which was the previous incorrect approach).

## Testing

To verify embeds work:
1. Visit: https://farcaster.xyz/~/developers/embed-tool
2. Enter your URL: https://neetchat3.vercel.app/chat
3. Check that "Embed Present" and "Embed Valid" are both green

## Files Modified

- `app/layout.tsx` - Added metadata API with OpenGraph, Twitter, and Farcaster tags
- `app/chat/layout.tsx` - New file with chat-specific metadata
- `components/FarcasterMeta.tsx` - Updated to use individual meta tags
- `public/.well-known/farcaster.json` - Updated image URLs to SVG
- `public/og-image.svg` - New OpenGraph image
- `public/logo.svg` - New logo image

