# Contributing to Context Builder

First off, thank you for considering contributing to Context Builder! 🎉

This document provides guidelines and steps for contributing. Following these guidelines helps communicate that you respect the time of the developers managing and developing this open source project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Style Guidelines](#style-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Issues

- **Search first**: Before creating an issue, please search existing issues to avoid duplicates.
- **Use templates**: We provide issue templates for bugs and feature requests.
- **Be specific**: Include as much detail as possible.

### Good First Issues

Looking for a place to start? Check out issues labeled [`good first issue`](https://github.com/yourusername/context-builder/labels/good%20first%20issue) — these are great for newcomers.

## How Can I Contribute?

### 🐛 Reporting Bugs

When reporting a bug, please include:

1. **Summary**: A clear, concise description of the bug.
2. **Steps to reproduce**: Detailed steps to reproduce the behavior.
3. **Expected behavior**: What you expected to happen.
4. **Actual behavior**: What actually happened.
5. **Screenshots**: If applicable, add screenshots.
6. **Environment**:
   - OS: [e.g., Windows 11, macOS 14, Ubuntu 22.04]
   - Node.js version: [e.g., 20.11.0]
   - Browser: [e.g., Chrome 121]

### 💡 Suggesting Features

We love new ideas! When suggesting a feature:

1. **Check existing issues** to see if it's already been suggested.
2. **Describe the problem** you're trying to solve.
3. **Describe your proposed solution**.
4. **Consider alternatives** you've thought about.
5. **Add mockups or examples** if helpful.

### 📝 Improving Documentation

Documentation improvements are always welcome:

- Fix typos or unclear wording
- Add missing information
- Create tutorials or examples
- Translate documentation

### 🔧 Submitting Code

Ready to contribute code? Here's how:

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Write or update tests
5. Ensure all tests pass
6. Submit a pull request

## Development Setup

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git

### Setup Steps

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/context-builder.git
cd context-builder

# 2. Add upstream remote
git remote add upstream https://github.com/yourusername/context-builder.git

# 3. Install dependencies
npm install

# 4. Copy environment file
cp .env.example .env
# Edit .env with your settings

# 5. Start databases
docker-compose up -d postgres neo4j redis

# 6. Run migrations
npm run migrate --workspace=backend

# 7. Start development servers
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

### Linting

```bash
# Check for lint errors
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

## Style Guidelines

### TypeScript

- Use **strict mode** (enabled in tsconfig.json)
- Prefer **interfaces** over types for object shapes
- Use **explicit return types** for functions
- Avoid `any` — use `unknown` if type is truly unknown

### Code Style

We use ESLint and Prettier. Key rules:

- 2 spaces for indentation
- Single quotes for strings
- No semicolons (Prettier default)
- Trailing commas in multi-line structures

```typescript
// ✅ Good
interface User {
  id: string
  email: string
  nickname?: string
}

async function getUser(id: string): Promise<User> {
  const user = await findById(id)
  return user
}

// ❌ Bad
type User = {
  id: any;
  email: any;
}

async function getUser(id) {
  return await findById(id)
}
```

### File Naming

- Components: `PascalCase.tsx` (e.g., `ChatNode.tsx`)
- Utilities: `camelCase.ts` (e.g., `tokenCounter.ts`)
- Tests: `*.test.ts` or `__tests__/` directory

### Comments

- Don't add comments that just repeat the code
- Do explain **why**, not **what**
- Use JSDoc for public APIs

```typescript
// ❌ Bad: explains what
// Increment the counter
counter++

// ✅ Good: explains why
// Retry count must increase to trigger backoff delay
counter++
```

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, missing semicolons, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(context): add selective message inclusion

Allow users to select specific messages from a chat
to include in the super-chat context.

Closes #123
```

```
fix(auth): handle expired refresh tokens

Previously, expired refresh tokens caused a 500 error.
Now they return a proper 401 with TOKEN_EXPIRED code.
```

## Pull Request Process

### Before Submitting

1. ✅ Update your fork: `git fetch upstream && git rebase upstream/main`
2. ✅ Run linter: `npm run lint`
3. ✅ Run tests: `npm test`
4. ✅ Check types: `npx tsc --noEmit`
5. ✅ Test your changes manually

### PR Guidelines

1. **Title**: Use conventional commit format
2. **Description**: Explain what and why
3. **Link issues**: Reference related issues with `Closes #123`
4. **Keep PRs focused**: One feature/fix per PR
5. **Add screenshots**: For UI changes

### Review Process

1. A maintainer will review your PR
2. Address any feedback
3. Once approved, a maintainer will merge it

### After Merge

- Delete your feature branch
- Update your fork's main branch
- Celebrate! 🎉

---

## Questions?

Feel free to open a [Discussion](https://github.com/yourusername/context-builder/discussions) for questions that aren't bugs or feature requests.

Thank you for contributing! 💜
