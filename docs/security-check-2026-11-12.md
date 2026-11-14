# Focused security checks — 12 November 2026

This records engineering checks and limited operational evidence, not a completed
Codex Security scan or a forensic determination that no account was compromised.
The formal scan start/capability tools were unavailable in this session.

## Changes and verification

- Removed superadmin user deletion from UI, API and moderation service. The route
  has no DELETE handler (405); PATCH and the service allow only BAN, UNBAN and
  REVOKE_SESSIONS. Historical audit entries remain readable. No data migration or
  production account deletion was performed.
- Tested that a superadmin cannot redirect the self-service account endpoint to
  another account, delete themselves, grant SUPERADMIN through account settings,
  or read/change another workspace's projects. Ban/unban and session revocation
  retain accounts and workspace contents. The single-superadmin database index
  remains enforced.
- Verified cross-origin moderation requests are rejected by the proxy. Sessions
  use random tokens stored as hashes, HttpOnly/SameSite cookies and production
  Secure cookies; authorization rechecks banned owners and inactive members.
- Invitation acceptance now conditionally claims an unset login inside a
  transaction, rechecking the live invitation. A concurrent-acceptance regression
  test proves exactly one request succeeds and the other cannot replace its
  credentials.
- Upgraded Next.js and its ESLint config from 16.2.10 to 16.4.6. Updated vulnerable
  transitive packages; pinned patched deepmerge-ts, nanoid, source-map-js,
  baseline-browser-mapping and the newer minimatch dependency range. Prisma
  generation, migrations, production build and ESLint verify compatibility.
- Removed manual response gzip because current Next.js also compresses route
  responses. API integration verifies that larger workspace responses remain
  readable JSON after compression.
- `npm audit --json` reports **0 known vulnerabilities**, including development
  dependencies, for the committed lockfile at the time of this check. This is
  advisory coverage, not proof that dependencies contain no vulnerabilities.

Regression checks use disposable local PostgreSQL accounts and SQLite fixtures.
They cover forbidden admin deletion over both methods, CSRF, role injection,
workspace isolation, ban/unban, owner/member sessions, one-time invite claiming,
protected superadmin and retained workspace data. No real users were moderated.

## Operational evidence and limits

Reviewed the latest 50 available Vercel project events, covering approximately
12:19–15:03 UTC on 12 November. Their principals were the known account and
Vercel system; event types were deployments, alias assignments, environment-value
masking and the project-avatar update. No unfamiliar principal appeared in this
sample. This project-filtered feed is not an exhaustive account-login audit.

A production runtime-log query for the most recent 30 minutes returned no logs.
A wider request exceeded Hobby retention. No complete application login history,
Neon database audit history, or historical database snapshot was available.
Therefore these checks cannot establish that nobody has been compromised or
rule out earlier unauthorized data access or deletion.

## Remaining protections to operate

The application login limiter is per process, not a distributed account lockout;
Vercel instances do not share its counters. The deployment guide records this
limitation. The application currently has no second factor or immutable login
security history. Enable strong second-factor protection on GitHub, Vercel and
Neon, and maintain recoverable database backups. Removing moderation deletion
limits a compromised app superadmin session; it does not restrict direct database
or hosting credentials.
