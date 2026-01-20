# Security Policy

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**Email:** admin@investment-app.com

**Please include:**
- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Any suggested fixes (optional)

### What to Expect

- **Acknowledgment:** Within 48 hours of your report
- **Initial Assessment:** Within 5 business days
- **Resolution Timeline:** Varies based on severity and complexity

### Scope

The following are in scope for security reports:
- Authentication and authorization bypasses
- SQL injection or other injection attacks
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Sensitive data exposure
- Insecure direct object references
- Security misconfigurations

### Out of Scope

- Denial of service attacks
- Social engineering attacks
- Physical security issues
- Issues in third-party dependencies (report these to the respective maintainers)

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Security Measures

This application implements several security measures:

### Authentication & Authorization
- Password hashing with bcrypt (cost factor 10)
- JWT-based session management via NextAuth.js
- Two-factor authentication (TOTP) support
- Role-based access control (USER, ADMIN, SUPER_ADMIN)
- Account lockout after failed 2FA attempts

### Input Validation & Sanitization
- Parameterized database queries via Prisma ORM
- File upload validation (magic bytes, MIME type, size limits)
- Filename sanitization for uploads

### Rate Limiting
- Authentication endpoints protected against brute force
- Registration rate limiting
- 2FA verification rate limiting

### Security Headers
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options (clickjacking protection)
- X-Content-Type-Options (MIME sniffing protection)
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy

### Audit Logging
- Comprehensive action logging for security-relevant events
- IP address and user agent tracking
- Admin activity monitoring

For detailed security practices, see [docs/security/security-practices.md](docs/security/security-practices.md).

## Self-Hosting Security Recommendations

If you're self-hosting this application:

1. **Environment Variables:** Never commit real credentials. Use `.env.local` for development and secure environment variable management in production.

2. **NEXTAUTH_SECRET:** Generate a strong secret (minimum 32 characters):
   ```bash
   openssl rand -base64 48
   ```

3. **Database:** Use SSL connections to your PostgreSQL database.

4. **HTTPS:** Always deploy behind HTTPS in production.

5. **Updates:** Keep dependencies updated. Run `npm audit` regularly.

6. **Backups:** Implement regular database backups with encryption at rest.

## Acknowledgments

We appreciate the security research community's efforts in helping keep this project secure. Contributors who report valid security issues will be acknowledged here (with permission).
