# Environment Variables Setup

## Required Configuration

### WalletConnect Project ID

To use WalletConnect, you need to get a Project ID:

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Sign up for a free account
3. Create a new project
4. Copy your Project ID
5. Add it to `.env.local`:

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

**Note:** Without a Project ID, WalletConnect will still work but you'll see warnings in the console. The app will function with MetaMask and injected wallets.

## Optional Configuration

### XMTP Environment

The app uses XMTP production environment by default. To change it, you can either:

1. Modify `contexts/XMTPContext.tsx` directly, or
2. Add to `.env.local` (if we add support for it):

```bash
NEXT_PUBLIC_XMTP_ENV=dev  # Options: 'production' | 'dev' | 'local'
```

### Custom RPC URLs (Optional)

For better performance, you can use custom RPC endpoints:

```bash
NEXT_PUBLIC_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

You can get free RPC URLs from:
- [Alchemy](https://www.alchemy.com/)
- [Infura](https://www.infura.io/)
- [QuickNode](https://www.quicknode.com/)

## File Structure

- `.env.local` - Your local environment variables (not committed to git)
- `.env.example` - Example file showing what variables are needed

## Security Notes

- Never commit `.env.local` to git (it's already in `.gitignore`)
- Keep your Project IDs and API keys secure
- Use different Project IDs for development and production


