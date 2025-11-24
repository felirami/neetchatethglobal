# Testing XMTP Chat on Production

## Current Configuration

✅ **XMTP Environment**: Production (`env: 'production'`)
✅ **Server**: Running on http://localhost:3000
✅ **Wallet Support**: MetaMask, WalletConnect, Injected Wallets

## How to Test Chat Functionality

### Prerequisites

1. **Two Ethereum Wallets** with XMTP enabled:
   - Both wallets need to have an XMTP identity created
   - You can use MetaMask or any Web3 wallet
   - Make sure both wallets are on Ethereum Mainnet (or the same network)

2. **XMTP Identity**:
   - When you first connect a wallet, XMTP will automatically create an identity if one doesn't exist
   - You'll need to sign a message to register the XMTP identity

### Testing Steps

#### Option 1: Test with Two Browser Windows/Tabs

1. **Open First Window**:
   - Navigate to http://localhost:3000
   - Connect Wallet #1 (e.g., MetaMask Account 1)
   - Wait for "✓ XMTP Connected" message

2. **Open Second Window** (Incognito/Private or different browser):
   - Navigate to http://localhost:3000
   - Connect Wallet #2 (e.g., MetaMask Account 2)
   - Wait for "✓ XMTP Connected" message

3. **Start a Conversation**:
   - In Window 1: Enter Wallet #2's address in the "New Chat" input field
   - Click "New Chat" button
   - The conversation should appear in the list

4. **Send Messages**:
   - Type a message in Window 1 and click "Send"
   - Switch to Window 2 and check if the message appears
   - Reply from Window 2 and verify it appears in Window 1

#### Option 2: Test with Mobile Wallet

1. **Desktop Browser**:
   - Connect Wallet #1
   - Wait for XMTP connection

2. **Mobile Wallet** (with WalletConnect):
   - Scan QR code from WalletConnect option
   - Connect Wallet #2
   - Use the mobile wallet's address to start a conversation from desktop

### Important Notes

⚠️ **Production Network**:
- The app is configured for XMTP Production network
- Messages sent here are real and persistent
- Make sure you're testing with wallets you control

⚠️ **Wallet Addresses**:
- Use full Ethereum addresses (0x...)
- Addresses must be 42 characters long
- Both wallets must have XMTP identities

⚠️ **First-Time Setup**:
- First connection may take longer as XMTP creates the identity
- You'll need to sign a message to register
- Subsequent connections will be faster

### Troubleshooting

**"Failed to create conversation"**:
- Make sure the target wallet has an XMTP identity
- Verify the address is correct (42 characters, starts with 0x)
- Check browser console for detailed error messages

**Messages not appearing**:
- Make sure both wallets are connected
- Check that you're using the correct wallet addresses
- Refresh the page if messages don't appear

**XMTP connection fails**:
- Check browser console for errors
- Make sure your wallet is connected to Ethereum Mainnet
- Try disconnecting and reconnecting your wallet

### Testing Checklist

- [ ] Connect Wallet #1 successfully
- [ ] See "✓ XMTP Connected" status
- [ ] Connect Wallet #2 successfully  
- [ ] Create new conversation with Wallet #2's address
- [ ] Send message from Wallet #1
- [ ] Receive message in Wallet #2
- [ ] Send reply from Wallet #2
- [ ] Receive reply in Wallet #1
- [ ] Conversation persists after page refresh

## Switching to Dev Environment

If you want to test on the dev environment instead, change this line in `contexts/XMTPContext.tsx`:

```typescript
env: 'dev', // Change from 'production' to 'dev'
```

The dev environment is useful for testing without affecting production data.



