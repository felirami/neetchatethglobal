# Contributing to NeetChat

Thank you for your interest in NeetChat! This document outlines the development process and standards for this project.

## Development Process

This project follows an incremental development approach, with each feature built and tested before moving to the next. See [DEVELOPMENT_LOG.md](./docs/DEVELOPMENT_LOG.md) for a detailed history of development phases.

## Code Standards

### TypeScript
- Use TypeScript for all new code
- Define types locally when importing from XMTP SDK (to avoid build-time issues)
- Use proper type annotations

### React
- Use functional components with hooks
- Implement proper error boundaries
- Use Context API for state management

### Styling
- Use Tailwind CSS for all styling
- Follow mobile-first responsive design
- Maintain consistent spacing and colors

## Testing

- Test wallet connection with multiple providers
- Test message sending and receiving
- Test conversation creation
- Verify sync functionality

## Documentation

- Update README.md for user-facing changes
- Update DEVELOPMENT_LOG.md for development milestones
- Update PROJECT_STATUS.md for issue tracking
- Add code comments for complex logic

## Commit Messages

Use clear, descriptive commit messages:
- `feat: Add conversation sync functionality`
- `fix: Resolve message timestamp display issue`
- `docs: Update development log`
- `refactor: Improve error handling`

## Development Workflow

1. Create feature branch
2. Implement changes incrementally
3. Test thoroughly
4. Update documentation
5. Create pull request (if applicable)

## Questions?

For questions about development, please refer to:
- [PROJECT_STATUS.md](./docs/PROJECT_STATUS.md) - Current status
- [DEVELOPMENT_LOG.md](./docs/DEVELOPMENT_LOG.md) - Development history
- [XMTP Documentation](https://docs.xmtp.org) - XMTP protocol docs



