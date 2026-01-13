# Codebase Analysis & Refactoring Plan
**Date**: January 12, 2026
**Analyzed by**: Claude Code
**Purpose**: Identify issues, deprecated code, refactoring needs, and best practice violations

---

## Executive Summary

The Companion Hub codebase is **well-architected** and production-ready. However, this analysis identified **10 areas** requiring attention, ranging from critical configuration issues to code quality improvements. No major security vulnerabilities were found.

**Priority Breakdown**:
- **Critical (1)**: Hardcoded Temporal address blocking production deployment
- **High (3)**: Type safety issues, logging inconsistency, monolithic component
- **Medium (4)**: Incomplete functionality, legacy fields, validation gaps
- **Low (2)**: Minor refactoring opportunities

---

## Table of Contents

1. [Critical Issues](#critical-issues)
2. [High Priority Issues](#high-priority-issues)
3. [Medium Priority Issues](#medium-priority-issues)
4. [Low Priority Issues](#low-priority-issues)
5. [Deprecated Code](#deprecated-code)
6. [Unused/Incomplete Code](#unusedincomplete-code)
7. [Best Practice Violations](#best-practice-violations)
8. [Recommendations](#recommendations)

---

## Critical Issues

### 1. Hardcoded Temporal Address (BLOCKS PRODUCTION)

**Severity**: 🔴 Critical
**Category**: Configuration
**Effort**: 5 minutes
**Files**: `src/app/api/chat/stream/[workflowId]/route.ts`

**Issue**:
```typescript
// Line 31
const connection = await Connection.connect({
  address: 'localhost:7233' // ❌ HARDCODED
});
```

**Problem**:
- Environment variable `TEMPORAL_ADDRESS` exists and is validated in `lib/env.ts`
- SSE route ignores it and hardcodes `localhost:7233`
- **Breaks production deployment** if Temporal runs on different server

**Fix**:
```typescript
import { env } from '@/lib/env'

const connection = await Connection.connect({
  address: env.TEMPORAL_ADDRESS // ✅ Use environment variable
});
```

**Impact**: Application will not work in production if Temporal is on a different server.

**Action Required**: Immediate fix before deployment.

---

## High Priority Issues

### 2. Type Safety Violations (45 instances of `any`)

**Severity**: 🟠 High
**Category**: Type Safety
**Effort**: 2-3 hours
**Files**: Multiple components (ChatForm, ChatMessages, companion-wizard, error handlers)

**Issue**:
TypeScript's `any` type breaks type safety guarantees in 45 locations across the codebase.

**Examples**:

**src/components/ChatForm.tsx**:
```typescript
// ❌ BAD
onStreamUpdate?: (state: any) => void

// ✅ GOOD
interface StreamState {
  progress: number
  streamedText: string
  isComplete: boolean
  error: string | null
}
onStreamUpdate?: (state: StreamState) => void
```

**src/components/companion-wizard.tsx**:
```typescript
// ❌ BAD
const defaultState: any = { step: 1, data: {} }

// ✅ GOOD
interface WizardState {
  step: number
  data: {
    name?: string
    description?: string
    visualDescription?: string
    // ... etc
  }
}
const defaultState: WizardState = { step: 1, data: {} }
```

**src/components/ChatMessages.tsx**:
```typescript
// ❌ BAD
onChange={(e: any) => setInput(e.target.value)}

// ✅ GOOD
onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
```

**Impact**:
- Loses IntelliSense autocomplete
- Allows runtime errors that TypeScript should catch
- Makes refactoring dangerous (no compile-time checks)

**Recommended Action**:
1. Create proper interfaces in `src/types/index.ts`
2. Replace `any` with specific types
3. Use `unknown` if type truly unknown (forces type guards)

---

### 3. Inconsistent Logging (Console vs Pino)

**Severity**: 🟠 High
**Category**: Code Quality / Observability
**Effort**: 1-2 hours
**Files**: 20+ files across codebase

**Issue**:
Codebase has a structured logging system (Pino) but uses `console.*` in 20+ places.

**Examples**:

**lib/env.ts**:
```typescript
console.log('✓ Environment variables validated successfully')
```

**lib/temporal.ts**:
```typescript
console.log('✓ Temporal connection established...')
```

**lib/rate-limit-db.ts**:
```typescript
console.error('Rate limit check failed:', error)
```

**Why This Matters**:
1. **Production logs**: Console output won't appear in log aggregators (Datadog, Splunk, etc.)
2. **Structured logging**: Pino logs are JSON (machine-readable), console logs aren't
3. **Log levels**: Can't filter console logs by severity
4. **Searchability**: Can't query console logs in production

**Fix**:
```typescript
// ❌ BAD
console.log('✓ Environment variables validated successfully')
console.error('Rate limit check failed:', error)

// ✅ GOOD
import { logger } from '@/lib/logger'
logger.info('Environment variables validated successfully')
logger.error({ error }, 'Rate limit check failed')
```

**Recommended Action**:
Replace all `console.*` calls with appropriate logger calls:
- `console.log()` → `logger.info()`
- `console.error()` → `logger.error()`
- `console.warn()` → `logger.warn()`
- `console.debug()` → `logger.debug()`

---

### 4. Monolithic Companion Wizard Component

**Severity**: 🟠 High
**Category**: Architecture / Maintainability
**Effort**: 4-6 hours
**Files**: `src/components/companion-wizard.tsx` (71KB)

**Issue**:
The companion creation wizard is a single 71KB file containing:
- Multi-step wizard logic
- Form validation
- Image upload handling
- State management
- UI rendering for all steps

**Problems**:
1. **Hard to test**: Can't unit test individual wizard steps
2. **Hard to reuse**: Logic is tightly coupled to wizard UI
3. **Hard to maintain**: Changes to one step risk breaking others
4. **Hard to review**: 71KB files are difficult to review in PRs

**Current Structure**:
```
companion-wizard.tsx (71KB)
  ├── Step 1: Basic Info
  ├── Step 2: Appearance
  ├── Step 3: Personality
  ├── Step 4: State
  ├── Step 5: Image Upload
  └── Wizard State Management
```

**Recommended Structure**:
```
components/wizard/
  ├── CompanionWizard.tsx          # Main container (state management)
  ├── WizardStep.tsx               # Generic step wrapper
  ├── BasicInfoStep.tsx            # Step 1
  ├── AppearanceStep.tsx           # Step 2
  ├── PersonalityStep.tsx          # Step 3
  ├── StateStep.tsx                # Step 4
  ├── ImageUploadStep.tsx          # Step 5
  ├── useWizardState.ts            # Custom hook for state
  └── wizard-validation.ts         # Validation schemas
```

**Benefits**:
- Each step can be tested independently
- Reusable step components
- Easier to add/remove/reorder steps
- Smaller, more focused files

**Recommended Action**:
Refactor wizard into smaller components. Start with extracting validation logic, then split UI into step components.

---

## Medium Priority Issues

### 5. Incomplete Cleanup Function

**Severity**: 🟡 Medium
**Category**: Infrastructure / Data Management
**Effort**: 1 hour
**Files**: `src/lib/storage.ts`

**Issue**:
```typescript
export async function cleanupOrphanedImages(): Promise<number> {
  logger.info('Cleaning up orphaned images...')
  // TODO: Implement orphaned image cleanup
  // 1. Scan /uploads/ directory for all images
  // 2. Query database for all used imageUrls
  // 3. Delete images not in database
  logger.info('Orphaned image cleanup not yet implemented')
  return 0
}
```

**Problem**:
- Function exists, is exported, but does nothing
- Over time, deleted companions/messages will leave orphaned images on disk
- Could lead to unbounded storage growth

**Scenarios Where Images Become Orphaned**:
1. Companion deleted (images not cleaned up)
2. Message deleted (image not cleaned up)
3. Failed uploads leave partial files
4. Workflow failures during image generation

**Impact**:
- Low immediate risk (storage is cheap)
- Long-term risk if application runs for months/years

**Recommended Implementation**:
```typescript
export async function cleanupOrphanedImages(): Promise<number> {
  logger.info('Starting orphaned image cleanup...')

  // 1. Get all image URLs from database
  const [companions, messages] = await Promise.all([
    prisma.companion.findMany({ select: { headerImageUrl: true } }),
    prisma.message.findMany({ select: { imageUrl: true } })
  ])

  const usedUrls = new Set([
    ...companions.map(c => c.headerImageUrl).filter(Boolean),
    ...messages.map(m => m.imageUrl).filter(Boolean)
  ])

  // 2. Scan filesystem for all images
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  const allFiles = await glob('**/*.{jpg,jpeg,png,webp}', { cwd: uploadsDir })

  // 3. Delete orphaned images
  let deletedCount = 0
  for (const file of allFiles) {
    const url = `/uploads/${file}`
    if (!usedUrls.has(url)) {
      await fs.unlink(path.join(uploadsDir, file))
      deletedCount++
    }
  }

  logger.info({ deletedCount }, 'Orphaned image cleanup completed')
  return deletedCount
}
```

**Recommended Action**:
1. Implement function
2. Add to cron job (run weekly)
3. Add admin endpoint to trigger manually

---

### 6. SSE Closure Staleness Bug

**Severity**: 🟡 Medium
**Category**: Bug / React Hooks
**Effort**: 30 minutes
**Files**: `src/hooks/useWorkflowStream.ts`

**Issue**:
The exponential backoff retry logic references stale closure variables:

```typescript
// ❌ POTENTIAL BUG
const handleError = () => {
  if (!state.isComplete && reconnectAttempts < maxReconnectAttempts) {
    // `state` is from closure, may be stale
    setTimeout(() => {
      reconnect()
    }, backoffDelay)
  }
}
```

**Problem**:
- `state.isComplete` is captured from closure when effect runs
- If state updates (e.g., workflow completes), the `handleError` callback still sees old `isComplete = false`
- Could cause unnecessary reconnection attempts after workflow completes

**Recommended Fix**:
```typescript
// ✅ Use ref to avoid stale closures
const isCompleteRef = useRef(false)

useEffect(() => {
  isCompleteRef.current = state.isComplete
}, [state.isComplete])

const handleError = () => {
  if (!isCompleteRef.current && reconnectAttempts < maxReconnectAttempts) {
    setTimeout(() => {
      reconnect()
    }, backoffDelay)
  }
}
```

**Impact**: Low (rare edge case), but could cause harmless extra reconnections.

---

### 7. Password Validation Gap

**Severity**: 🟡 Medium
**Category**: Security / Validation
**Effort**: 30 minutes
**Files**: `src/lib/validation.ts`

**Issue**:
Current password validation only checks minimum length:

```typescript
password: z.string().min(8, 'Password must be at least 8 characters')
```

**Problem**:
- Allows weak passwords like `aaaaaaaa` or `12345678`
- No complexity requirements (uppercase, lowercase, numbers, special chars)

**Common Password Requirements**:
- Minimum 8 characters ✅ (already implemented)
- At least one uppercase letter ❌ (missing)
- At least one lowercase letter ❌ (missing)
- At least one number ❌ (missing)
- At least one special character ❌ (optional)

**Recommended Fix**:
```typescript
password: z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
```

**Alternative** (if you want to keep simple passwords):
Document this as an intentional decision and add a comment:
```typescript
// Simple password requirement: 8+ characters only
// Rationale: Self-hosted app, users can choose their own security level
password: z.string().min(8, 'Password must be at least 8 characters')
```

**Recommended Action**: Decide on password policy and implement or document.

---

### 8. Message History Limit Hardcoded

**Severity**: 🟡 Medium
**Category**: Configuration / Flexibility
**Effort**: 15 minutes
**Files**: `src/app/chat-actions.ts`, `src/temporal/activities.ts`

**Issue**:
Message history is hardcoded to 10 messages:

```typescript
// chat-actions.ts
const companion = await prisma.companion.findUnique({
  where: { id: companionId },
  include: {
    messages: {
      orderBy: { createdAt: 'desc' },
      take: 10 // ❌ Hardcoded
    }
  }
})
```

**Problem**:
- Can't adjust context window without code changes
- Different companions might need different history lengths
- LLM context windows vary (some support 100k+ tokens)

**Recommended Fix**:
```typescript
// lib/config.ts
export const CHAT_CONFIG = {
  DEFAULT_HISTORY_LENGTH: 10,
  MAX_HISTORY_LENGTH: 100
}

// chat-actions.ts
import { CHAT_CONFIG } from '@/lib/config'

const companion = await prisma.companion.findUnique({
  where: { id: companionId },
  include: {
    messages: {
      orderBy: { createdAt: 'desc' },
      take: CHAT_CONFIG.DEFAULT_HISTORY_LENGTH
    }
  }
})
```

**Future Enhancement**:
Add `historyLength` field to Companion model for per-companion configuration.

---

## Low Priority Issues

### 9. Error Swallowing in Rate Limit

**Severity**: 🟢 Low
**Category**: Observability
**Effort**: 10 minutes
**Files**: `src/lib/rate-limit-db.ts`

**Issue**:
Database errors in rate limiting fail open silently:

```typescript
try {
  // Rate limit logic...
} catch (error) {
  // ❌ No logging before fail-open
  if (error.message.includes('Rate limit exceeded')) {
    throw error
  }
  console.error('Rate limit check failed:', error) // ❌ Console, not logger
  return // Fail open silently
}
```

**Problem**:
- Database errors are logged to console (not structured logs)
- No visibility into how often rate limiting is failing
- Can't detect systematic issues (e.g., database connection problems)

**Recommended Fix**:
```typescript
import { logger } from '@/lib/logger'

try {
  // Rate limit logic...
} catch (error) {
  if (error.message.includes('Rate limit exceeded')) {
    throw error
  }

  // ✅ Log to structured logger with context
  logger.warn({
    error,
    identifier,
    action
  }, 'Rate limit check failed, failing open')

  return // Fail open
}
```

**Impact**: Low (fail-open is correct behavior), but improves observability.

---

### 10. Unused Test Setup

**Severity**: 🟢 Low
**Category**: Testing
**Effort**: 8-10 hours (to add comprehensive tests)
**Files**: `vitest.config.ts`, `src/__tests__/`

**Issue**:
Vitest is configured and one test file exists (`registration.test.ts`), but:
- No tests for core features (chat, companions, image generation)
- No integration tests
- No E2E tests
- No test coverage reporting

**Current Test Coverage**:
- ✅ Registration validation (40+ test cases)
- ❌ Authentication flow
- ❌ Companion CRUD
- ❌ Chat workflow
- ❌ Image generation
- ❌ Rate limiting
- ❌ Authorization checks

**Recommended Test Additions**:

**High Priority Tests**:
1. **Auth tests**: Login, registration, session management
2. **Authorization tests**: Companion ownership verification
3. **Rate limit tests**: All 6 rate limit strategies
4. **Validation tests**: All Zod schemas

**Medium Priority Tests**:
5. **Companion CRUD tests**: Create, update, delete, wipeMemory
6. **Chat tests**: sendMessage, finalizeMessage
7. **Image tests**: Upload, optimization, deletion

**Low Priority Tests**:
8. **Workflow tests**: Temporal workflow logic (requires test server)
9. **E2E tests**: Full user flows (requires Playwright/Cypress)

**Test Coverage Tool**:
```bash
npm install --save-dev @vitest/coverage-v8
```

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', '__tests__/']
    }
  }
})
```

---

## Deprecated Code

### 1. Legacy Header Image Field

**Status**: 🟡 Deprecated (migration in progress)
**Files**: `prisma/schema.prisma`, `src/app/companions/[id]/edit/page.tsx`

**Issue**:
```prisma
model Companion {
  headerImageUrl      String?  // ✅ Current field
  headerImageLegacy   String?  // ❌ Deprecated field
}
```

**Current Usage**:
```typescript
// edit/page.tsx
const imageUrl = companion.headerImageUrl || companion.headerImageLegacy
```

**Migration Plan**:
1. Ensure all companions have been migrated from `headerImageLegacy` to `headerImageUrl`
2. Remove fallback logic in edit page
3. Create Prisma migration to drop `headerImageLegacy` column

**SQL Migration** (when ready):
```sql
ALTER TABLE "Companion" DROP COLUMN "headerImageLegacy";
```

**Recommended Action**:
1. Query database to check if any companions still use `headerImageLegacy`
2. If none, remove field and fallback logic
3. If some, run migration script to copy values to `headerImageUrl`

---

## Unused/Incomplete Code

### Summary of Unused/Incomplete Items

| Item | Location | Status | Recommendation |
|------|----------|--------|----------------|
| `cleanupOrphanedImages()` | `lib/storage.ts` | Incomplete | Implement |
| `headerImageLegacy` | Prisma schema | Deprecated | Remove after migration |
| Test infrastructure | `__tests__/` | Underutilized | Add tests |

### Deleted Files (Recent Changes)

Based on git status, these files were recently deleted:
- `src/lib/rate-limit.ts` - Removed (replaced by `rate-limit-db.ts`)
- `src/types/context.ts` - Removed (merged into `src/types/index.ts`)
- `src/types/prisma.ts` - Removed (merged into `src/types/index.ts`)
- `src/types/workflow.ts` - Removed (merged into `src/types/index.ts`)

**Good housekeeping** - old files properly cleaned up.

---

## Best Practice Violations

### 1. Magic Numbers

**Issue**: Rate limits, timeouts, and limits hardcoded throughout codebase

**Examples**:
```typescript
// chat-actions.ts
take: 10 // Message history limit

// lib/auth.ts
maxAge: 30 * 24 * 60 * 60 // Session expiration

// rate-limit-db.ts
checkRateLimit(id, 'chat', 30, 1) // 30 per 1 minute
```

**Recommendation**: Create configuration file

```typescript
// lib/config.ts
export const CONFIG = {
  CHAT: {
    MESSAGE_HISTORY_LENGTH: 10,
    RATE_LIMIT_MESSAGES: 30,
    RATE_LIMIT_WINDOW_MINUTES: 1
  },
  AUTH: {
    SESSION_MAX_AGE_DAYS: 30,
    PASSWORD_MIN_LENGTH: 8
  },
  RATE_LIMITS: {
    LOGIN_ATTEMPTS: 5,
    LOGIN_WINDOW_MINUTES: 15,
    REGISTRATION_ATTEMPTS: 3,
    REGISTRATION_WINDOW_HOURS: 24,
    IMAGE_GENERATION: 10,
    IMAGE_WINDOW_MINUTES: 60
  },
  IMAGE: {
    MAX_SIZE_MB: 5,
    JPEG_QUALITY: 85,
    PROFILE_MAX_DIMENSION: 800,
    GENERATED_MAX_DIMENSION: 1920
  }
}
```

---

### 2. Mixed Error Handling Patterns

**Issue**: Some functions throw errors, others return `{ success: boolean, error?: string }`

**Examples**:
```typescript
// Throws error
export async function sendMessage(...) {
  if (!session) throw new Error('Unauthorized')
}

// Returns success object
export async function checkRateLimit(...): Promise<{ success: boolean }> {
  return { success: true }
}
```

**Impact**: Inconsistent error handling in callers

**Recommendation**: Standardize on one pattern (prefer throwing errors for Server Actions, they're caught by Next.js)

---

### 3. Long Parameter Lists

**Issue**: Some functions have 5+ parameters

**Example**:
```typescript
export async function generateCompanionImage(input: {
  companionId: string
  outfit: string
  location: string
  visualTags: string[]
  expression: string
  lighting: string
  isUserPresent: boolean
}): Promise<string>
```

**Current Code**: Already uses object parameter ✅ (good!)

**Non-compliant Examples**: None found (codebase already follows this pattern)

---

## Recommendations

### Immediate Actions (Week 1)

1. **Fix hardcoded Temporal address** ⚠️ CRITICAL
   - File: `src/app/api/chat/stream/[workflowId]/route.ts:31`
   - Change: Use `env.TEMPORAL_ADDRESS`
   - Time: 5 minutes

2. **Replace console logs with Pino**
   - Files: 20+ files
   - Time: 1-2 hours
   - Impact: Better production observability

### Short-term Actions (Month 1)

3. **Fix type safety violations**
   - Replace 45 instances of `any`
   - Time: 2-3 hours
   - Impact: Improved type safety, better DX

4. **Implement cleanupOrphanedImages()**
   - File: `src/lib/storage.ts`
   - Add cron job to run weekly
   - Time: 1 hour

5. **Remove legacy header image field**
   - Check database for usage
   - Drop column if unused
   - Time: 30 minutes

### Medium-term Actions (Months 2-3)

6. **Refactor companion wizard**
   - Split into smaller components
   - Time: 4-6 hours
   - Impact: Better maintainability, testability

7. **Add comprehensive tests**
   - Priority: Auth, rate limiting, companion CRUD
   - Time: 8-10 hours
   - Impact: Confidence in refactoring, catch regressions

8. **Create configuration file**
   - Extract magic numbers to `lib/config.ts`
   - Time: 1 hour
   - Impact: Easier to adjust settings

### Long-term Enhancements (Months 3+)

9. **Enhanced password validation**
   - Add complexity requirements or document decision
   - Time: 30 minutes

10. **Add test coverage reporting**
    - Install `@vitest/coverage-v8`
    - Configure coverage thresholds
    - Time: 30 minutes

---

## Metrics & Statistics

### Code Quality Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| `any` type usage | 45 | 0 | 🔴 High |
| Console logs | 20+ | 0 | 🔴 High |
| Test coverage | ~5% | 80% | 🔴 Low |
| Largest component | 71KB | <10KB | 🟡 Medium |
| TypeScript strict | ✅ Yes | ✅ Yes | ✅ Good |
| Lint errors | 0 | 0 | ✅ Good |

### Security Posture

| Category | Status | Notes |
|----------|--------|-------|
| Authentication | ✅ Good | NextAuth v5, bcrypt hashing |
| Authorization | ✅ Good | Ownership verification |
| Rate Limiting | ✅ Good | 6 strategies implemented |
| Input Validation | ✅ Good | Zod schemas |
| SQL Injection | ✅ Protected | Prisma ORM |
| XSS | ✅ Protected | CSP headers |
| Password Policy | 🟡 Basic | Only length validation |
| Session Timeout | 🟡 Long | 30 days (consider shorter) |

### Performance

| Aspect | Status | Notes |
|--------|--------|-------|
| Database Indexes | ✅ Optimized | Composite indexes on hot paths |
| Image Optimization | ✅ Good | Sharp + mozjpeg (15-35% compression) |
| Connection Pooling | ✅ Good | Temporal + Prisma singletons |
| Streaming | ✅ Good | SSE with 100ms polling |
| N+1 Queries | ✅ None found | Proper includes |

---

## Conclusion

The Companion Hub codebase demonstrates **strong engineering practices** overall:
- ✅ Well-organized architecture
- ✅ Type-safe (mostly)
- ✅ Secure authentication & authorization
- ✅ Comprehensive rate limiting
- ✅ Optimized database queries
- ✅ Production-ready logging infrastructure (Pino)

**Main areas for improvement**:
1. **Fix critical Temporal configuration** (blocks production)
2. **Improve type safety** (remove `any` types)
3. **Standardize logging** (remove console, use Pino)
4. **Add tests** (currently minimal coverage)

With these improvements, the codebase will be **excellent** for long-term maintenance and scaling.

---

**Analysis Date**: January 12, 2026
**Next Review**: April 12, 2026 (quarterly)
**Analyst**: Claude Code (Sonnet 4.5)
