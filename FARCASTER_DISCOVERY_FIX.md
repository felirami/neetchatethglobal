# Farcaster Mini App Discovery Fixes

## Issues Found

The mini app wasn't appearing in Farcaster's catalog due to:

1. **Incorrect Meta Tag Format**: The `fc:frame` meta tag was using individual tags instead of a JSON string
2. **Missing oEmbed Endpoint**: No oEmbed endpoint for proper embedding and discovery

## Fixes Applied

### 1. Fixed Meta Tag Format

**Before** (incorrect):
```html
<meta name="fc:frame" content="vNext" />
<meta name="fc:frame:image" content="..." />
<meta name="fc:frame:button:1" content="..." />
```

**After** (correct):
```html
<meta name="fc:frame" content='{"version":"next","imageUrl":"...","button":{"title":"💬 Chat","action":{"type":"launch_miniapp","name":"NeetChat","url":"...","splashImageUrl":"...","splashBackgroundColor":"#0ea5e9"}}}' />
```

### 2. Added oEmbed Endpoint

Created an oEmbed endpoint at `/.well-known/oembed.json` that returns:
- App metadata (title, description, thumbnail)
- Embed HTML for iframe embedding
- Proper CORS headers for cross-origin access

### 3. Updated Files

- `app/layout.tsx`: Updated metadata to use JSON string format
- `components/FarcasterMeta.tsx`: Updated client-side injection to use JSON format
- `app/api/.well-known/oembed/route.ts`: New oEmbed endpoint
- `next.config.js`: Added rewrite rule for oEmbed routing

## Testing

To verify the fixes:

1. **Check Meta Tag**: Visit https://neetchat3.vercel.app and inspect the HTML head
   - Should see `<meta name="fc:frame" content='{"version":"next",...}' />`

2. **Check oEmbed**: Visit https://neetchat3.vercel.app/.well-known/oembed.json
   - Should return valid JSON with app metadata

3. **Check Manifest**: Visit https://neetchat3.vercel.app/.well-known/farcaster.json
   - Should return valid manifest with accountAssociation and miniapp sections

## Next Steps

1. Deploy to Vercel
2. Wait for Farcaster to crawl and index the app (may take a few hours)
3. Check Farcaster's mini app catalog/search
4. If still not appearing, verify:
   - Domain is properly associated with Farcaster account
   - All URLs are accessible over HTTPS
   - Images are properly formatted (consider PNG/JPG instead of SVG)


