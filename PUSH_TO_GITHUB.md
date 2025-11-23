# Push to GitHub - Step by Step

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Fill in:
   - **Repository name**: `neetchatethglobal`
   - **Description**: "XMTP-based wallet-to-wallet messaging application for ETHGlobal"
   - **Visibility**: Choose Private or Public
   - **⚠️ IMPORTANT**: Do NOT check "Initialize this repository with a README" (we already have one)
   - **⚠️ IMPORTANT**: Do NOT add .gitignore or license (we already have these)
3. Click "Create repository"

## Step 2: Copy Repository URL

After creating, GitHub will show you the repository URL. It will look like:
- `https://github.com/YOUR_USERNAME/neetchatethglobal.git`

Copy this URL - you'll need it in the next step.

## Step 3: Add Remote and Push

Once you have the repository URL, run these commands:

```bash
cd /Users/felirami/neetchat3

# Add the remote (replace YOUR_USERNAME with your actual GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/neetchatethglobal.git

# Verify remote was added
git remote -v

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 4: Verify on GitHub

1. Go to your repository page on GitHub
2. Check that all commits appear in the history
3. Verify README.md displays correctly
4. Check that all files are present

## Troubleshooting

### If you get authentication errors:

**Option 1: Use GitHub CLI (if installed)**
```bash
gh auth login
git push -u origin main
```

**Option 2: Use Personal Access Token**
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` scope
3. Use token as password when pushing:
```bash
git push -u origin main
# Username: YOUR_USERNAME
# Password: YOUR_TOKEN
```

**Option 3: Use SSH (if you have SSH keys set up)**
```bash
# Change remote to SSH URL
git remote set-url origin git@github.com:YOUR_USERNAME/neetchatethglobal.git
git push -u origin main
```

### If remote already exists:
```bash
# Remove existing remote
git remote remove origin

# Add correct remote
git remote add origin https://github.com/YOUR_USERNAME/neetchatethglobal.git
```

### If branch name is different:
```bash
# Check current branch
git branch

# Rename to main if needed
git branch -M main
```

