# Testing ENS Resolution Setup

## ✅ Setup Complete!

Your `.env.local` now has:
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/9RHumPs_pPYW34E9up20W
```

## 🧪 How to Test

### Step 1: Restart Dev Server

**Important**: Restart your dev server so it picks up the new environment variable:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 2: Test via API Route

Once your server is running, test the ENS API endpoint:

**In your browser, go to:**
```
http://localhost:3000/api/ens?name=vitalik.eth
```

**Expected response:**
```json
{
  "name": "vitalik.eth",
  "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
}
```

### Step 3: Test in Chat

1. **Connect your wallet** in the app
2. **Start or select a conversation**
3. **Send a message with an ENS mention:**
   ```
   Hey @vitalik.eth, how are you?
   ```
4. **The mention should:**
   - Be highlighted in blue
   - Show as clickable
   - Resolve to Vitalik's wallet address
   - Display wallet address on hover

### Step 4: Test Other ENS Names

Try these known ENS names:
- `@vitalik.eth` → Vitalik Buterin
- `@brantly.eth` → Brantly Millegan (ENS founder)
- `@bankless.eth` → Bankless DAO

## 🔍 Debugging

### Check Console Logs

Open browser DevTools (F12) and check the console for:
- ✅ `✅ Resolved ENS name: vitalik.eth → 0x...`
- ❌ `❌ Error resolving ENS name: ...`

### Test API Route Directly

If mentions aren't working, test the API route directly:

```bash
# Using curl
curl "http://localhost:3000/api/ens?name=vitalik.eth"

# Or in browser
http://localhost:3000/api/ens?name=vitalik.eth
```

### Common Issues

**Issue**: API returns 404 or error
- **Fix**: Make sure dev server is restarted
- **Fix**: Check that `ETH_RPC_URL` is in `.env.local` (not `.env`)
- **Fix**: Verify RPC URL is correct (no extra spaces)

**Issue**: Mentions not resolving in chat
- **Fix**: Check browser console for errors
- **Fix**: Verify IdentityProvider is wrapping the app (check `app/providers.tsx`)
- **Fix**: Check network tab to see if API calls are being made

**Issue**: "Rate limit" errors
- **Fix**: Alchemy free tier should be fine, but if you hit limits, wait a bit
- **Fix**: Check Alchemy dashboard for usage

## ✅ Success Indicators

You'll know it's working when:
1. ✅ API route returns address for `vitalik.eth`
2. ✅ Mentions in chat are blue and clickable
3. ✅ Hovering over mention shows wallet address
4. ✅ No errors in browser console

## 🎯 Next Steps

Once ENS is working:
1. **Add Farcaster support** (get Neynar API key)
2. **Add agents to directory** (`lib/identity/agents.ts`)
3. **Test full mention pipeline** (ENS → Farcaster → Directory)

---

**Need help?** Check the console logs and network tab in DevTools!

