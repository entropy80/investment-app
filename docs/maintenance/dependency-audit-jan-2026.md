# Investment App - Dependency Audit Report (January 2026)

## Summary

| Category | Current | Latest Stable | Status |
|----------|---------|---------------|--------|
| Next.js | 16.1.1 | 16.1.1 | Up to date |
| React | 19.2.3 | 19.2.3 | Up to date |
| Prisma | 6.19.0 | 7.2.0 | **Deferred** (breaking migration) |
| Tailwind CSS | ^4 | 4.1.x | Minor update available |
| TypeScript | ^5 (5.9.3) | 5.9.3 | Up to date |
| Node.js | v24 | v24 LTS (Krypton) | Up to date |
| PostgreSQL | 17 | 18.1 | **Major update available** |
| pnpm | (system) | 10.27.0 | Check system version |

---

## Core Framework

### Next.js
| Property | Value |
|----------|-------|
| Current | 16.1.1 |
| Latest | 16.1.1 |
| Status | Up to date |

**Security Note:** Updated 2026-01-02. Patched CVE-2025-55184 and CVE-2025-55183.

Sources: [Next.js Blog](https://nextjs.org/blog/next-16-1), [Releases](https://github.com/vercel/next.js/releases)

### React
| Property | Value |
|----------|-------|
| Current | 19.2.3 |
| Latest | 19.2.3 |
| Status | Up to date |

React 19.2 includes `<Activity>` API and `useEffectEvent` hook.

Sources: [React Versions](https://react.dev/versions), [React 19.2 Blog](https://react.dev/blog/2025/10/01/react-19-2)

---

## Database & ORM

### Prisma
| Property | Value |
|----------|-------|
| Current | 6.19.0 |
| Latest | **7.2.0** |
| Status | **Deferred** - Breaking migration required |

**Key changes in Prisma 7:**
- Rust-free Prisma Client (now default)
- SQL Comments support (v7.1.0)
- Mapped enums support
- Read-replicas extension support

**Note:** MongoDB not yet supported in v7. PostgreSQL users can safely upgrade.

#### Migration Analysis (2026-01-02)

Prisma 7 is a **breaking upgrade** requiring significant migration work:

| Breaking Change | Impact |
|-----------------|--------|
| Generator provider | `prisma-client-js` → `prisma-client` |
| Output path | Now **required** (custom directory) |
| Import paths | `@prisma/client` → `./generated/prisma/client` |
| Driver adapters | **Required** for all databases (`@prisma/adapter-pg`) |
| ES modules | Need `"type": "module"` in package.json |
| Config file | New `prisma.config.ts` required at project root |
| Environment variables | No longer auto-loaded (need explicit dotenv) |

**Files affected:** ~29 files import from `@prisma/client`

**Decision:** Deferred. Current v6.19.0 is stable. Plan dedicated migration when:
- `@auth/prisma-adapter` confirms Prisma 7 compatibility
- Time available for thorough testing

Sources: [Prisma 7 Release](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0), [Upgrade Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7), [Releases](https://github.com/prisma/prisma/releases)

### PostgreSQL
| Property | Value |
|----------|-------|
| Current | 17 |
| Latest | **18.1** |
| Status | Major update available |

PostgreSQL 17.7 is the latest patch for v17 (current). PostgreSQL 18.1 is the newest major version.

Sources: [PostgreSQL Releases](https://www.postgresql.org/about/news/postgresql-181-177-1611-1515-1420-and-1323-released-3171/)

---

## Styling

### Tailwind CSS
| Property | Value |
|----------|-------|
| Current | ^4 |
| Latest | **4.1.x** |
| Status | Minor update available |

Tailwind CSS v4.0 was released January 22, 2025. v4.1 adds text shadow utilities.

Key features: 5x faster builds, 100x faster incremental builds, CSS-first configuration.

Sources: [Tailwind v4](https://tailwindcss.com/blog/tailwindcss-v4), [Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)

---

## Authentication

### NextAuth.js (next-auth)
| Property | Value |
|----------|-------|
| Current | 4.24.13 |
| Latest Stable | 4.24.13 |
| Latest Beta | **5.x (Auth.js)** |
| Status | Up to date (consider v5 migration) |

**Note:** NextAuth v5 (Auth.js) is recommended for Next.js 16 projects. It's stable enough for production despite beta tag.

Changes in v5: Environment variables prefix changed from `NEXTAUTH_` to `AUTH_`.

Sources: [NextAuth Releases](https://github.com/nextauthjs/next-auth/releases), [Migration Guide](https://authjs.dev/getting-started/migrating-to-v5)

---

## Development Tools

### TypeScript
| Property | Value |
|----------|-------|
| Current | ^5 (resolves to 5.9.3) |
| Latest | 5.9.3 |
| Status | Up to date |

TypeScript 5.9 adds `import defer` syntax. TypeScript 6.0 will be the last JS-based release; TypeScript 7.0 will be a native Go-based port.

Sources: [TypeScript Blog](https://devblogs.microsoft.com/typescript/), [TS 5.9 Docs](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html)

### Node.js
| Property | Value |
|----------|-------|
| Current | v24 |
| Active LTS | v24 (Krypton) |
| Status | Up to date |

Node.js 24.x is Active LTS until April 2028. Security releases scheduled for January 7, 2026.

Sources: [Node.js Releases](https://nodejs.org/en/about/previous-releases), [endoflife.date](https://endoflife.date/nodejs)

### pnpm
| Property | Value |
|----------|-------|
| Latest | **10.27.0** |

pnpm v10 features: Security by default (scripts blocked), global virtual store, Deno/Bun support.

Sources: [pnpm Blog](https://pnpm.io/blog/2025/12/29/pnpm-in-2025), [Releases](https://github.com/pnpm/pnpm/releases)

---

## UI & Utilities

### lucide-react
| Property | Value |
|----------|-------|
| Current | 0.562.0 |
| Latest | 0.562.0 |
| Status | Up to date |

**Note:** Updated 2026-01-02.

Sources: [npm](https://www.npmjs.com/package/lucide-react)

### date-fns
| Property | Value |
|----------|-------|
| Current | 4.1.0 |
| Latest | 4.1.0 |
| Status | Up to date |

Note: Package has not been updated for ~1 year.

Sources: [npm](https://www.npmjs.com/package/date-fns)

### next-mdx-remote
| Property | Value |
|----------|-------|
| Current | 5.0.0 |
| Status | Consider alternatives |

**Recommendation:** Package is not well maintained as of 2025. Consider migrating to:
- `next-mdx-remote-client@2` (for React 19)
- `@next/mdx@16.1.1` (official Next.js package)

Sources: [next-mdx-remote-client](https://www.npmjs.com/package/next-mdx-remote-client), [@next/mdx](https://www.npmjs.com/package/@next/mdx)

---

## Complete Dependency List

### Production Dependencies

| Package | Current | Latest | Action |
|---------|---------|--------|--------|
| @auth/prisma-adapter | ^2.11.1 | Check npm | Review |
| @prisma/client | ^6.19.0 | 7.2.0 | **Upgrade** |
| @radix-ui/react-dialog | ^1.1.15 | Check npm | Review |
| @radix-ui/react-label | ^2.1.8 | Check npm | Review |
| @radix-ui/react-select | ^2.2.6 | Check npm | Review |
| @radix-ui/react-slot | ^1.2.4 | Check npm | Review |
| @radix-ui/react-tabs | ^1.1.13 | Check npm | Review |
| bcryptjs | ^3.0.3 | Check npm | Review |
| class-variance-authority | ^0.7.1 | Check npm | Review |
| clsx | ^2.1.1 | Check npm | Review |
| date-fns | ^4.1.0 | 4.1.0 | Up to date |
| decimal.js | ^10.6.0 | Check npm | Review |
| lucide-react | ^0.562.0 | 0.562.0 | Up to date |
| next | 16.1.1 | 16.1.1 | Up to date |
| next-auth | ^4.24.13 | 4.24.13 / 5.x | Review v5 |
| next-mdx-remote | ^5.0.0 | Consider alt | Review |
| papaparse | ^5.5.3 | Check npm | Review |
| qrcode | ^1.5.4 | Check npm | Review |
| react | 19.2.3 | 19.2.3 | Up to date |
| react-dom | 19.2.3 | 19.2.3 | Up to date |
| react-hook-form | ^7.66.1 | Check npm | Review |
| recharts | ^3.6.0 | 3.6.0 | Up to date |
| remark-gfm | ^4.0.1 | Check npm | Review |
| resend | ^6.5.2 | Check npm | Review |
| speakeasy | ^2.0.0 | Check npm | Review |
| tailwind-merge | ^3.4.0 | Check npm | Review |

### Dev Dependencies

| Package | Current | Latest | Action |
|---------|---------|--------|--------|
| @tailwindcss/postcss | ^4 | 4.1.x | Update |
| @types/node | ^20 | ^22 | Update |
| @types/react | ^19 | ^19 | Review |
| eslint | ^9 | Check npm | Review |
| eslint-config-next | 16.1.1 | 16.1.1 | Up to date |
| prisma | ^6.19.0 | 7.2.0 | **Upgrade** |
| tailwindcss | ^4 | 4.1.x | Update |
| tsx | ^4.21.0 | Check npm | Review |
| typescript | ^5 (5.9.3) | 5.9.3 | Up to date |

---

## Priority Recommendations

### High Priority (Security)
1. ~~**Next.js 16.1.0 → 16.1.1**~~ - ✅ Updated 2026-01-02
2. ~~**React 19.2.0 → 19.2.3**~~ - ✅ Updated 2026-01-02

### Medium Priority (Feature/Performance)
1. ~~**Prisma 6.19.0 → 7.2.0**~~ - Deferred (breaking migration, see analysis above)
2. ~~**TypeScript 5.x → 5.9.3**~~ - ✅ Already current (^5 resolves to 5.9.3)
3. ~~**lucide-react 0.554.0 → 0.562.0**~~ - ✅ Updated 2026-01-02

### Low Priority (Consideration)
1. **next-mdx-remote** - Consider migration to `next-mdx-remote-client@2` or `@next/mdx`
2. **NextAuth v4 → v5** - Consider Auth.js migration for new features
3. **PostgreSQL 17 → 18** - Only if specific features needed

---

## Notes

- The project does not use Python
- No SQL files found - all database operations via Prisma ORM
- System is running Node.js v24 LTS (current Active LTS)
- PostgreSQL 17 is running on the system (postgresql@17-main.service)
