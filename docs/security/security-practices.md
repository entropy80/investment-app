# Security Practices Guide

This document serves as a reference for security measures implemented in the application and best practices for ongoing development.

**Last Updated:** 2026-01-06

---

## Table of Contents

1. [Implemented Security Measures](#implemented-security-measures)
2. [Security Checklist for New Features](#security-checklist-for-new-features)
3. [Monitoring and Maintenance](#monitoring-and-maintenance)
4. [Future Enhancements](#future-enhancements)
5. [References](#references)

---

## Implemented Security Measures

### Authentication & Authorization

#### Rate Limiting

Protects against brute force attacks on authentication endpoints.

| Endpoint | Limit | Window | Identifier |
|----------|-------|--------|------------|
| `/api/register` | 3 requests | 1 hour | IP address |
| `/api/auth/2fa/setup` | 10 requests | 1 minute | User ID + IP |
| `/api/auth/2fa/enable` | 10 requests | 1 minute | User ID + IP |
| `/api/auth/2fa/disable` | 10 requests | 1 minute | User ID + IP |

**Implementation:** `src/lib/rate-limit/rate-limiter.ts`

**Usage:**
```typescript
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limit/rate-limiter'

// In route handler:
const rateLimited = await withRateLimit('endpoint-name', RateLimitPresets.AUTH_2FA, userId)
if (rateLimited) return rateLimited
```

---

#### 2FA Account Lockout

Prevents brute force attacks on TOTP verification.

| Setting | Value |
|---------|-------|
| Max failed attempts | 5 |
| Lockout duration | 15 minutes |
| HTTP status when locked | 423 Locked |

**Implementation:** `src/lib/auth/twofa-service.ts`

**Response on lockout:**
```json
{
  "error": "Too many failed attempts. Try again in X minutes.",
  "locked": true,
  "remainingSeconds": 900
}
```

---

#### Password Requirements

Enforces strong passwords at registration.

| Requirement | Description |
|-------------|-------------|
| Length | Minimum 8 characters |
| Uppercase | At least one uppercase letter |
| Lowercase | At least one lowercase letter |
| Number | At least one digit |
| Special | At least one special character |

**Implementation:** `src/app/api/register/route.ts`

---

#### Password Storage

- **Algorithm:** bcrypt
- **Rounds:** 10 (industry standard)
- **Implementation:** Passwords are never stored in plain text

---

### HTTP Security Headers

Configured in `next.config.ts` and applied to all routes.

| Header | Value | Purpose |
|--------|-------|---------|
| `X-DNS-Prefetch-Control` | `on` | Performance optimization |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Forces HTTPS |
| `X-XSS-Protection` | `1; mode=block` | Browser XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer info |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables unused APIs |

---

### Input Validation & Data Protection

#### File Upload Limits

| Endpoint | Max Size | HTTP Status |
|----------|----------|-------------|
| `/api/portfolio/import` | 10 MB | 413 Payload Too Large |

**Implementation:** `src/app/api/portfolio/import/route.ts`

---

#### SQL Injection Prevention

- **ORM:** Prisma with parameterized queries throughout
- **No raw SQL queries** in the codebase
- Prisma automatically escapes all inputs

---

#### XSS Prevention

- **MDX Content:** Processed through `next-mdx-remote` which safely compiles content
- **React:** JSX automatically escapes expressions
- **User Input:** Sanitized before rendering

---

### CSRF Protection

Handled automatically by NextAuth.js:
- JWT tokens with SameSite cookie attribute
- No additional CSRF tokens needed for API routes

---

### Environment Security

| Practice | Status |
|----------|--------|
| `.env.local` in `.gitignore` | Yes |
| `.env.example` as template | Yes |
| No secrets in git history | Verified |
| Secrets via environment variables | Yes |

---

### Demo Mode Security

Demo users (`demo@localhost`) are blocked from:
- Creating/modifying portfolios
- Importing data
- Changing settings
- Any write operations

**Implementation:** `src/lib/demo/demo-guard.ts`

---

## Security Checklist for New Features

Use this checklist when implementing new features:

### API Endpoints

- [ ] **Authentication:** Is `getServerSession()` checked?
- [ ] **Authorization:** Does the user own the resource being accessed?
- [ ] **Rate limiting:** Should this endpoint be rate limited?
- [ ] **Input validation:** Are all inputs validated and sanitized?
- [ ] **File uploads:** Is there a size limit? Type validation?
- [ ] **Demo guard:** Should demo users be blocked?

### Data Handling

- [ ] **Sensitive data:** Is it logged? (It shouldn't be)
- [ ] **Error messages:** Do they expose internal details? (They shouldn't)
- [ ] **Database queries:** Using Prisma? (No raw SQL)
- [ ] **User input:** Escaped before rendering?

### Authentication Features

- [ ] **Passwords:** Using bcrypt? Minimum complexity?
- [ ] **Tokens:** Short-lived? Properly validated?
- [ ] **Failed attempts:** Rate limited? Account lockout?

---

## Monitoring and Maintenance

### Regular Security Tasks

| Task | Frequency | How |
|------|-----------|-----|
| Dependency updates | Weekly | `pnpm update` + review changelogs |
| Security audit | Monthly | `pnpm audit` |
| Check for exposed secrets | Before each commit | Review diff for API keys, passwords |
| Review rate limit logs | Weekly | Check for unusual patterns |

### Dependency Security

```bash
# Check for known vulnerabilities
pnpm audit

# Update dependencies
pnpm update

# Check outdated packages
pnpm outdated
```

### Signs of Attack

Monitor for these patterns:
- Spike in 429 (rate limited) responses
- Multiple 423 (locked) responses for same user
- Unusual registration patterns
- Failed login attempts from single IP

---

## Future Enhancements

### Optional Improvements

| Enhancement | Effort | Benefit |
|-------------|--------|---------|
| Encrypt `twoFactorSecret` at rest | Medium | Defense in depth for 2FA secrets |
| Centralized input validation (Zod) | Medium | Consistent validation across routes |
| 2FA backup codes | Medium | Account recovery option |
| Structured logging (Pino/Winston) | Low | Better log management |
| Environment validation on startup | Low | Fail fast on missing config |

### Implementing Encrypted 2FA Secrets

If implementing encryption at rest for `twoFactorSecret`:

1. Use Node.js `crypto` module with AES-256-GCM
2. Store encryption key in environment variable
3. Encrypt before saving to database
4. Decrypt when verifying tokens
5. Rotate encryption keys periodically

### Implementing Centralized Validation

Consider using Zod for schema validation:

```typescript
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[!@#$%^&*]/),
})

// In route handler:
const result = registerSchema.safeParse(body)
if (!result.success) {
  return NextResponse.json({ error: result.error.issues }, { status: 400 })
}
```

---

## References

### Standards & Guidelines

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

### Framework Documentation

- [NextAuth.js Security](https://next-auth.js.org/getting-started/introduction#secure-by-default)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Prisma Security Best Practices](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access)

### Tools

- [pnpm audit](https://pnpm.io/cli/audit) - Check for vulnerable dependencies
- [Snyk](https://snyk.io/) - Continuous security monitoring
- [Mozilla Observatory](https://observatory.mozilla.org/) - Test HTTP headers
