# Base vs Ethereum Mainnet for ENS Resolution

## ⚠️ Important: ENS Only Works on Ethereum Mainnet

**Critical Technical Fact**: ENS (Ethereum Name Service) domains are registered and resolved **only on Ethereum mainnet**, not on Base or other Layer 2 networks.

This means:
- ✅ **Ethereum Mainnet RPC** → Can resolve `@vitalik.eth` ✅
- ❌ **Base RPC** → **Cannot** resolve ENS names ❌

---

## Why Base Won't Work for ENS Resolution

ENS is a protocol that lives on Ethereum mainnet. When you resolve `vitalik.eth`, the lookup happens on Ethereum mainnet's ENS registry contract, not on Base.

**Base is great for:**
- ✅ Building dApps with lower gas fees
- ✅ Fast transactions
- ✅ Coinbase ecosystem integration
- ✅ Popular and widely adopted

**But Base cannot:**
- ❌ Resolve ENS names (`.eth` domains)
- ❌ Access Ethereum mainnet ENS registry

---

## Recommended Setup: Hybrid Approach

Since Base is popular and Coinbase Developer Platform offers it, here's the best approach:

### Option 1: Use Both (Recommended)

**Use Coinbase/CDP for Base** (if you're building Base features):
- Get Base RPC from Coinbase Developer Platform
- Use it for Base-specific features

**Use Ethereum Mainnet RPC for ENS** (required for mentions):
- Get Ethereum mainnet RPC from Alchemy/Infura (or Coinbase if they provide it)
- Use it specifically for ENS resolution

**Your `.env.local` would look like:**
```bash
# Base Network (for Base-specific features)
BASE_RPC_URL=https://mainnet.base.org

# Ethereum Mainnet (REQUIRED for ENS resolution)
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
```

### Option 2: Ethereum Mainnet Only (Simplest)

If you're primarily focused on ENS mentions and XMTP messaging:

**Just use Ethereum mainnet RPC:**
```bash
# ENS Resolution (works for both mainnet and mentions)
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
```

This works because:
- XMTP works on any chain (it's chain-agnostic)
- ENS mentions need Ethereum mainnet
- You can still interact with Base addresses via XMTP

---

## Current Code Status

Your ENS resolver in `lib/identity/ens.ts` is **hardcoded to Ethereum mainnet**:

```typescript
import { mainnet } from 'viem/chains';  // ← Ethereum mainnet

function createEnsClient(rpcUrl?: string) {
  return createPublicClient({
    chain: mainnet,  // ← Must be mainnet for ENS
    transport: http(rpcUrl || process.env.ETH_RPC_URL || ...),
  });
}
```

**This is correct!** ENS resolution MUST use Ethereum mainnet.

---

## What About Base-Specific Features?

If you want to add Base-specific features later (like checking Base balances, Base transactions, etc.), you can:

1. **Add Base chain support** to `app/providers.tsx`:
   ```typescript
   import { base } from 'wagmi/chains'
   
   const config = createConfig({
     chains: [mainnet, base],  // Add Base
     // ...
   })
   ```

2. **Use Base RPC for Base-specific operations** (separate from ENS)

3. **Keep ENS resolution on Ethereum mainnet** (as it must be)

---

## Recommendation for ETHGlobal Hackathon

**For your XMTP mentions feature:**

1. ✅ **Use Ethereum mainnet RPC** (Alchemy/Infura) for ENS resolution
2. ✅ **Optional**: Add Base support if you want Base-specific features
3. ✅ **Keep it simple**: Focus on getting ENS mentions working first

**Why?**
- ENS mentions require Ethereum mainnet (no choice)
- XMTP works regardless of chain
- You can add Base later if needed
- Simpler = faster to demo

---

## Quick Setup for ENS Mentions

**Just get an Ethereum mainnet RPC:**

1. **Alchemy** (easiest): https://www.alchemy.com/
   - Free tier: 300M compute units/month
   - Perfect for hackathon

2. **Infura** (also free): https://www.infura.io/
   - Similar free tier

3. **Coinbase** (if they provide Ethereum mainnet RPC):
   - Check your CDP dashboard
   - Use it if available

**Add to `.env.local`:**
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
```

**That's it!** Your ENS mentions will work.

---

## Summary

| Feature | Base RPC | Ethereum Mainnet RPC |
|---------|----------|---------------------|
| ENS Resolution (`@name.eth`) | ❌ No | ✅ Yes (Required) |
| XMTP Messaging | ✅ Yes | ✅ Yes |
| Base dApp Features | ✅ Yes | ❌ No |
| Popular/Used | ✅ Yes | ✅ Yes |

**For ENS mentions**: You **must** use Ethereum mainnet RPC.

**For Base features**: You can use Base RPC, but keep Ethereum mainnet for ENS.

