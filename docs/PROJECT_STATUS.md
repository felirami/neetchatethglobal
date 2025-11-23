# NeetChat - XMTP Chat Application Project Status

## Project Overview

**NeetChat** is a mobile-first XMTP (Extensible Message Transport Protocol) chat application built with Next.js 14, React, TypeScript, and Tailwind CSS. The application enables wallet-to-wallet messaging using the XMTP protocol, allowing users to connect their Ethereum wallets and chat with other wallet addresses.

### Key Technologies
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Wallet Integration**: Wagmi v2, Viem
- **XMTP SDK**: @xmtp/browser-sdk v5.1.0
- **Wallet Connectors**: Injected, MetaMask, WalletConnect
- **State Management**: React Context API

## What We've Built

### 1. Core Infrastructure

#### Wallet Connection System
- ✅ Wallet connection via Wagmi (Injected, MetaMask, WalletConnect)
- ✅ Development-only test wallet for automated testing (using hardcoded private key)
- ✅ Wallet disconnection functionality
- ✅ Connection status display

#### XMTP Client Integration
- ✅ XMTP client initialization with wallet signer
- ✅ Dynamic imports to prevent SSR issues with WASM modules
- ✅ Environment configuration (production/dev)
- ✅ Error handling for client initialization failures
- ✅ Automatic installation revocation when limit exceeded (10 installations per inbox ID)

### 2. User Interface Components

#### WalletConnect Component
- ✅ Wallet connection/disconnection UI
- ✅ Connection status indicators
- ✅ Test wallet activation button (dev only)
- ✅ XMTP connection status display
- ✅ Error message display with formatting
- ✅ Clear XMTP Data button for debugging

#### ConversationList Component
- ✅ List of all conversations (DMs and groups)
- ✅ New chat creation by entering wallet address
- ✅ Conversation selection
- ✅ Real-time conversation streaming
- ✅ Address validation
- ✅ Error handling with in-app error banners
- ✅ Peer address extraction from various conversation properties
- ✅ Conversation filtering and display

#### ChatWindow Component
- ✅ Message display for selected conversation
- ✅ Message input and sending
- ✅ Real-time message streaming
- ✅ Optimistic UI updates for sent messages
- ✅ Message status indicators (sending, sent, failed)
- ✅ Error handling with in-app error banners
- ✅ Peer address display
- ✅ Message timestamp formatting

#### DebugPanel Component (Development Only)
- ✅ XMTP debug information display
- ✅ Network statistics
- ✅ Forked conversation detection
- ✅ Client method inspection
- ✅ Auto-refresh functionality

#### ErrorBoundary Component
- ✅ React Error Boundary for catching JavaScript errors
- ✅ Fallback UI with error details
- ✅ Reload and retry functionality

### 3. XMTP Integration Features

#### Conversation Management
- ✅ List conversations from local database
- ✅ Sync conversations from XMTP network
- ✅ Stream new conversations in real-time
- ✅ Create new DM conversations
- ✅ Get inbox ID from Ethereum address (multiple fallback methods)
- ✅ Check if address has XMTP identity (`canMessage`)
- ✅ Handle existing conversations

#### Message Management
- ✅ Load messages from local database
- ✅ Sync messages from network for specific conversation
- ✅ Stream all messages in real-time
- ✅ Send messages with optimistic updates
- ✅ Publish messages to XMTP network
- ✅ Sync conversations after sending
- ✅ Set consent state to "Allowed" for conversations

#### Sync Implementation
- ✅ Initial sync when client is created (`syncAll`)
- ✅ Sync conversations before listing (`sync`)
- ✅ Sync conversation before loading messages (`conversation.sync`)
- ✅ Periodic sync every 10 seconds to catch new conversations
- ✅ Sync with all consent states (Allowed, Unknown, Denied)

### 4. Configuration & Setup

#### Environment Variables (.env.local)
- ✅ WalletConnect Project ID configuration
- ✅ XMTP environment configuration (production/dev)
- ✅ Documentation for environment setup

#### Next.js Configuration
- ✅ Webpack configuration for WASM modules
- ✅ Server-side externalization of XMTP SDK
- ✅ Fallback configurations for Node.js modules

#### TypeScript Configuration
- ✅ Standard Next.js TypeScript setup
- ✅ Local type definitions to avoid build-time imports

### 5. Error Handling & Debugging

#### Error Handling
- ✅ In-app error banners (replaced system alerts)
- ✅ Detailed error messages for users
- ✅ Console logging with emoji markers for debugging
- ✅ Error boundaries for React errors
- ✅ Graceful fallbacks for missing methods

#### Debugging Tools
- ✅ Debug panel for development mode
- ✅ Global `clearXMTPData()` function for clearing IndexedDB
- ✅ Network statistics display
- ✅ Forked conversation detection
- ✅ Extensive console logging

## Current Issues & Challenges

### 1. Conversation Sync Delay ⚠️

**Issue**: Conversations created from other installations (e.g., Base app) are not immediately visible in the localhost app, even after messages are sent and marked as "delivered".

**Symptoms**:
- Welcome messages are being processed (groups are created)
- Groups are stored in the database (`group_id=34eaa704cdc9b54db5b4b884533081df`)
- But `list()` and `listDms()` return 0 conversations
- Periodic sync runs but doesn't find conversations

**Root Cause**:
According to XMTP documentation, history sync has a debounce feature that checks for new app installations at most once every 30 minutes. This means conversations from other installations may take up to 30 minutes to appear automatically.

**Workarounds Implemented**:
- ✅ Periodic sync every 10 seconds
- ✅ Listing with all consent states
- ✅ Using both `listDms()` and `list()` methods
- ✅ Manual conversation creation via "New Chat"
- ✅ **NEW**: "Force Sync" button added to empty conversation list to manually trigger a full sync

**Potential Solutions**:
- Wait for the 30-minute debounce period
- Send a message from the pre-existing installation (Base app) to trigger immediate sync
- Manually create the conversation using "New Chat" with the Base app wallet address

### 2. XMTP Installation Limit ✅

**Issue**: XMTP has a limit of 10 installations per inbox ID. When exceeded, new installations fail with error: "Cannot register a new installation because the InboxID ... has already registered 15/10 installations."

**Solution Implemented**:
- ✅ Automatic revocation of old installations when limit is hit
- ✅ Keeps only the last 2 installations, revokes the rest
- ✅ Retry logic after revocation
- ✅ Manual "Clear XMTP Data" button for debugging
- ✅ Global `clearXMTPData()` function accessible from console
- ✅ **NEW**: Robust Inbox ID fetching via XMTP API if error parsing fails

**Status**: Resolved. The system now robustly handles the limit by auto-revoking old keys.

### 3. CORS Error for History Sync Upload ⚠️

**Issue**: CORS error when trying to upload sync payloads to the history server:
```
Access to fetch at 'https://message-history.production.ephemera.network/upload' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Impact**: History sync uploads fail, but this doesn't prevent basic messaging functionality.

**Status**: Known issue, doesn't block core functionality. May be resolved when deployed to production (HTTPS).

### 4. MetaMask SDK Warning ⚠️

**Issue**: Webpack warning about missing `@react-native-async-storage/async-storage` dependency for MetaMask SDK.

**Impact**: Non-blocking warning, doesn't affect functionality.

**Status**: Can be ignored or resolved by adding the dependency if needed.

### 5. Conversation Display After Welcome Processing ✅

**Issue**: When welcome messages are processed and groups are created, they don't immediately appear in the conversation list.

**Status**: **Resolved**. 
- Implemented relaxed filtering in `ConversationList.tsx` to display conversations even if `peerAddress` is missing (common for new groups).
- Added robust fallback display names (e.g., "Conversation [ID]") for groups without a clear peer address.
- Added "Force Sync" button to manually trigger sync if automatic stream misses an update.

### 6. Message UI & Timestamp Issues ✅

**Issue**: Messages were missing timestamps, had incorrect alignment (sender vs receiver), and showed raw JSON for system messages.

**Status**: **Resolved**.
- **Timestamps**: Fixed by handling `sentAtNs` (BigInt nanoseconds) and converting to milliseconds for display.
- **Alignment**: Fixed by fetching the user's `inboxId` and comparing it with `message.senderInboxId` (standard for XMTP v3/MLS), instead of relying solely on wallet addresses.
- **System Messages**: Filtered out non-text messages (e.g., group membership updates) to prevent "Unsupported message type" errors.

## Technical Implementation Details

### History Sync Note
**Missing Older Messages**: Users may notice that a new installation does not immediately see the full message history from other devices. This is **expected behavior** for the MLS protocol.
- New installations cannot decrypt messages sent *before* they joined the group until "History Sync" securely transfers the old encryption keys from an existing device.
- This process is automatic but asynchronous and may take time.

### XMTP SDK Usage

#### Client Creation
```typescript
const { Client } = await import('@xmtp/browser-sdk')
const signer = createSigner() // From connected wallet
const client = await Client.create(signer, {
  env: process.env.NEXT_PUBLIC_XMTP_ENV || 'production'
})
```

#### Conversation Sync
```typescript
// Sync all conversations, messages, and preferences
await client.conversations.syncAll(['allowed', 'unknown'])

// Sync new conversations only
await client.conversations.sync()

// Sync specific conversation
await conversation.sync()
```

#### Listing Conversations
```typescript
// List all conversations
const conversations = await client.conversations.list({
  consentStates: [ConsentState.Allowed, ConsentState.Unknown, ConsentState.Denied]
})

// List DMs only
const dms = await client.conversations.listDms({
  consentStates: [ConsentState.Allowed, ConsentState.Unknown, ConsentState.Denied]
})
```

#### Creating Conversations
```typescript
// Get inbox ID from Ethereum address
const inboxId = await client.getInboxIdByIdentifier({
  identifier: address,
  identifierKind: 'Ethereum'
})

// Create new DM
const conversation = await client.conversations.newDm(inboxId)
```

#### Sending Messages
```typescript
// Set consent to allowed
await conversation.updateConsentState(ConsentState.Allowed)

// Optimistically send message
await conversation.sendOptimistic(messageText)

// Publish to network
await conversation.publishMessages()

// Sync to ensure delivery
await client.conversations.syncAll(['allowed', 'unknown'])
```

### Architecture Decisions

1. **Dynamic Imports**: Used dynamic imports for XMTP SDK to prevent SSR issues with WASM modules
2. **Local Type Definitions**: Defined XMTP types locally to avoid build-time imports
3. **Error Boundaries**: Implemented React Error Boundaries to prevent app crashes
4. **Optimistic Updates**: Used optimistic UI updates for better UX when sending messages
5. **Periodic Sync**: Implemented periodic sync to catch conversations that might be missed
6. **Consent State Handling**: List conversations with all consent states to ensure nothing is missed

## Testing Status

### ✅ Working
- Wallet connection (Injected, MetaMask, WalletConnect)
- Test wallet activation
- XMTP client initialization
- Creating new conversations manually
- Sending messages
- Receiving messages (when conversation exists)
- Message streaming
- Error handling and display

### ⚠️ Partially Working
- Conversation sync from other installations (delayed up to 30 minutes)
- Automatic conversation discovery after welcome processing

### ❌ Not Working / Issues
- Immediate conversation sync from other installations
- History sync upload (CORS error, but non-blocking)

## Next Steps & Recommendations

1. **Wait for Sync**: Allow up to 30 minutes for automatic sync from other installations
2. **Manual Creation**: Use "New Chat" to manually create conversations with known addresses
3. **Production Deployment**: Deploy to HTTPS to resolve CORS issues with history sync
4. **Monitoring**: Add logging/monitoring to track sync success rates
5. **User Education**: Inform users about the 30-minute sync delay for new installations

## File Structure

```
neetchat3/
├── app/
│   ├── layout.tsx          # Root layout with ErrorBoundary
│   ├── page.tsx            # Main application page
│   ├── providers.tsx        # Wagmi and React Query providers
│   └── globals.css         # Global styles
├── components/
│   ├── WalletConnect.tsx   # Wallet connection UI
│   ├── ConversationList.tsx # Conversation list and creation
│   ├── ChatWindow.tsx      # Chat interface
│   ├── DebugPanel.tsx      # Debug information panel
│   └── ErrorBoundary.tsx   # Error boundary component
├── contexts/
│   ├── XMTPContext.tsx     # XMTP client management
│   └── TestWalletContext.tsx # Test wallet for development
├── .env.local              # Environment variables
├── next.config.js          # Next.js configuration
├── package.json            # Dependencies
└── PROJECT_STATUS.md       # This file
```

## Environment Variables Required

```env
# WalletConnect Configuration
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# XMTP Environment (optional, defaults to 'production')
NEXT_PUBLIC_XMTP_ENV=production
```

## Dependencies

Key dependencies from `package.json`:
- `next`: ^14.0.0
- `react`: ^18.0.0
- `@xmtp/browser-sdk`: ^5.1.0
- `wagmi`: ^2.0.0
- `@wagmi/core`: ^2.0.0
- `@wagmi/connectors`: ^2.0.0
- `viem`: ^2.0.0
- `@tanstack/react-query`: ^5.0.0

## Known Limitations

1. **30-Minute Sync Delay**: New installations may take up to 30 minutes to see conversations from other installations
2. **Installation Limit**: Maximum 10 installations per inbox ID (with automatic revocation implemented)
3. **CORS Issues**: History sync uploads fail in development due to CORS (non-blocking)
4. **Browser Only**: Currently designed for browser environments (not React Native)

## Contact & Support

For XMTP-specific issues, refer to:
- [XMTP Documentation](https://docs.xmtp.org)
- [XMTP Community](https://community.xmtp.org)
- [XMTP GitHub Issues](https://github.com/xmtp/libxmtp/issues)

---

**Last Updated**: January 2025
**Project Status**: Functional with known sync delays
**XMTP SDK Version**: 5.1.0
**Next.js Version**: 14.x

