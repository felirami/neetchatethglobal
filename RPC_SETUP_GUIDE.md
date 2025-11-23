# RPC URL Setup Guide for Mentions Testing

## Quick Start: Alchemy (Recommended - Easiest & Free)

### Step 1: Sign up for Alchemy
1. Go to **[https://www.alchemy.com/](https://www.alchemy.com/)**
2. Click "Sign Up" (free account)
3. Sign up with email or GitHub

### Step 2: Create an App
1. Once logged in, click **"Create App"** or go to Dashboard
2. Fill in:
   - **App Name**: `NeetChat` (or any name)
   - **Chain**: Select **Ethereum**
   - **Network**: Select **Mainnet** (ENS only works on mainnet)
3. Click **"Create App"**

### Step 3: Get Your RPC URL
1. Click on your newly created app
2. Click **"View Key"** button
3. Copy the **HTTP** URL (looks like: `https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY`)
4. This is your RPC URL!

### Step 4: Add to .env.local
Add this line to your `.env.local` file:

```bash
# ENS Resolution (for @name.eth mentions)
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY_HERE
# OR use NEXT_PUBLIC_ prefix for client-side access:
NEXT_PUBLIC_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY_HERE
```

**Note**: The code supports both `ETH_RPC_URL` (server-side) and `NEXT_PUBLIC_ETH_RPC_URL` (client-side). For API routes, use `ETH_RPC_URL`.

---

## Alternative Options

### Option 2: Coinbase Developer Platform (Recommended for Coinbase Integration)

Coinbase Developer Platform provides reliable RPC endpoints for Ethereum mainnet, perfect for ENS resolution.

#### Step 1: Sign up for Coinbase Developer Platform
1. Go to **[https://www.coinbase.com/developer-platform](https://www.coinbase.com/developer-platform)**
2. Click "Get Started" or "Sign Up"
3. Sign up with your Coinbase account or create a new account

#### Step 2: Create an API Key
1. Once logged in, go to **Dashboard** or **API Keys** section
2. Click **"Create API Key"** or **"New API Key"**
3. Fill in:
   - **Name**: `NeetChat ENS` (or any name)
   - **Network**: Select **Ethereum Mainnet**
4. Copy your API key

#### Step 3: Get Your RPC URL
Coinbase Developer Platform typically provides RPC endpoints in this format:
- **Format**: `https://mainnet.base.org` (for Base) or similar for Ethereum
- **With API Key**: Usually `https://ethereum-mainnet.coinbase.com/v1/YOUR_API_KEY` or similar

**Note**: The exact URL format may vary. Check your Coinbase Developer Platform dashboard for the exact RPC endpoint URL format.

#### Step 4: Add to .env.local
```bash
# ENS Resolution using Coinbase Developer Platform
ETH_RPC_URL=https://ethereum-mainnet.coinbase.com/v1/YOUR_API_KEY
# OR (check your dashboard for exact format)
NEXT_PUBLIC_ETH_RPC_URL=https://YOUR_COINBASE_RPC_ENDPOINT
```

**Benefits of Coinbase Developer Platform**:
- ✅ Reliable infrastructure from Coinbase
- ✅ Good for projects already using Coinbase services
- ✅ Free tier available
- ✅ Enterprise-grade reliability

**Note**: If you're already using Coinbase services (like Coinbase Wallet SDK), using their RPC endpoints can provide better integration and consistency.

---

### Option 3: Infura (Also Free)
1. Go to **[https://www.infura.io/](https://www.infura.io/)**
2. Sign up for free account
3. Create a new project
4. Select **Ethereum** → **Mainnet**
5. Copy the **HTTPS Endpoint** URL
6. Format: `https://mainnet.infura.io/v3/YOUR_PROJECT_ID`

### Option 4: QuickNode (Free Tier Available)
1. Go to **[https://www.quicknode.com/](https://www.quicknode.com/)**
2. Sign up and create an endpoint
3. Select **Ethereum Mainnet**
4. Copy the HTTP URL

### Option 5: Public RPC (No Signup, But Slower)
If you don't want to sign up, you can use public RPCs (but they're slower and may have rate limits):

```bash
# Public Ethereum RPC (no signup needed, but slower)
ETH_RPC_URL=https://eth.llamarpc.com
# OR
ETH_RPC_URL=https://rpc.ankr.com/eth
```

**Note**: Public RPCs work but may be slower and have rate limits. For hackathon testing, Alchemy's free tier is recommended.

---

## For Farcaster Mentions (Neynar API)

You'll also need a Neynar API key for `@username` mentions:

1. Go to **[https://neynar.com/](https://neynar.com/)**
2. Sign up for free account
3. Go to Dashboard → API Keys
4. Create a new API key
5. Add to `.env.local`:

```bash
# Farcaster Resolution (for @username mentions)
NEYNAR_API_KEY=your_neynar_api_key_here
```

---

## Complete .env.local Example

```bash
# WalletConnect Configuration
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=7154a31a007d2b483bb1fd66712a4e88

# XMTP Environment
NEXT_PUBLIC_XMTP_ENV=production

# ENS Resolution (for @name.eth mentions)
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY

# Farcaster Resolution (for @username mentions)
NEYNAR_API_KEY=your_neynar_api_key_here
```

---

## Testing After Setup

1. **Restart your dev server** after adding env vars:
   ```bash
   npm run dev
   ```

2. **Test ENS mentions**:
   - Send a message: `"Hey @vitalik.eth how are you?"`
   - The mention should resolve to Vitalik's wallet address

3. **Test Farcaster mentions** (if you have Neynar API key):
   - Send a message: `"gm @dwr"` (or any Farcaster username)
   - The mention should resolve to their wallet address

4. **Check console** for any errors or resolution logs

---

## Troubleshooting

- **ENS not resolving?**
  - Make sure RPC URL is correct
  - Check that you're using mainnet (ENS only works on mainnet)
  - Try a known ENS name like `vitalik.eth`

- **Farcaster not resolving?**
  - Verify NEYNAR_API_KEY is set correctly
  - Check Neynar dashboard for API key status
  - Try a known Farcaster username

- **Rate limits?**
  - Alchemy free tier: 300M compute units/month (plenty for testing)
  - If hitting limits, try public RPC as fallback

