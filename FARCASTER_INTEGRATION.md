# Farcaster Mini App Integration

NeetChat has been integrated as a Farcaster Mini App! Here's what was implemented:

## ✅ Completed

1. **Installed Dependencies**
   - `@farcaster/miniapp-wagmi-connector` - Wagmi connector for Farcaster Mini App wallet
   - `@farcaster/miniapp-sdk` - Farcaster Mini App SDK

2. **Updated Wagmi Configuration**
   - Added `farcasterMiniApp()` connector (prioritized first)
   - Added Base chain support (required for Farcaster Mini Apps)
   - Kept existing connectors (injected, MetaMask, WalletConnect) as fallbacks

3. **Created Mini App Initialization**
   - `components/MiniAppInit.tsx` - Initializes Farcaster SDK when app loads
   - Calls `sdk.actions.ready()` to signal app is ready

4. **Added Farcaster Meta Tags**
   - `components/FarcasterMeta.tsx` - Adds `fc:frame` meta tag for embeds
   - Configures launch button and splash screen

5. **Created Manifest File**
   - `public/.well-known/farcaster.json` - Mini app manifest
   - Contains app metadata (name, icon, URLs, etc.)

## ⚠️ Still Needed

### 1. Sign the Manifest (Required for Production)

The `farcaster.json` file needs to be signed with your Farcaster custody address:

1. Deploy the app to production (Vercel)
2. Visit: https://farcaster.xyz/~/developers/new
3. Enter your domain (e.g., `neetchat3.vercel.app` or your custom domain)
4. Click "Claim Ownership"
5. Sign with your Farcaster custody address (using your phone)
6. Copy the signed manifest (includes `accountAssociation` section)
7. Update `public/.well-known/farcaster.json` with the signed version
8. Redeploy

### 2. Update URLs in Manifest

Update the URLs in `public/.well-known/farcaster.json` to match your production domain:
- `homeUrl`: Your production chat URL
- `iconUrl`: Logo image URL
- `imageUrl`: OpenGraph image URL
- `splashImageUrl`: Splash screen image URL

### 3. Create Assets

Create and upload these images:
- Logo (`/logo.png`) - App icon
- OpenGraph image (`/og-image.png`) - Preview image for embeds
- Splash screen image - Shown when launching the mini app

## How It Works

When users open NeetChat from Farcaster:
1. Farcaster client loads the mini app
2. `MiniAppInit` component calls `sdk.actions.ready()`
3. Wagmi automatically connects to Farcaster wallet via `farcasterMiniApp()` connector
4. User can immediately start chatting without manual wallet connection
5. XMTP client initializes with the Farcaster wallet

## Testing

To test locally:
1. The app will work normally (Farcaster SDK won't be available)
2. The `farcasterMiniApp()` connector will gracefully fall back to other connectors
3. To test as a mini app, you need to deploy and access via Farcaster client

## Benefits

- **Seamless UX**: Users don't need to manually connect wallets
- **Native Integration**: Works directly within Farcaster clients
- **Social Discovery**: Users can share and discover chats via Farcaster
- **Identity Integration**: Leverages Farcaster's social graph for mentions

## Files Modified

- `app/providers.tsx` - Added Farcaster connector and Base chain
- `app/layout.tsx` - Added MiniAppInit and FarcasterMeta components
- `components/MiniAppInit.tsx` - New component for SDK initialization
- `components/FarcasterMeta.tsx` - New component for meta tags
- `public/.well-known/farcaster.json` - New manifest file
- `package.json` - Added Farcaster dependencies


