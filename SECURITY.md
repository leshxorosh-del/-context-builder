# Security Policy

## Supported Versions

At this stage, security fixes are provided for:

- `main` branch (latest stable state)

## Reporting a Vulnerability

Please **do not** open public GitHub issues for security vulnerabilities.

Report vulnerabilities privately to:

- `leshxorosh@gmail.com`
- Telegram: [@leshxorosh](https://t.me/leshxorosh)

Include the following:

1. Affected component and file(s)
2. Reproduction steps / proof of concept
3. Potential impact
4. Suggested mitigation (if available)

## Response Process

1. Initial acknowledgment within 72 hours
2. Triage and severity assessment
3. Fix development and verification
4. Coordinated disclosure and release notes

## Security Baseline (Current)

- Strict TypeScript mode
- Input validation with Joi on API boundaries
- Rate limiting for auth and API routes
- Helmet security headers
- JWT access/refresh token model
- Parameterized DB queries

## Planned Hardening

- Automated dependency and container vulnerability scanning in CI
- Secret scanning in pull requests
- Runtime abuse detection alerts
