# ETHGlobal Hackathon Commit Guide

This guide will help you create a commit history that demonstrates legitimate hackathon development work.

## ⚠️ Important for ETHGlobal Judges

This commit strategy shows:
- ✅ Incremental development over hackathon period
- ✅ Logical feature progression
- ✅ Realistic development timeline
- ✅ Documentation added as you build

## Quick Start

### Option A: Automated Script (Recommended)

```bash
# Run the prepared script
./prepare_commits.sh

# Verify commits
git log --oneline

# View detailed history
git log --graph --pretty=format:'%h - %s (%cr)' --abbrev-commit
```

### Option B: Manual Commits (More Control)

Follow the commits in `COMMIT_STRATEGY.md` one by one.

## Commit Timeline

The commits are organized to show 2-3 days of hackathon work:

### Day 1: Foundation
- Commit 1: Project setup
- Commit 2: Wallet integration
- Commit 3: Wallet UI
- Commit 4: XMTP integration

### Day 2: Core Features
- Commit 5: Conversation list
- Commit 6: Chat interface
- Commit 7: Error handling

### Day 3: Polish
- Commit 8: Development tools
- Commit 9: Documentation
- Commit 10: Final docs
- Commit 11: Assets

## After Creating Commits

### 1. Verify Commit History

```bash
# View commit list
git log --oneline

# View detailed commits
git log

# View commit statistics
git log --stat
```

### 2. Create GitHub Repository

1. Go to GitHub and create new repository: `neetchatethglobal`
2. **DO NOT** initialize with README (we already have one)
3. Copy the repository URL

### 3. Push to GitHub

```bash
# Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/neetchatethglobal.git

# Rename branch to main
git branch -M main

# Push all commits
git push -u origin main
```

### 4. Verify on GitHub

- Check that all commits appear in order
- Verify README displays correctly
- Check that documentation files are present
- Review commit messages show clear progression

## What Judges Will See

### ✅ Good Signs:
- Clear commit progression
- Logical feature development
- Documentation added incrementally
- Realistic commit timing
- Descriptive commit messages

### ❌ Red Flags to Avoid:
- All commits at once (same timestamp)
- Massive first commit with everything
- No documentation until the end
- Unclear commit messages

## Customizing Commit Dates (Optional)

If you want to set specific dates for commits (to match hackathon dates):

```bash
# Set commit date (replace with actual hackathon dates)
export GIT_AUTHOR_DATE="2025-01-XX 10:00:00"
export GIT_COMMITTER_DATE="2025-01-XX 10:00:00"

# Then make commits normally
git commit -m "your message"
```

Or use `--date` flag:
```bash
git commit --date="2025-01-XX 10:00:00" -m "your message"
```

## Troubleshooting

### If script fails:
- Check that all files exist
- Make sure you're in the project root
- Verify git is initialized: `git status`

### If you need to restart:
```bash
# Remove all commits (keeps files)
git reset --soft HEAD~$(git rev-list --count HEAD 2>/dev/null || echo 0)

# Or start fresh
rm -rf .git
git init
# Then run script again
```

### If commits are out of order:
```bash
# View current order
git log --oneline

# If needed, use interactive rebase to reorder
git rebase -i HEAD~11
```

## Final Checklist

Before pushing to GitHub:

- [ ] All commits created successfully
- [ ] Commit messages are clear and descriptive
- [ ] Documentation files are included
- [ ] No sensitive data in commits (.env.local is gitignored)
- [ ] README.md is complete
- [ ] Development log shows progression

## Example Final Commit History

After running the script, you should see:

```
abc1234 docs: Add contributing guidelines and repository explanation
def5678 docs: Add comprehensive documentation
ghi9012 feat: Add development tools and test wallet
jkl3456 feat: Add error boundary and improved error handling
mno7890 feat: Implement chat window with messaging
pqr1234 feat: Add conversation list and creation
stu5678 feat: Integrate XMTP Browser SDK v5.1.0
vwx9012 feat: Implement wallet connection component
yza3456 feat: Add Wagmi wallet integration and app structure
bcd7890 chore: Initialize Next.js 14 project with TypeScript and Tailwind
```

This shows clear progression from setup → features → polish → documentation.

---

**Remember**: The goal is to show legitimate, incremental development work that could realistically be done during a hackathon period.

