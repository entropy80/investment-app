# Contributing to Investment App

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- PostgreSQL database (or Neon serverless PostgreSQL)
- Git

### Local Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/investment-app.git
   cd investment-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your configuration. See `.env.example` for required variables.

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## How to Contribute

### Reporting Bugs

Before creating a bug report:
- Check existing issues to avoid duplicates
- Collect relevant information (error messages, steps to reproduce)

When creating a bug report, include:
- Clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Environment details (OS, Node version, browser)
- Screenshots if applicable

### Suggesting Features

Feature requests are welcome. Please:
- Check existing issues and discussions first
- Describe the problem your feature would solve
- Explain your proposed solution
- Consider alternative approaches

### Pull Requests

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the existing code style
   - Write meaningful commit messages
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   npm run lint
   npm run type-check
   npm run test
   npm run build
   ```

4. **Submit your PR**
   - Fill out the PR template
   - Link related issues
   - Request review from maintainers

## Development Guidelines

### Code Style

- **TypeScript:** Use TypeScript for all new code
- **Formatting:** Code is formatted with Prettier (runs on commit)
- **Linting:** ESLint rules are enforced
- **Naming:** Use descriptive, meaningful names
  - React components: PascalCase
  - Functions/variables: camelCase
  - Constants: UPPER_SNAKE_CASE
  - Files: kebab-case for utilities, PascalCase for components

### Project Structure

```
src/
├── app/                 # Next.js App Router pages and API routes
├── components/          # React components
│   ├── ui/              # Reusable UI primitives (shadcn/ui)
│   └── [feature]/       # Feature-specific components
├── lib/                 # Business logic and utilities
│   ├── auth/            # Authentication logic
│   ├── portfolio/       # Portfolio management
│   └── ...
├── types/               # TypeScript type definitions
└── styles/              # Global styles
```

### Database Changes

When modifying the database schema:

1. Update `prisma/schema.prisma`
2. Create a migration:
   ```bash
   npx prisma migrate dev --name descriptive-name
   ```
3. Include the migration file in your PR

### API Routes

When creating or modifying API routes:

- Validate all input data
- Check authentication with `getServerSession(authOptions)`
- Verify resource ownership before returning data
- Use appropriate HTTP status codes
- Apply rate limiting to sensitive endpoints
- Add audit logging for security-relevant actions

### Security Checklist

Before submitting a PR, verify:

- [ ] No hardcoded secrets or credentials
- [ ] Input validation on all user-provided data
- [ ] SQL injection prevention (use Prisma parameterized queries)
- [ ] XSS prevention (React auto-escapes, be careful with `dangerouslySetInnerHTML`)
- [ ] Authorization checks for protected resources
- [ ] Rate limiting on sensitive endpoints
- [ ] No sensitive data in logs or error messages
- [ ] File uploads validated (type, size, content)

### Testing

- Write unit tests for utility functions
- Write integration tests for API routes
- Test error handling and edge cases
- Ensure existing tests pass

### Documentation

- Update README.md if adding new features
- Add JSDoc comments for public functions
- Update API documentation for endpoint changes
- Keep docs/ folder current

## Review Process

1. Automated checks must pass (lint, type-check, build)
2. At least one maintainer review required
3. Address review feedback
4. Squash and merge when approved

## Questions?

- Open a GitHub Discussion for general questions
- Contact admin@investment-app.com for sensitive matters

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
