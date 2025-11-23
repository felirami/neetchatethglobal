# Versioning Strategy

## Current Version: v0.1.0

This project uses [Semantic Versioning](https://semver.org/) (SemVer) for version management.

## Version Format

`MAJOR.MINOR.PATCH` (e.g., `0.1.0`)

- **MAJOR** (0): Breaking changes (not applicable for v0.x)
- **MINOR** (1): New features, backwards compatible
- **PATCH** (0): Bug fixes, backwards compatible

## Version History

### v0.1.0 (November 2025) - Hackathon Submission
- Initial release
- Complete XMTP messaging functionality
- Wallet integration (MetaMask, WalletConnect, Injected)
- Real-time messaging and conversation management
- Cross-device sync
- Development tools and debugging features
- Comprehensive documentation

## Versioning Policy

### For Hackathon Period
- **v0.1.0**: Initial working version with all core features
- Future versions will be incremented based on:
  - **PATCH** (0.1.1, 0.1.2...): Bug fixes and minor improvements
  - **MINOR** (0.2.0, 0.3.0...): New features (e.g., group chats, file attachments)
  - **MAJOR** (1.0.0): Production-ready release with breaking changes

### Version vs Commits

**Commits** represent incremental development work:
- Each commit shows a logical step in development
- 11 commits show the progression from setup to completion
- Commits are for development history, not versioning

**Versions** represent release milestones:
- v0.1.0 represents the complete hackathon submission
- Future versions will be tagged at significant milestones
- Not every commit needs a new version

## Git Tags

To tag the current version:

```bash
git tag -a v0.1.0 -m "Initial hackathon submission - v0.1.0"
git push origin v0.1.0
```

## Future Versioning

After hackathon:
- v0.1.1: Bug fixes and improvements
- v0.2.0: New features (group chats, reactions, etc.)
- v0.3.0: Performance optimizations
- v1.0.0: Production release

---

**Note**: For hackathon submissions, v0.1.0 is appropriate as it represents the initial working version with all core features completed.


