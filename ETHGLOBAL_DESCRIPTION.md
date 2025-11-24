# NeetChat - ETHGlobal Submission Description

**NeetChat** is a mobile-first, wallet-to-wallet messaging application built on XMTP (Extensible Message Transport Protocol) that enables secure, decentralized communication between Ethereum wallet addresses. Built with Next.js 14, TypeScript, and the XMTP Browser SDK v5.1.0, NeetChat provides a modern chat experience that works entirely on-chain without requiring traditional usernames or centralized servers.

## Core Messaging Features

**@Mentions with Multi-Protocol Identity Resolution**: NeetChat's intelligent mention system resolves identities across multiple protocols. Users can mention others using `@username` (Farcaster), `@name.eth` (ENS), or `@agent` (XMTP agent directory), and the app automatically resolves these to wallet addresses using a multi-protocol resolution pipeline. Mentions are rendered with clickable UI elements that display wallet addresses, profiles, and social context on hover.

**Deep Farcaster Integration**: NeetChat integrates with Farcaster's social graph, allowing users to see Farcaster profiles, share casts, and leverage the social graph for identity resolution and discovery. Users can seamlessly transition between Farcaster social interactions and XMTP private messaging.

**XMTP Agent Directory**: The app lists and discovers XMTP-enabled AI agents directly from the XMTP network, making it easy to chat with bots, automated services, and AI assistants. Users can browse available agents, see their capabilities, and start conversations with a single click.

**Wallet Integration**: Seamless connection with MetaMask, WalletConnect, World App, Base network wallets, or any injected wallet via Wagmi v2. Users can start chatting immediately after connecting their wallet, with no account creation or email verification required.

**Real-time Messaging**: Instant, end-to-end encrypted messaging using XMTP's MLS (Message Layer Security) protocol. Messages sync across all devices automatically, and conversations are stored locally with IndexedDB for offline access. The app handles XMTP V3/MLS protocol nuances including nanosecond timestamps, inboxId-based message alignment, and forward secrecy.

**File Attachments via Filecoin**: Users can attach files, images, and media to messages, with content stored on Filecoin's decentralized storage network. This enables rich media sharing while maintaining decentralization and censorship resistance.

**Token Price Oracles & DeFi Integration**: Real-time token prices and market data are displayed directly in chat conversations using on-chain oracles. Users can discuss prices, coordinate trades, and access DeFi context without leaving the conversation. The app integrates with various DeFi oracles to provide rich, context-aware information within conversations.

**Smart Conversation Management**: Advanced conversation matching system that uses inboxId-based identification (proper for XMTP V3/MLS) with fallback mechanisms. The app can automatically identify conversations even when metadata is missing, using localStorage mapping and message sender analysis. Server-side API proxies handle identity resolution, bypassing CORS issues and providing robust error handling.

**Base & World App Native Integration**: Native integration with Base network and World App wallet for seamless cross-chain messaging and identity resolution. Users on Base can message Ethereum mainnet users and vice versa, with automatic network detection and routing.

**Development Tools**: Built-in debug panel, test wallet for development, and comprehensive error handling make NeetChat developer-friendly while maintaining production-ready stability.

NeetChat demonstrates how to build a comprehensive Web3 messaging platform that bridges the gap between traditional chat apps and decentralized protocols. By integrating identity resolution (Farcaster, ENS), decentralized storage (Filecoin), financial data (oracles), and multi-chain support (Base, Ethereum), NeetChat creates a unified communication hub where wallet-to-wallet messaging becomes as intuitive as sending a text message, while maintaining the security, privacy, and decentralization principles of Web3.


