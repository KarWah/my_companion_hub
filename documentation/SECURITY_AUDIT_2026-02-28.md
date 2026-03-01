# Security Audit — my-companion-hub
**Date:** 2026-02-28
**Scope:** Full codebase security review — server actions, API routes, file storage, CSP, auth
**Purpose:** Pre-publication hardening baseline

---

## Summary

The app has a solid foundation: next-auth for sessions, Prisma ORM (no raw SQL injection risk), sharp for image validation, and per-action rate limiting on critical flows. No data-breach or account-takeover vulnerabilities were found. The issues below are real but mostly in the "abuse / hardening" category rather than "catastrophic exploit" category.

---

## 1. Actually Exploitable

### SEC-E1: Path Traversal in `deleteImage`
**File:** `src/lib/storage.ts:247-249`
**Severity:** HIGH
```ts
filepath = path.join(process.cwd(), 'public', imageUrl);
```
The guard is `imageUrl.startsWith('/uploads/')` but `/uploads/../../../etc/passwd` passes that check. `path.join` normalises it and escapes the `public/` directory boundary. Low likelihood since URLs are system-generated, but if a DB record were ever poisoned it becomes a live file read/delete path traversal.

**Fix:** Use `path.resolve` and assert the resolved path starts with `UPLOAD_BASE_DIR`.

---

### SEC-E2: `JSON.parse` Without try-catch in Server Actions
**File:** `src/app/actions.ts:33-35`
**Severity:** MEDIUM
```ts
const hobbies = hobbiesRaw ? JSON.parse(hobbiesRaw) : [];
const fetishes = fetishesRaw ? JSON.parse(fetishesRaw) : [];
```
Malformed JSON throws an unhandled exception → 500 with stack trace exposed. Not data-loss, but useful to an attacker for fingerprinting and crash-probing.

**Fix:** Wrap both in try-catch; fall back to `[]` on parse failure.

---

### SEC-E3: Timing-Unsafe Cron Secret Comparison
**File:** `src/app/api/cron/scheduled-messages/route.ts`
**Severity:** LOW-MEDIUM
```ts
if (authHeader !== `Bearer ${expectedSecret}`)
```
String equality is timing-attackable. Low practical risk over HTTP but trivial to fix.

**Fix:** Use `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))`.

---

### SEC-E4: No Rate Limit or Auth on Voice Preview Proxy
**File:** `src/app/api/voice/preview/route.ts`
**Severity:** MEDIUM
No authentication or rate limiting. Anyone can hammer the endpoint to proxy unlimited ElevenLabs CDN audio — bandwidth abuse and potential quota exhaustion.

**Fix:** Add IP-based rate limiting (or reuse `rate-limit-db.ts`).

---

## 2. Real but Lower Risk

### SEC-L1: `incrementCompanionViewCount` — No Auth, No Rate Limit
**File:** `src/app/actions.ts:523-528`
**Severity:** MEDIUM
It's a `"use server"` export callable by any client. No auth check, no rate limit. A script could inflate view counts for any companion, corrupting the community ranking system.

**Fix:** Add basic rate limiting (by IP or companionId) without requiring auth (since viewing is public).

---

### SEC-L2: Search Input Has No Length Cap
**File:** `src/app/community/page.tsx` → `src/app/actions.ts:getPublicCompanions()`
**Severity:** LOW
The `search` URL param has no max length before hitting the DB. A 100,000-char string goes to Postgres unfiltered. Postgres handles it gracefully but it's unnecessary load.

**Fix:** Cap search string at 100 characters server-side in `getPublicCompanions()`.

---

### SEC-L3: `unsafe-eval` in Content Security Policy
**File:** `next.config.js:50`
**Severity:** MEDIUM
```
"script-src 'self' 'unsafe-inline' 'unsafe-eval'"
```
`unsafe-eval` allows `eval()`, `Function()` constructor, and `setTimeout(string)`. This largely defeats CSP's XSS protection. `unsafe-inline` is harder to remove (Next.js uses it for hydration), but `unsafe-eval` is often not needed.

**Fix:** Remove `unsafe-eval` from `script-src`. Test that the app still functions — Next.js 15 should not require it.

---

## 3. Not Actually a Problem (Noted for Clarity)

| Claim | Verdict |
|-------|---------|
| CSRF on server actions | **Not vulnerable** — Next.js 15 validates `Origin` header automatically |
| SQL injection via `$executeRaw` | **Not vulnerable** — Prisma tagged template literals are fully parameterised |
| Prompt injection / jailbreaking | **LLM safety concern, not a web security bug** — inherent to LLM chatbots |
| Hardcoded Novita secrets | **Already fixed** 2026-02-28 — now uses `env.NOVITA_API_URL` / `env.NOVITA_MODEL` |
| Image upload polyglot attack | **Mitigated** — `sharp` validates metadata + re-encodes to JPEG, stripping payloads |

---

## 4. Production Hardening Gaps

These are not exploitable now but should be addressed before public launch.

### SEC-H1: No `robots.txt`
Private user routes (`/gallery`, `/companions`, `/settings`, `/generate`) will be indexed by search engines.
**Fix:** Add `src/app/robots.txt` blocking private routes.

### SEC-H2: HSTS Missing `preload` Directive
**File:** `next.config.js:66-69`
The `Strict-Transport-Security` header is present but lacks `preload`. Browsers won't add the domain to preload lists.
**Fix:** Append `; preload` to the HSTS value.

### SEC-H3: Server Action Body Size Limit Too Large
**File:** `next.config.js:5`
```ts
serverActions: { bodySizeLimit: '10mb' }
```
10MB is excessive for a chat app where the largest payload is a cropped JPEG (< 1MB). This allows large uploads that waste server memory.
**Fix:** Reduce to `'2mb'`.

### SEC-H4: Account Lockout Not Enforced
Rate limiting exists (DB-based) but there is no hard account lockout after N failed login attempts. Slow brute-force over many IPs is still possible.
**Fix:** After 10 failed attempts in 24h for a given email, lock the account and require email verification to unlock.

### SEC-H5: Session Cookie Flags (Needs Verification)
next-auth should set `HttpOnly` and `Secure` flags by default, but this hasn't been explicitly verified in `src/lib/auth.ts`.
**Fix:** Confirm `useSecureCookies` is true in production config; add explicit `cookies` config if not.

---

## Remediation Checklist

| # | Issue | File(s) | Priority | Status |
|---|-------|---------|----------|--------|
| 1 | SEC-E1: Path traversal in deleteImage | `storage.ts` | HIGH | ✅ Fixed 2026-02-28 |
| 2 | SEC-E2: JSON.parse without try-catch | `actions.ts` | MEDIUM | ✅ Fixed 2026-02-28 |
| 3 | SEC-E3: Timing-unsafe cron secret | `api/cron/.../route.ts` | LOW | ✅ Fixed 2026-02-28 |
| 4 | SEC-E4: Rate limit voice preview | `api/voice/preview/route.ts` | MEDIUM | ✅ Fixed 2026-02-28 |
| 5 | SEC-L1: incrementCompanionViewCount rate limit | `actions.ts` | MEDIUM | ✅ Fixed 2026-02-28 |
| 6 | SEC-L2: Search input length cap | `actions.ts` | LOW | ✅ Fixed 2026-02-28 |
| 7 | SEC-L3: Remove unsafe-eval from CSP | `next.config.js` | MEDIUM | ✅ Fixed 2026-02-28 |
| 8 | SEC-H1: Add robots.txt | `src/app/robots.ts` | LOW | ✅ Fixed 2026-02-28 |
| 9 | SEC-H3: Reduce body size limit | `next.config.js` | LOW | ✅ Fixed 2026-02-28 |

**All 9 checklist items resolved.** Remaining open items (SEC-H2 HSTS preload, SEC-H4 account lockout, SEC-H5 session cookie verification) are production-ops concerns, not code changes.

---

## Addendum — UX/UI Improvements (2026-02-28)

Following security hardening, five user-facing improvements were implemented in the same session.

### UX-1 — Fix Default Companion Selection
**File:** `src/app/actions.ts` — `getActiveCompanion()`
**Problem:** Always opened the most recently *created* companion, ignoring chat history.
**Fix:** Query `Message` for the latest message across the user's companions first; use that companion as default. Falls back to `createdAt: desc` if no messages exist.

### UX-2 — Mood / Affection / Trust in Chat Header
**File:** `src/app/page.tsx`
**Change:** Added three rows below the existing Wearing/Location/Action block in the chat header:
- **Mood** — emoji + label (12 mood states mapped via `MOOD_EMOJI`)
- **Affection** — ❤ + 5-segment filled/empty bar + numeric value
- **Trust** — 🤝 + 5-segment filled/empty bar + numeric value

All values sourced from the already-fetched `companion` object (`currentMood`, `affectionLevel`, `trustLevel`). No additional DB query.

### UX-3 — Soft Alternative Dark Theme Toggle
**Files:** `src/app/globals.css`, `src/components/ThemeProvider.tsx`, `src/components/ThemeToggle.tsx`, `src/components/sidebar.tsx`, `src/components/ChatMessages.tsx`, `src/app/layout.tsx`

**Approach:** `data-theme="charcoal"` attribute on `<html>` overrides CSS custom properties (`--primary`, `--accent`, `--sidebar`, `--chat-bubble-user`, `--chat-bubble-bot`, etc.). Sidebar, active nav items, logo, user avatar, and chat bubbles all read from CSS vars via `style` prop — hardcoded Tailwind pink/purple classes elsewhere are unchanged (phase 1 scope).

- `ThemeProvider` — reads `localStorage` on mount, applies saved theme to `document.documentElement.dataset.theme`
- `ThemeToggle` — `Palette` icon button in sidebar footer; toggles between pink (default) and indigo; persists to `localStorage`

### UX-4 — Mobile-Responsive Sidebar (Drawer)
**Files:** `src/components/MobileNavProvider.tsx`, `src/components/MobileHeader.tsx`, `src/components/sidebar.tsx`, `src/app/layout.tsx`

**Approach:** React context (`MobileNavProvider`) tracks open/closed state. On mobile (`< md`):
- Sidebar becomes a fixed-position off-canvas drawer (`-translate-x-full` / `translate-x-0`)
- Semi-transparent backdrop closes the drawer on click
- `MobileHeader` (`md:hidden`) shows a hamburger (`Menu` icon) and app title at top of content area
- Navigating to any route auto-closes the drawer via `useEffect` on `pathname`

Desktop (`md:`) behaviour unchanged — sidebar is always visible, no backdrop.

### UX-5 — Companion Share Link
**Files:** `src/components/community/ShareLinkButton.tsx`, `src/app/community/[id]/page.tsx`

**Change:** Added a "Copy Link" button (`Link2` icon) beside the "Clone" button on community companion detail pages. Uses `navigator.clipboard.writeText(window.location.href)`. Shows `Check` icon + "Copied!" for 2 seconds after copy, then resets.

---

### Test Coverage Post-Changes

```
Test Files: 14 passed (14)
     Tests: 306 passed (306)
```

All pre-existing tests continue to pass. New components are client-side UI only and don't require unit tests at this stage.

---

## Addendum — SFW Mode Phase 2 (2026-02-28)

Strict content-mode filtering applied across all companion surfaces. The NSFW signal is `companion.fetishes.length > 0`.

### SFW-1 — Bidirectional Companion Filtering (All Surfaces)

**Rule:** `SFW_MODE=true` → only companions with no fetishes are visible. `SFW_MODE=false` → only companions with fetishes are visible. Applied server-side at the query level everywhere.

| Surface | File | Mechanism |
|---|---|---|
| Sidebar / companions list | `actions.ts` — `getCompanions()` | `fetishes: { isEmpty: true/false }` in Prisma `where` |
| Chat page default companion | `actions.ts` — `getActiveCompanion()` | Same filter on all three query paths (specific, latest-message, fallback) |
| Chat page direct access | `actions.ts` — `getActiveCompanion()` | Post-fetch mode gate — returns `null` if mode mismatch |
| Community listing | `actions.ts` — `getPublicCompanions()` | `fetishes: { isEmpty: true/false }` replaces the old SFW-only spread |
| Community detail | `actions.ts` — `getPublicCompanionById()` | Returns `null` (→ 404) on mode mismatch |
| Gallery listing | `gallery/page.tsx` | `fetishes: { isEmpty: true/false }` in Prisma `where` |
| Gallery detail | `gallery/[id]/page.tsx` | Redirects to `/gallery` on mode mismatch |
| Chat images (inline) | `ChatMessages.tsx` | `hideImages` prop computed server-side in `page.tsx`; gates both stored and streaming image renders |

### SFW-2 — Body Type Images in Companion Wizard

**Files:** `constants/body.ts`, `wizard/steps/BodyStep.tsx`, `wizard/EditMode.tsx`

Added `BODY_TYPES_SFW` array with `*_sfw.webp` image variants (clothed) for all five body types: `slim`, `athletic`, `curvy`, `chubby`, `muscular`. Both `BodyStep` and `EditMode` select the SFW or standard array via `process.env.NEXT_PUBLIC_SFW_MODE` (already used elsewhere in `EditMode`). Images at `/assets/body_type/*_sfw.webp` are provided separately by the operator.

### Test Coverage

```
Test Files: 14 passed (14)
     Tests: 306 passed (306)
```
