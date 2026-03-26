# Contributing to Token Warden

Thank you for your interest in contributing!

## Prerequisites

- Node.js 18+
- npm 9+

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Flagship-Software/token-warden.git
   cd token-warden
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run tests:
   ```bash
   npm run test -w packages/sdk
   ```

4. Run tests in watch mode:
   ```bash
   npm run test:watch -w packages/sdk
   ```

5. Type check:
   ```bash
   npm run typecheck -w packages/sdk
   ```

6. Build:
   ```bash
   npm run build -w packages/sdk
   ```

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Write tests for your changes
4. Make your changes
5. Ensure all tests pass: `npm run test -w packages/sdk`
6. Ensure types are correct: `npm run typecheck -w packages/sdk`
7. Commit with a descriptive message (we follow [Conventional Commits](https://www.conventionalcommits.org/))
8. Push and open a Pull Request

## Code Style

- Strict TypeScript — no `any` types
- Follow existing patterns in the codebase
- Keep functions small and focused
- Write tests for all new functionality
