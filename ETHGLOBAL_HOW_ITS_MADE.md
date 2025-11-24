# NeetChat - How It's Made

## Architecture & Tech Stack

NeetChat is built on **Next.js 14** with the App Router, using **TypeScript** for type safety and **Tailwind CSS** for styling. The core messaging functionality leverages **XMTP Browser SDK v5.1.0**, which uses WebAssembly (WASM) for cryptographic operations. We handle WASM modules by using dynamic imports to prevent SSR issues, configuring webpack to properly bundle WASM, and externalizing the XMTP SDK on the server-side.

**Wallet Integration**: We use **Wagmi v2** with **Viem** for wallet connection, supporting MetaMask, WalletConnect, and injected wallets. The wallet signer is passed directly to the XMTP client for message signing and authentication.

**State Management**: React Context API manages XMTP client state, identity resolution cache, and test wallet state. We use React Query (via Wagmi) for wallet connection state management.

## Partner Technologies & Integration

**XMTP Protocol**: The foundation of NeetChat. We use XMTP's MLS (Message Layer Security) protocol for end-to-end encryption. The SDK handles key management, message encryption/decryption, and network synchronization. We implemented proper handling of XMTP V3/MLS nuances like nanosecond timestamps (`sentAtNs` as BigInt), inboxId-based message alignment (since `senderAddress` is often missing in V3), and forward secrecy.

**Farcaster Integration**: We integrate with Farcaster via the **Neynar API** for identity resolution. When users mention `@username`, we query Neynar's API to resolve Farcaster usernames to wallet addresses. This enables seamless social graph integration where users can mention Farcaster users directly in XMTP conversations.

**ENS Resolution**: Using **Viem**, we resolve ENS names (`.eth` domains) to Ethereum addresses. The resolution pipeline checks Farcaster first, then ENS, then a local agent directory, providing a robust multi-protocol identity resolution system.

**Filecoin Integration** (Planned): For file attachments, we plan to use Filecoin's decentralized storage network. Files would be uploaded to Filecoin, with content identifiers (CIDs) stored in XMTP messages, maintaining decentralization while enabling rich media sharing.

**Base & World App**: Native integration with Base network and World App wallet enables cross-chain messaging. We detect the user's network and handle address resolution accordingly.

**DeFi Oracles** (Planned): Integration with on-chain oracles (like Chainlink) to display real-time token prices and market data directly in chat conversations.

## Notable Technical Solutions & Hacks

**1. Server-Side API Proxy for CORS Bypass**: We created a Next.js API route (`/api/xmtp/identity`) that proxies XMTP identity queries server-side. This bypasses browser CORS restrictions when querying XMTP's identity endpoints, allowing us to try multiple fallback endpoints without hitting browser security limits.

**2. localStorage Mapping System**: Since XMTP V3/MLS conversations don't always have `peerAddress` stored on the conversation object, we implemented a localStorage-based mapping system. We store `conversationId → walletAddress` mappings, allowing us to restore peer addresses on page load. This enables conversation matching even when metadata is missing.

**3. InboxId-Based Conversation Matching**: Instead of relying solely on wallet addresses (which can be missing), we implemented inboxId-based matching. We first try to resolve the target address to an inboxId using `client.findInboxIdByIdentifier`, then match conversations by `peerInboxId`. This aligns with XMTP V3/MLS architecture where inboxIds are primary identifiers.

**4. Automatic Conversation Identification**: When conversations lack address metadata, we automatically identify them by checking message senders. We iterate through conversations without addresses, fetch their messages, and check if any `senderAddress` or `senderInboxId` matches the target address. When found, we auto-map the conversation in localStorage.

**5. Dynamic WASM Loading**: To prevent SSR hydration errors with XMTP's WASM modules, we use dynamic imports (`await import('@xmtp/browser-sdk')`) only on the client-side. We also configured webpack to properly handle WASM files and externalized the SDK on the server.

**6. DB Lock Retry Logic**: When refreshing the page, the XMTP IndexedDB can still be locked by the previous session. We implemented retry logic with exponential backoff to handle `NoModificationAllowedError`, preventing unnecessary identity creation.

**7. Error Pattern Matching**: XMTP SDK sometimes throws exceptions that are actually success messages (e.g., "synced X messages, 0 failed Y succeeded"). We implemented pattern matching to identify these false positives and treat them as successes, improving UX without hiding genuine errors.

**8. Mention Resolution Pipeline**: We built a multi-protocol resolution pipeline that checks Farcaster → ENS → Local Directory → Fallback. We cache resolved identities in React Context to prevent redundant API calls. The system distinguishes between `@username` (Farcaster) and `username.eth` (ENS) based on the `@` prefix.

**9. Test Wallet Persistence**: For development, we created a test wallet context that persists state in localStorage. This mimics real wallet connectors and provides a smoother development experience without requiring repeated signatures.

**10. Conversation Sync Strategy**: We implement multiple sync strategies: initial `syncAll()` when client is created, periodic sync every 10 seconds, sync before listing conversations, and sync after sending messages. We sync with all consent states (Allowed, Unknown, Denied) to ensure nothing is missed.

## Technical Challenges Overcome

- **XMTP V3/MLS Protocol Nuances**: Handling nanosecond timestamps, missing `senderAddress` fields, and inboxId-based identification required deep understanding of the protocol.

- **Conversation Matching**: When `findInboxIdByIdentifier` fails and conversations lack `peerAddress`, we built a cascade of fallback methods: inboxId matching → address matching → localStorage matching → message sender checking.

- **CORS Restrictions**: Browser CORS prevented direct XMTP API queries, so we built server-side proxies to handle identity resolution.

- **WASM SSR Issues**: WebAssembly modules can't run server-side, so we used dynamic imports and proper webpack configuration to handle WASM only on the client.

- **Installation Limit Management**: XMTP limits installations to 10 per inboxId. We implemented automatic revocation of old installations, keeping only the last 2 active.

## Development Tools

We built comprehensive debugging tools: a Debug Panel showing XMTP client state, network statistics, and forked conversation detection. We expose global utilities like `window.inspectXMTPMappings()`, `window.addXMTPMapping()`, and `window.resolveForkedConversations()` for console-based debugging.

The architecture is modular, with clear separation between wallet integration, XMTP client management, identity resolution, and UI components. This makes it easy to extend with new features like Filecoin storage, oracle integration, and additional chain support.


