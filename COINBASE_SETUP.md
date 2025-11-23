# Coinbase Developer Platform Setup for ENS Resolution

## Quick Setup Guide

The good news: **Your code already supports Coinbase Developer Platform!** The ENS resolver accepts any RPC URL via environment variables.

## Steps to Use Coinbase Developer Platform

### 1. Sign Up for Coinbase Developer Platform

1. Go to **[https://www.coinbase.com/developer-platform](https://www.coinbase.com/developer-platform)**
2. Click **"Get Started"** or **"Sign Up"**
3. Sign in with your Coinbase account or create a new account

### 2. Get Your RPC Endpoint

Coinbase Developer Platform provides RPC endpoints for Ethereum mainnet. The exact URL format depends on your account setup:

**Common formats:**
- `https://ethereum-mainnet.coinbase.com/v1/YOUR_API_KEY`
- `https://mainnet.base.org` (for Base network)
- Check your dashboard for the exact endpoint format

**To find your RPC URL:**
1. Log into Coinbase Developer Platform dashboard
2. Navigate to **"Networks"** or **"RPC Endpoints"** section
3. Select **Ethereum Mainnet**
4. Copy the **HTTPS RPC URL**

### 3. Add to .env.local

Add your Coinbase RPC URL to `.env.local`:

```bash
# ENS Resolution using Coinbase Developer Platform
ETH_RPC_URL=https://ethereum-mainnet.coinbase.com/v1/YOUR_API_KEY_HERE
```

**OR** if you need client-side access:

```bash
NEXT_PUBLIC_ETH_RPC_URL=https://ethereum-mainnet.coinbase.com/v1/YOUR_API_KEY_HERE
```

### 4. Restart Your Dev Server

```bash
npm run dev
```

### 5. Test It!

Send a message with an ENS mention:
```
Hey @vitalik.eth, how are you?
```

The mention should resolve using Coinbase's RPC endpoint!

---

## Why Use Coinbase Developer Platform?

✅ **Reliable Infrastructure**: Enterprise-grade reliability from Coinbase  
✅ **Consistent Integration**: If you're using Coinbase Wallet SDK or other Coinbase services  
✅ **Free Tier**: Available for development and testing  
✅ **Good Performance**: Optimized RPC endpoints  
✅ **Support**: Access to Coinbase's developer support  

---

## Code Compatibility

Your existing code in `lib/identity/ens.ts` already supports Coinbase RPC URLs:

```typescript
// This function accepts ANY RPC URL
function createEnsClient(rpcUrl?: string) {
  return createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl || process.env.ETH_RPC_URL || process.env.NEXT_PUBLIC_ETH_RPC_URL),
  });
}
```

**No code changes needed!** Just add the RPC URL to your environment variables.

---

## Troubleshooting

**Can't find the RPC URL in dashboard?**
- Check the "Networks" or "Endpoints" section
- Look for "Ethereum Mainnet" or "ETH Mainnet"
- Contact Coinbase Developer Platform support if needed

**RPC URL not working?**
- Verify the URL format matches what's in your dashboard
- Make sure you're using the mainnet endpoint (ENS only works on mainnet)
- Check that your API key has proper permissions

**Rate limits?**
- Check your Coinbase Developer Platform dashboard for usage limits
- Free tier should be sufficient for testing

---

## ⚠️ Important: Base vs Ethereum Mainnet

**Critical**: ENS resolution **only works on Ethereum mainnet**, not on Base.

- ✅ **Base RPC** → Great for Base dApps, but **cannot resolve ENS**
- ✅ **Ethereum Mainnet RPC** → **Required** for ENS resolution (`@name.eth` mentions)

### If Coinbase Only Provides Base RPC

If Coinbase Developer Platform only provides Base RPC endpoints (not Ethereum mainnet), you have two options:

**Option 1: Hybrid Approach (Recommended)**
1. **Use Coinbase/CDP for Base** (if you're building Base features)
2. **Use Alchemy/Infura for Ethereum mainnet** (for ENS resolution - REQUIRED)
3. Use both: Coinbase for Base, Alchemy for Ethereum mainnet

**Option 2: Ethereum Mainnet Only (Simplest)**
- Just use Alchemy/Infura for Ethereum mainnet
- This works because XMTP is chain-agnostic
- ENS mentions require Ethereum mainnet anyway

**Your `.env.local` for hybrid approach:**
```bash
# Base Network (optional, for Base-specific features)
BASE_RPC_URL=https://mainnet.base.org

# Ethereum Mainnet (REQUIRED for ENS resolution)
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
```

The code supports multiple RPC URLs - you can use different providers for different purposes!

---

## Complete .env.local Example with Coinbase

```bash
# WalletConnect Configuration
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=7154a31a007d2b483bb1fd66712a4e88

# XMTP Environment
NEXT_PUBLIC_XMTP_ENV=production

# ENS Resolution using Coinbase Developer Platform
ETH_RPC_URL=https://ethereum-mainnet.coinbase.com/v1/YOUR_COINBASE_API_KEY

# Farcaster Resolution (optional)
NEYNAR_API_KEY=your_neynar_api_key_here
```

---

**Need help?** Check the Coinbase Developer Platform documentation or support channels.

