#!/bin/bash
# Script to prepare commits for ETHGlobal hackathon demonstration

echo "🚀 Preparing commits for ETHGlobal hackathon..."
echo "This will create incremental commits showing development progression"
echo ""

# Commit 1: Project Initialization
echo "📦 Commit 1: Project Initialization"
git add package.json package-lock.json tsconfig.json next.config.js tailwind.config.js postcss.config.js .gitignore next-env.d.ts
git commit -m "chore: Initialize Next.js 14 project with TypeScript and Tailwind

- Set up Next.js 14 with App Router
- Configure TypeScript and Tailwind CSS
- Add webpack configuration for WASM support
- Set up project structure"

# Commit 2: Wallet Integration Foundation
echo "🔌 Commit 2: Wallet Integration Foundation"
git add app/providers.tsx app/layout.tsx app/page.tsx app/globals.css
git commit -m "feat: Add Wagmi wallet integration and app structure

- Set up Wagmi v2 with multiple connectors (MetaMask, WalletConnect, Injected)
- Create root layout with providers
- Add basic page structure
- Configure React Query for state management"

# Commit 3: Wallet Connection UI
echo "💼 Commit 3: Wallet Connection UI"
git add components/WalletConnect.tsx
git commit -m "feat: Implement wallet connection component

- Add wallet connection/disconnection UI
- Display connection status
- Handle multiple wallet providers
- Add error handling for connection failures"

# Commit 4: XMTP Client Setup
echo "🔐 Commit 4: XMTP Client Setup"
git add contexts/XMTPContext.tsx
git commit -m "feat: Integrate XMTP Browser SDK v5.1.0

- Create XMTP client context
- Implement client initialization with wallet signer
- Add dynamic imports to prevent SSR issues with WASM
- Handle client lifecycle and error states
- Add automatic installation revocation for limit handling"

# Commit 5: Conversation List
echo "💬 Commit 5: Conversation List"
git add components/ConversationList.tsx
git commit -m "feat: Add conversation list and creation

- Display list of conversations
- Implement new chat creation by wallet address
- Add inbox ID retrieval from Ethereum addresses (multiple fallback methods)
- Stream new conversations in real-time
- Add address validation and error handling
- Implement sync before listing conversations"

# Commit 6: Chat Interface
echo "📱 Commit 6: Chat Interface"
git add components/ChatWindow.tsx
git commit -m "feat: Implement chat window with messaging

- Display messages for selected conversation
- Add message input and sending functionality
- Implement real-time message streaming
- Add optimistic UI updates for sent messages
- Handle message timestamps (BigInt nanoseconds conversion)
- Fix message alignment using inboxId comparison
- Filter system messages from display
- Sync conversation before loading messages"

# Commit 7: Error Handling
echo "🛡️ Commit 7: Error Handling"
git add components/ErrorBoundary.tsx
git commit -m "feat: Add error boundary and improved error handling

- Create React Error Boundary component
- Replace system alerts with in-app error banners
- Add detailed error messages for users
- Improve error handling throughout application"

# Commit 8: Development Tools
echo "🛠️ Commit 8: Development Tools"
git add components/DebugPanel.tsx contexts/TestWalletContext.tsx
git commit -m "feat: Add development tools and test wallet

- Create debug panel for development mode
- Add test wallet for easier development testing
- Display XMTP network statistics
- Add forked conversation detection
- Implement automatic message signing for test wallet
- Add clear XMTP data functionality"

# Commit 9: Documentation
echo "📚 Commit 9: Documentation"
git add README.md ENV_SETUP.md TESTING.md docs/
git commit -m "docs: Add comprehensive documentation

- Create main README with setup instructions
- Add environment setup guide
- Add testing guide
- Document development log showing incremental progress
- Add project status documentation
- Include technical implementation details"

# Commit 10: Final Documentation
echo "📝 Commit 10: Final Documentation"
git add CONTRIBUTING.md GITHUB_SETUP.md REPOSITORY_EXPLANATION.md COMMIT_STRATEGY.md HACKATHON_COMMIT_GUIDE.md
git commit -m "docs: Add contributing guidelines and repository explanation

- Add contributing guidelines
- Document GitHub setup process
- Explain repository structure and development approach
- Add commit message guidelines
- Add hackathon commit guide"

# Commit 11: Public assets
echo "🎨 Commit 11: Public Assets"
if [ -d "public" ] && [ "$(ls -A public 2>/dev/null)" ]; then
    git add public/
    git commit -m "chore: Add public assets"
else
    echo "   (Skipping - no public assets)"
fi

echo ""
echo "✅ All commits created successfully!"
echo ""
echo "📊 View commit history:"
echo "   git log --oneline"
echo ""
echo "📋 View detailed log:"
echo "   git log"
echo ""
echo "🔗 Next step: Create GitHub repo and push"
echo "   See HACKATHON_COMMIT_GUIDE.md for instructions"
