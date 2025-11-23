# NeetChat - XMTP Wallet-to-Wallet Messaging

A modern, mobile-first chat application built on XMTP (Extensible Message Transport Protocol) that enables secure wallet-to-wallet messaging on Ethereum.

## 🚀 Features

- **Wallet Integration**: Connect with MetaMask, WalletConnect, or any injected wallet
- **Real-time Messaging**: Instant messaging using XMTP protocol
- **Cross-Device Sync**: Messages sync across all your devices
- **Mobile-First Design**: Responsive UI optimized for mobile and desktop
- **Development Tools**: Built-in test wallet and debug panel for development

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Wallet**: Wagmi v2, Viem
- **XMTP SDK**: @xmtp/browser-sdk v5.1.0
- **State Management**: React Context API

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- An Ethereum wallet (MetaMask recommended)
- WalletConnect Project ID (for WalletConnect support)

## 🚦 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/neetchatethglobal.git
cd neetchatethglobal
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# WalletConnect Configuration
# Get your Project ID from https://cloud.walletconnect.com/
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# XMTP Environment (optional, defaults to 'production')
NEXT_PUBLIC_XMTP_ENV=production
```

See [ENV_SETUP.md](./ENV_SETUP.md) for detailed setup instructions.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Connect Your Wallet

1. Click "Connect Wallet" in the app
2. Select your preferred wallet provider
3. Approve the connection and signature request
4. Start chatting!

## 📁 Project Structure

```
neetchatethglobal/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Main chat interface
│   ├── providers.tsx      # Wagmi & React Query providers
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── WalletConnect.tsx  # Wallet connection UI
│   ├── ConversationList.tsx # Conversation list & creation
│   ├── ChatWindow.tsx     # Chat interface
│   ├── DebugPanel.tsx     # Development debug tools
│   └── ErrorBoundary.tsx  # Error handling
├── contexts/              # React contexts
│   ├── XMTPContext.tsx    # XMTP client management
│   └── TestWalletContext.tsx # Development test wallet
├── public/                # Static assets
└── docs/                  # Documentation
    ├── PROJECT_STATUS.md  # Current project status
    └── DEVELOPMENT_LOG.md # Development history
```

## 🧪 Development

### Test Wallet

In development mode, you can use a built-in test wallet to avoid repeated signature prompts:

1. Click "🧪 Use Test Wallet (Dev Only)"
2. The test wallet will automatically sign messages
3. **Warning**: Never use the test wallet with real funds!

### Debug Panel

The debug panel (development only) provides:
- XMTP network statistics
- Client method inspection
- Forked conversation detection
- Real-time sync status

## 📚 Documentation

- [PROJECT_STATUS.md](./docs/PROJECT_STATUS.md) - Current project status and known issues
- [DEVELOPMENT_LOG.md](./docs/DEVELOPMENT_LOG.md) - Development history and milestones
- [ENV_SETUP.md](./ENV_SETUP.md) - Environment variable setup guide

## 🔧 Configuration

### Next.js Configuration

The project includes custom webpack configuration for:
- WASM module support (required for XMTP SDK)
- Server-side externalization of XMTP SDK
- Node.js module fallbacks

### XMTP Configuration

- **Environment**: Production (default) or Dev
- **History Sync**: Enabled by default
- **Installation Limit**: 10 installations per inbox ID (auto-revocation implemented)

## 🐛 Known Issues & Limitations

1. **Sync Delay**: New installations may take up to 30 minutes to see conversations from other devices (XMTP protocol limitation)
2. **CORS**: History sync uploads fail in development due to CORS (resolved in production)
3. **Browser Only**: Currently designed for browser environments

See [PROJECT_STATUS.md](./docs/PROJECT_STATUS.md) for detailed issue tracking.

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

**Note**: This project was developed for ETHGlobal hackathon. All work was completed during the hackathon period as per ETHGlobal rules.

## 🙏 Acknowledgments

- [XMTP](https://xmtp.org) for the messaging protocol
- [Wagmi](https://wagmi.sh) for wallet integration
- [Next.js](https://nextjs.org) for the framework

## 📞 Support

For XMTP-specific issues:
- [XMTP Documentation](https://docs.xmtp.org)
- [XMTP Community](https://community.xmtp.org)
- [XMTP GitHub](https://github.com/xmtp/libxmtp)

---

**Version**: 0.1.0  
**Last Updated**: January 2025  
**Status**: Active Development
