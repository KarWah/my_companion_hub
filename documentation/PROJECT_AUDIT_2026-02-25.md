# Project Audit — my-companion-hub
**Date:** 2026-02-25
**Auditor:** Claude Sonnet 4.6 (claude-sonnet-4-6)
**Scope:** Full codebase — all TypeScript/TSX source files, Prisma schema, Docker Compose, Next.js config
**Purpose:** Living reference document; comprehensive technical assessment for ongoing development

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [File-by-File Inventory](#2-file-by-file-inventory)
3. [Architecture Analysis](#3-architecture-analysis)
4. [Industry Standards Assessment](#4-industry-standards-assessment)
5. [Issues Found](#5-issues-found)
6. [Improvement Recommendations](#6-improvement-recommendations)
7. [Quick Wins](#7-quick-wins)
8. [Summary](#8-summary)

---

## 1. Project Overview

### What This Project Is

`my-companion-hub` is a full-stack AI companion chat application. Users create custom AI companions with detailed visual and personality configurations. They can then chat with their companions, which respond using a large language model (LLM), generate scene-aware images via Stable Diffusion, optionally speak responses aloud via ElevenLabs TTS, and store persistent memories of past conversations using vector embeddings.

A secondary social layer allows companions to be published to a community discovery feed, cloned by other users, rated, and scheduled to proactively message their owners.

### Core Value Proposition

- **Persistent, stateful AI companions** — companions track outfit, location, action, and mood across conversation turns
- **Multimodal output** — text + image + voice in a single chat turn
- **Semantic memory** — vector search over extracted conversation memories surfaces relevant context in future turns
- **Companion creation wizard** — detailed multi-step UI covering visual appearance, personality archetypes, clothing, voice selection
- **Community marketplace** — publish, discover, clone, and rate companions

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, React 19, TypeScript) |
| Auth | next-auth v5 beta (Credentials, JWT) |
| Database | PostgreSQL 18 + pgvector (Prisma ORM v7) |
| Workflow engine | Temporal.io v1.13 |
| Real-time streaming | Redis pub/sub (ioredis v5) + Server-Sent Events |
| LLM | Novita AI — `sao10k/l31-70b-euryale-v2.2` |
| Image gen | Stable Diffusion (SD Forge compatible) via `SD_API_URL` |
| Voice | ElevenLabs (`eleven_multilingual_v2`) |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dimensions) |
| Logging | Pino + pino-pretty (structured JSON in production) |
| Testing | Vitest + MSW-style global fetch mocking |
| Containerization | Docker Compose (postgres, temporal, redis) |

### Repository Statistics

- **Source files:** ~100 TypeScript / TSX files
- **Test files:** 10 test files (context-analyzer, outfit-filter, json-parser, prompt-builder, image-generator, memory-extractor, memory-retriever, embeddings, registration, memory-integration)
- **Prisma models:** 10 (User, Companion, Message, RateLimit, WorkflowExecution, Memory, Rating, ScheduledMessage, ScheduleLog, AuditLog)
- **API routes:** 5 (`/api/auth`, `/api/chat/stream/[workflowId]`, `/api/cron/scheduled-messages`, `/api/health`, `/api/voice/preview`)
- **Server actions:** ~25 (in `actions.ts`, `auth-actions.ts`, `chat-actions.ts`, `image-actions.ts`)

---

## 2. File-by-File Inventory

This section catalogues every source file, its role, and any notable observations.

### 2.1 Configuration and Infrastructure

#### `package.json`
**Role:** Project manifest, dependency declarations, scripts.
**Notable:** Next.js version listed as `^16.0.8` in the package.json name field (README artifact) but the actual installed version is `^15` as per import patterns and App Router usage. Scripts include `worker` (runs Temporal worker with `tsx src/temporal/worker.ts`) and `dev` (standard Next.js dev server). Worker is explicitly NOT started by docker-compose, requiring manual `npm run worker` invocation. `next-auth` pinned to `^5.0.0-beta.30` — pre-release software.

#### `prisma/schema.prisma`
**Role:** Database schema definition.
**Notable:**
- `averageRating Float` was added to `Companion` but `npx prisma db push && npx prisma generate` has not been run — `rateCompanion()` action will fail at runtime until this is done
- `Memory.embedding` uses `Unsupported("vector(1536)")` — pgvector type, not a native Prisma type. Raw SQL is required for vector similarity queries (not currently used; similarity is computed in-memory in TypeScript)
- `Companion` has `deletedAt DateTime?` for soft-delete but no middleware or query filter enforcing soft-delete semantics globally. Any `findMany` without `deletedAt: null` will expose soft-deleted companions
- `extendedPersonality String?` stores a JSON blob as a plain string — not a `Json` type. This means no DB-level JSON querying
- `WorkflowExecution.streamedText String @default("")` stores the full streamed response text — this field can grow large for long conversations and is never truncated

#### `docker-compose.yml`
**Role:** Local development infrastructure.
**Notable:**
- `postgres` uses `pgvector/pgvector:pg18-trixie` — bleeding-edge Postgres 18 in development may diverge from production
- `temporal` uses `temporalio/admin-tools` in `start-dev` mode — this bundles the entire Temporal stack into a single container without persistence. All workflow history is lost on container restart
- `redis` runs with persistence disabled (`--save "" --appendonly no`) — intended for dev, but if the team forgets to enable persistence in staging this creates silent data loss
- No worker service defined — developer must remember to run `npm run worker` separately

#### `next.config.js`
**Role:** Next.js configuration, HTTP security headers.
**Notable:**
- CSP `connect-src` includes `https://api.novita.ai` — client-side code can directly call Novita. In practice all Novita calls are server-side (worker), but this header implies client-side calls were once considered
- HSTS only applied in production — good
- `bodySizeLimit: '10mb'` on Server Actions — needed for base64 image uploads
- No `images.remotePatterns` configured — all `<img>` elements use raw `src` strings, bypassing Next.js Image optimization

#### `vitest.config.ts`
**Role:** Test runner configuration.
**Notable:** v8 coverage provider configured with `reporter: ['text', 'json', 'html']`. `@testing-library/react` is imported in `vitest.setup.ts` but no React component tests exist — the import causes `cleanup()` to run unnecessarily. Test environment is `node`, not `jsdom`.

#### `vitest.setup.ts`
**Role:** Global test setup — mocks for Prisma, logger, env, fetch.
**Notable:** `OPENAI_API_KEY` is included in the mock env object, which reveals it IS used in tests even though it's missing from `src/lib/env.ts`. The `cleanup()` import from `@testing-library/react` is technically a no-op in a `node` environment.

### 2.2 Application Entry Points

#### `src/instrumentation.ts`
**Role:** Next.js instrumentation hook — calls `validateEnv()` on Node.js startup.
**Notable:** Runs before any request handler. If required env vars are missing the server crashes with a descriptive error. Good practice.

#### `src/proxy.ts`
**Role:** Next.js middleware — protects all routes behind auth. Redirects unauthenticated users to `/login` and authenticated users away from `/login`/`/register`.
**Notable:** Matcher excludes `api/auth`, `_next/static`, `_next/image`, `favicon.ico`. Does NOT exclude `/api/health` or `/api/cron` — the health endpoint and cron endpoint are behind the NextAuth middleware, but the cron endpoint uses its own Bearer token auth which runs before NextAuth processes it, so the middleware redirect may interfere. Needs verification.

#### `src/app/layout.tsx`
**Role:** Root layout wrapping all pages.
**Notable:** Wraps everything in `ErrorBoundary` + `Providers` (SessionProvider). Inter font loaded via `next/font/google`. No metadata `robots` or `og:` tags.

### 2.3 Pages

#### `src/app/page.tsx` — Chat page
**Role:** Main chat interface. Loads active companion (falls back to first companion), fetches last 100 messages (descending, then reversed for display).
**Notable:** Passes `Message[]` from Prisma directly to client — `Message.role` is typed as `string` but client components expect `"user" | "assistant"`. TypeScript error is pre-existing (issue 11.4).

#### `src/app/login/page.tsx`
**Role:** Login form. Uses `signIn("credentials")` from next-auth/react with `redirect: false`.
**Notable:** Login form wrapped in `Suspense` to avoid build error from `useSearchParams`. Shows "Account created successfully" if `?registered=true` query param is present.

#### `src/app/register/page.tsx`
**Role:** Registration form. Calls `registerUser()` server action.
**Notable:** Client-side validation for password match and minimum length is present but incomplete — does not enforce the full complexity rules that server-side validates. Users see a confusing error if the client passes but server fails. The password field shows `minLength={8}` in the HTML attribute which matches but server requires uppercase + special char (via `passwordComplexitySchema`) which the client does NOT warn about.

#### `src/app/companions/page.tsx`
**Role:** Grid of user's companions. Shows header images, status indicators, action buttons.
**Notable:** Calls `getCompanions()` which filters `deletedAt: null` correctly. Includes publish/unpublish toggle, chat, edit, schedule, delete buttons.

#### `src/app/companions/new/page.tsx`
**Role:** Shell page rendering `CompanionWizard` with `createCompanion` action.
**Notable:** Extremely thin — delegates entirely to wizard.

#### `src/app/companions/[id]/edit/page.tsx`
**Role:** Edit companion page. Calls `parseCompanionToWizardState()` to reverse-engineer DB state into wizard state.
**Notable:** Depends on `parseCompanionToWizardState()` which uses regex keyword matching and is brittle for companions created outside the wizard or with custom descriptions.

#### `src/app/companions/[id]/schedules/page.tsx`
**Role:** Manage scheduled messages for a companion.
**Notable:** Verifies ownership via `getActiveCompanion(id)` (which checks userId via session). Renders `ScheduledMessageForm` + `ScheduledMessageList`.

#### `src/app/gallery/page.tsx`
**Role:** Gallery overview — grid of companions with image count badges.
**Notable:** Uses `_count` aggregation on Message where `imageUrl != null`. No pagination at this level.

#### `src/app/gallery/[id]/page.tsx`
**Role:** Per-companion image gallery with cursor-based pagination.
**Notable:** Uses `paginateMessages()` from `src/lib/pagination.ts` — good separation. 24 images per page. Has `generateMetadata()` for SEO. `params` and `searchParams` are `Promise<...>` (Next.js 15 async params).

#### `src/app/generate/page.tsx`
**Role:** Standalone image generation UI — exposes all SD parameters directly.
**Notable:** Returns base64 `data:` URLs directly to the page. Images are NOT saved to disk. This is a developer/power-user tool. Uses `buildImagePrompt()` from the legacy `prompt-builder.ts` helper, not the new LLM-driven SD prompt generator. Hardcodes `832x1216` output dimensions.

#### `src/app/community/page.tsx`
**Role:** Community discovery feed. Reads search params for filters.
**Notable:** Server component, passes filters to `getPublicCompanions()`. Renders `CommunityFilters` (client), `CompanionFeedCard` (server-compatible), and pagination links.

#### `src/app/community/[id]/page.tsx`
**Role:** Companion detail page in community.
**Notable:** Calls `incrementCompanionViewCount()` fire-and-forget (no await). Renders personality tags, stats, a clone button, and a rating form. Parses `extendedPersonality` JSON locally — duplicates logic that exists in other places.

#### `src/app/settings/page.tsx`
**Role:** Application settings. Loads companions for memory wipe UI.
**Notable:** Only renders `SettingsList` which contains RAG/DeepThink toggles (localStorage) and per-companion wipe-memory buttons.

#### `src/app/login/error.tsx`, `register/error.tsx`, `settings/error.tsx`, `gallery/error.tsx`, `generate/error.tsx`, `companions/error.tsx`
**Role:** Per-route error boundary UI files.
**Notable:** Standard Next.js error boundary pattern. Not individually read — assumed to contain minimal error display components.

### 2.4 API Routes

#### `src/app/api/chat/stream/[workflowId]/route.ts`
**Role:** SSE endpoint for streaming Temporal workflow progress to the client.
**Notable:**
- Validates auth and companion ownership before subscribing
- Accepts `?from=<cursor>` for reconnect deduplication — sends missed tokens from DB on connect
- Falls back to 200ms DB polling if Redis is unavailable
- Sends `token`, `progress`, `complete`, `error` SSE event types
- Uses 30-second keepalive interval
- Closes stream after `complete` or `error` event
- Correctly sets `Cache-Control: no-cache, no-store` and `X-Accel-Buffering: no`

#### `src/app/api/auth/[...nextauth]/route.ts`
**Role:** NextAuth route handler.
**Notable:** One line — `export const { GET, POST } = handlers;`. Clean.

#### `src/app/api/cron/scheduled-messages/route.ts`
**Role:** Cron trigger endpoint for scheduled companion messages.
**Notable:**
- Auth via `Authorization: Bearer ${CRON_SECRET}` header
- Performs cleanup: deletes WorkflowExecution rows and ScheduleLog rows older than 30 days; deletes audio files older than 7 days
- Finds all due `ScheduledMessage` records (where `nextRunAt <= now && isActive == true`)
- For each, starts a `ChatWorkflow` with 60-second timeout, awaits result, saves assistant message, updates `nextRunAt`
- Sequential processing (not parallel) — could be slow if many schedules are due simultaneously
- No concurrency lock — if cron fires twice simultaneously both instances could process the same schedule

#### `src/app/api/health/route.ts`
**Role:** Basic health check.
**Notable:** Returns `{ status: 'ok' }` on 200 or `{ status: 'error', error: ... }` on 503. Only checks DB. Does not check Redis or Temporal connectivity.

#### `src/app/api/voice/preview/route.ts`
**Role:** Proxy for ElevenLabs voice preview audio (CORS workaround).
**Notable:** Uses `console.error` instead of the structured logger — inconsistency. Caches for 24 hours. `getVoicePreviewUrl()` in `elevenlabs.ts` has a bug where it returns an API endpoint URL for recommended voices rather than the CDN URL — the proxy must handle the redirect or the URL will be wrong.

### 2.5 Server Actions

#### `src/app/actions.ts`
**Role:** Primary data server actions.
**Notable:**
- `createCompanion`, `updateCompanion`: call `compileCompanionProfile()`, save to DB with sanitized fields
- `getCompanions()`: filters `deletedAt: null` correctly
- `deleteCompanion()`: sets `deletedAt = new Date()` (soft-delete) and calls `deleteCompanionImages()` + `logCompanionEvent()`
- `togglePublishCompanion()`: sets `isPublic`, `publishedAt`. Does NOT enforce any content review
- `getPublicCompanions()`: supports sorting (popular, recent, top-rated), filtering (style, rating), full-text search via `contains` on name/description/occupation (not indexed — slow at scale), and cursor-based pagination with 20-item pages
- `clonePublicCompanion()`: copies all companion fields, copies header image file on disk via `copyCompanionHeaderImage()`, creates new companion for the cloning user
- `rateCompanion()`: upsert into Rating table, then recalculates `averageRating` inline via `prisma.rating.aggregate`. **Will fail until `prisma generate` is run** because `averageRating` does not yet exist in Prisma types
- `createScheduledMessage()`, `updateScheduledMessage()`, `deleteScheduledMessage()`: full CRUD for scheduled messages with cron expression validation
- `wipeCompanionMemory()`: deletes all Memory records for a companion (irreversible)

#### `src/app/auth-actions.ts`
**Role:** Registration server action.
**Notable:**
- Rate limited: 3 registrations per 24 hours per IP
- Validates email uniqueness, username uniqueness (case-insensitive)
- Zod schema validates username, password, email, name
- `passwordComplexitySchema` requires uppercase + lowercase + number + special character, but the register page form does not hint at these requirements (only shows "Minimum 8 characters")
- `redirect()` called outside try-catch — correct pattern for Next.js server actions
- Audit logs successful registrations

#### `src/app/chat-actions.ts`
**Role:** Chat flow server actions.
**Notable:**
- `sendMessage()`: validates auth + rate limit (30 msgs/min), saves user message to DB, fetches 30-message history, starts `ChatWorkflow` non-blocking (fire-and-forget), returns `workflowId` and the saved user `messageId`
- `finalizeMessage()`: awaits Temporal result with 4-minute timeout, saves assistant message to DB (with `imageUrl`, `audioUrl`), updates `WorkflowExecution.status`
- The two-step flow (send → stream → finalize) is architected correctly for non-blocking UX

#### `src/app/image-actions.ts`
**Role:** Standalone image generation action (used by `/generate` page).
**Notable:**
- Auth + rate limit (10 images/hr)
- Uses `buildImagePrompt()` from legacy prompt-builder, not the new LLM SD prompt generator
- Checkpoint override via `override_settings` is commented out — model switching doesn't work
- Returns base64 data URL, not saved to disk

### 2.6 Temporal Workflow

#### `src/temporal/workflows.ts`
**Role:** Main `ChatWorkflow` definition.
**Notable:**
- Exposes `progressQuery` (for polling) and `textTokenSignal` (for receiving streamed tokens from activity)
- Step sequence: analyzeContext → retrieveRelevantMemories → generateLLMResponse → extractAndStoreMemories (async, concurrent) → re-analyzeContext → updateCompanionContext → generateVoiceAudio → generateSDPrompt → generateCompanionImage
- Memory extraction starts concurrently after LLM response completes and is awaited at the very end before returning
- `shouldGenerateImage` controls whether the image pipeline runs
- `ragEnabled` controls whether memories are retrieved and stored
- All activities have configured retry policies and timeouts appropriate to their nature

#### `src/temporal/activities.ts`
**Role:** Thin orchestration layer re-exporting all activity implementations.
**Notable:** `updateCompanionContext` is implemented inline (small prisma update). All other activities are imported from sub-modules in `activities/`.

#### `src/temporal/worker.ts`
**Role:** Temporal worker process entry point.
**Notable:** Calls `validateEnv()` on startup. Connects to `companion-chat-queue` task queue. Simple and correct.

### 2.7 Temporal Activities

#### `src/temporal/activities/context-analyzer.ts` — `analyzeConversationContext()`
**Role:** Calls Novita LLM to extract visual scene state from conversation.
**Notable:**
- Uses last 8 messages (4 exchanges) for context window — good balance of recency vs. context
- Hardcoded Novita URL: `https://api.novita.ai/v3/openai/chat/completions` (does NOT use `env.NOVITA_API_URL`)
- Validates outfit against a blocklist of vague terms (`casual`, `unknown`, `n/a`, etc.) — if LLM returns vague outfit, previous state is preserved
- Falls back to previous state completely on API error or JSON parse failure — safe degradation
- Temperature 0.2, max 600 tokens — appropriate for structured output

#### `src/temporal/activities/llm-generator.ts` — `generateLLMResponse()`
**Role:** Generates the companion's chat response, streaming token-by-token.
**Notable:**
- Uses `env.NOVITA_API_URL` (configurable) — inconsistency with other activities
- Streams response character-by-character, batching DB writes every 100ms
- Character-level state machine filters `(action text)` narration blocks and `[SCENE]...[/SCENE]` blocks during streaming (so filtered content never appears in the stream)
- Publishes Redis deltas concurrently with DB writes
- Cleans final text (strips asterisks, remaining parentheticals, scene blocks) before returning
- `deepThink` mode: max 400 tokens, temperature 0.7 vs. standard max ~200 tokens, temperature 0.9
- Fetches `extendedPersonality` from DB and delegates to `buildPersonalityInstructions()` for rich prompt construction

#### `src/temporal/activities/image-generator.ts` — `generateCompanionImage()`
**Role:** Calls SD API to generate an image.
**Notable:**
- Hardcoded dimensions: 832x1216 (portrait aspect ratio)
- Hardcoded sampler: `DPM++ 2M` / `karras`
- Checks `process.env.NOVITA_KEY` directly (not via `env` helper) for optional auth header — inconsistency
- Uploads result to file storage and returns the URL
- No validation of SD API response format beyond checking `images[0]`

#### `src/temporal/activities/sd-prompt-generator.ts` — `generateSDPrompt()`
**Role:** Uses a dedicated LLM call to construct a complete Stable Diffusion prompt.
**Notable:**
- Applies outfit layering filter before LLM sees outfit — prevents underwear showing through outerwear
- Hardcoded Novita URL (same inconsistency as context-analyzer)
- Falls back to `buildFallbackPrompt()` if LLM returns invalid JSON or errors out
- Uses checkpoint `cfg_scale` and `steps` from `getCheckpointForStyle()` — these values come from config
- Returns `{ positive, negative, cfg_scale, steps }`

#### `src/temporal/activities/memory-extractor.ts` — `extractAndStoreMemories()`
**Role:** Extracts 0-5 memories per conversation turn, generates embeddings, stores in DB.
**Notable:**
- Hardcoded Novita URL
- Non-critical by design — `maximumAttempts: 1`, never throws (returns empty on error)
- Validates memory category against enum (`personal_fact`, `preference`, `event`, `relationship`)
- Clamps importance to 1-10 range
- Skips memories with empty content
- Generates embeddings in parallel via `Promise.allSettled`
- Stores `sourceMessageIds: [userMessageId]` for traceability

#### `src/temporal/activities/memory-retriever.ts` — `retrieveRelevantMemories()`
**Role:** Retrieves top-10 relevant memories using hybrid scoring.
**Notable:**
- Fetches up to 100 most recent active memories from DB (no pgvector query — all in-memory scoring)
- Hybrid score = similarity × 0.6 + recency_decay × 0.3 + importance_normalized × 0.1
- Recency uses exponential decay: `e^(-days_old / 30)` — 30-day half-life
- Falls back to recency+importance only if embedding generation fails
- Updates `lastAccessedAt` and increments `accessCount` on retrieved memories (fire-and-forget)

#### `src/temporal/activities/voice-generator.ts` — `generateVoiceAudio()`
**Role:** Generates TTS audio via ElevenLabs and uploads to file storage.
**Notable:**
- Strips asterisks, emojis, and excessive punctuation from text before TTS
- Non-critical — returns `{ audioUrl: null }` on error
- Maximum 5000 character limit (ElevenLabs API limit)
- Stores MP3 at `public/uploads/companions/{id}/audio/{nanoid}.mp3`

### 2.8 Activity Helpers

#### `src/temporal/activities/helpers/json-parser.ts`
**Role:** Robust JSON extraction from LLM output.
**Notable:**
- `extractJSON()`: tries fast-path `JSON.parse` first, then extracts `{...}` substring, sanitizes (removes comments, control chars, fixes booleans, trailing commas), then re-parses
- Returns `{ _failed: true }` if all strategies fail — callers check `._failed`
- `cleanTagString()`: removes parentheses, leading/trailing periods from SD tag strings
- Well-tested (json-parser.test.ts covers the main edge cases)

#### `src/temporal/activities/helpers/outfit-filter.ts`
**Role:** Filters underwear from outfit string when outerwear is present.
**Notable:**
- Detects nudity by checking for nudity keywords in outfit string only (not visualTags or location — intentional to prevent false positives)
- `OUTERWEAR` list: jacket, hoodie, coat, blazer, cardigan, sweater, pullover, windbreaker, parka, trench coat, leather jacket, denim jacket, bomber jacket
- `UNDERWEAR` list: thong, g-string, panties, bikini bottom, bra, lingerie, stockings, garter belt, fishnet, bodystocking
- If outerwear detected, UNDERWEAR tags are stripped from the outfit
- Returns `{ filteredOutfit, isNude }` tuple
- Well-tested

#### `src/temporal/activities/helpers/prompt-builder.ts`
**Role:** Legacy SD prompt builder (still used by `/generate` page).
**Notable:** Constructs prompts with hardcoded quality tags and layering logic. The new `sd-prompt-generator.ts` LLM-based approach supersedes this for the chat pipeline. The two systems run in parallel — the generate page uses the legacy builder.

### 2.9 Library Modules

#### `src/lib/redis.ts`
**Role:** Singleton Redis pub/sub client.
**Notable:**
- Uses `globalThis` guard to survive Next.js HMR
- `lazyConnect`, `maxRetriesPerRequest: 1`, `connectTimeout: 3000ms` — designed to fail fast and allow fallback to DB polling
- `publishWorkflowDelta()`: publishes to `workflow:{workflowId}` channel
- `subscribeToWorkflow()`: subscribes and returns unsubscribe function
- Graceful error handling — subscriber errors are caught and logged

#### `src/lib/embeddings.ts`
**Role:** OpenAI text embeddings (1536-dim).
**Notable:**
- References `env.OPENAI_API_KEY` but this key is NOT in `src/lib/env.ts` — **known bug (issue 11.5)**
- If `OPENAI_API_KEY` is not set, `env.OPENAI_API_KEY` will be `undefined` and the embedding call will get a 401 error
- The memory system gracefully degrades when embeddings fail, so this is non-blocking in practice
- `generateEmbedding()`, `cosineSimilarity()`, `generateEmbeddingsBatch()` — all three functions are well-tested in `embeddings.test.ts`

#### `src/lib/elevenlabs.ts`
**Role:** ElevenLabs TTS integration.
**Notable:**
- `RECOMMENDED_VOICES`: 8 curated voices with preview URLs pointing to ElevenLabs CDN
- `generateSpeech()`: POST to `/v1/text-to-speech/{voiceId}` with `eleven_multilingual_v2`
- `getVoicePreviewUrl()`: has a **bug** — for recommended voices it should return the CDN preview URL from the voice definition, but the code attempts an API call to `/v1/voices/{voiceId}` and returns that URL instead. When `ELEVENLABS_API_KEY` is not set, this falls back to the voice's `previewUrl` property — which is correct but the logic is inverted

#### `src/lib/auth.ts`
**Role:** NextAuth configuration.
**Notable:**
- Credentials provider supports login by username OR email (case-insensitive)
- JWT strategy with 30-day session maxAge
- Rate limits login: 5 attempts per 15 minutes per IP+username combo
- `jwt` callback propagates `id` and `username` to token; `session` callback propagates them to `session.user`
- `trustHost: true` — required for deployment behind reverse proxy

#### `src/lib/auth-helpers.ts`
**Role:** Auth utilities for server-side use.
**Notable:**
- `getAuthenticatedUser()`: calls `auth()`, throws `"Unauthorized"` error if no session
- `verifyCompanionOwnership()`: DB lookup, checks `userId` match, throws if unauthorized
- `hashPassword()`: bcrypt 10 rounds

#### `src/lib/env.ts`
**Role:** Environment variable validation and typed accessor.
**Notable:**
- Required: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NOVITA_KEY`, `SD_API_URL`
- Optional: `TEMPORAL_ADDRESS`, `LOG_LEVEL`, `NODE_ENV`, `NOVITA_MODEL`, `ELEVENLABS_API_KEY`, `CRON_SECRET`, `REDIS_URL`
- **Missing:** `OPENAI_API_KEY` — required by `src/lib/embeddings.ts` but not validated here
- `NOVITA_MODEL` is defined here but only `llm-generator.ts` uses `env.NOVITA_API_URL` (the URL, not model). The URL is hardcoded in the other three Novita callers

#### `src/lib/storage.ts`
**Role:** File system image and audio storage.
**Notable:**
- `uploadImage()`: validates base64, processes via `sharp` (mozjpeg 85%, max 1920×1920 or 800×800 for headers)
- `uploadAudioFile()`: writes MP3 buffer to disk
- `deleteImage()`, `deleteCompanionImages()`: filesystem cleanup
- `cleanupOldAudioFiles()`: deletes audio older than N days (used by cron)
- `copyCompanionHeaderImage()`: copies image file for companion cloning
- `cleanupOrphanedImages()`: **stub — not implemented**, returns empty array
- Storage path: `public/uploads/companions/{companionId}/{type}/{nanoid}.jpg`
- No CDN — images served directly by Next.js static file serving

#### `src/lib/audit-logger.ts`
**Role:** Fire-and-forget audit logging to DB.
**Notable:**
- Never throws — all errors are swallowed
- Helpers: `logAuthEvent`, `logCompanionEvent` (includes `companion_clone`), `logMessageEvent`, `logRatingEvent`, `logScheduledMessageEvent`
- IP extracted from `x-forwarded-for` / `x-real-ip` headers
- Note: project memory incorrectly states `companion_clone` is excluded — it is actually handled

#### `src/lib/rate-limit-db.ts`
**Role:** Database-backed rate limiting.
**Notable:**
- Uses `RateLimit` table with `identifier` + `action` composite key
- Fails **open** on DB error (allows request through) — this is the right call for availability
- Predefined limiters: `login` (5/15min), `register` (3/24h), `chat` (30/min), `image` (10/hr), `companion_create` (10/hr), `settings` (20/hr)
- `getClientIp()` checks `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`

#### `src/lib/logger.ts`
**Role:** Pino structured logging.
**Notable:**
- pino-pretty in dev, JSON in prod
- Module loggers: `workflowLogger`, `dbLogger`, `apiLogger`, `authLogger`, `temporalLogger`
- `startTimer()`: returns a function that returns elapsed ms — used for performance logging
- `logError()`: structured error logging with context merging
- `createRequestLogger()`: per-request logger with method/path/requestId

#### `src/lib/validation.ts`
**Role:** Zod v4 schemas for user input validation.
**Notable:**
- `companionSchema`: validates all companion creation fields
- `messageSchema`: max 2000 characters
- `passwordComplexitySchema`: 8+ chars, uppercase, lowercase, number, special char
- `registrationSchema`: username 3-20 chars, lowercase alphanumeric + underscore only
- `validatePasswordComplexity()`: returns array of error strings for UX display

#### `src/lib/cron-scheduler.ts`
**Role:** Cron expression utilities.
**Notable:**
- `isValidCronExpression()`: validates using `cron-parser`
- `getNextRunTime()`: calculates next run with timezone support
- `humanReadableCron()`: converts cron to human-readable string
- `GREETING_TYPES`: 8 preset types (morning, evening, thinking of you, good night, weekly check-in, random thought, motivational, surprise)
- `CRON_PRESETS`: common schedules
- `TIMEZONE_OPTIONS`: 20 common timezones

#### `src/lib/prompt-compiler.ts`
**Role:** Compiles wizard state into prompt strings for DB storage.
**Notable:**
- `compileCompanionProfile()`: generates `visualDescription` (SD tags), `extendedPersonality` (JSON), `systemPrompt` text
- `getPersonalityTraits()`: maps 6 archetypes (Adventurous, Shy, Dominant, Bratty, Motherly, Yandere) to multi-sentence personality descriptions
- The archetype list here (6 archetypes) differs from `personality-profiles.ts` which defines Yandere, Tsundere, Kuudere, Dandere — inconsistency across the two systems

#### `src/lib/prompt-parser.ts`
**Role:** Reverse-engineers a stored Companion into wizard state for edit mode.
**Notable:**
- Uses regex keyword matching: searches `visualDescription` and `systemPrompt` for keywords to reconstruct wizard dropdowns
- Brittle: if a user customized their description or the AI modified it, parsing will fail silently and revert to defaults
- A better approach would be to store the raw wizard state in the DB as JSON alongside the compiled strings

#### `src/lib/prompt-personality-adapter.ts`
**Role:** Generates structured personality instructions for LLM prompts.
**Notable:**
- `buildPersonalityInstructions()`: builds `characterEssence`, `behaviorRules` (from archetypes + traits), `responseStyle`, `quirksAndMannerisms`, `emotionalGuidance`, `forbiddenBehaviors`
- `formatMemoriesWithPersonality()`: formats memories with personality-aware context hints
- Uses `PERSONALITY_ARCHETYPES` from `personality-profiles.ts`

#### `src/lib/prisma.ts`
**Role:** Prisma client singleton.
**Notable:** Uses `@prisma/adapter-pg` with `pg.Pool` for the connection. `globalThis` guard prevents multiple instances during HMR.

#### `src/lib/temporal.ts`
**Role:** Temporal client singleton.
**Notable:** Spinlock for concurrent connection attempts. Graceful shutdown on `SIGTERM`/`SIGINT`. Connection retry logic.

#### `src/lib/image-validation.ts`
**Role:** Validates base64 image inputs.
**Notable:** Checks data URL format, MIME type whitelist (jpeg/jpg/png/webp), max 7MB base64 size, valid base64 character set.

#### `src/lib/text-sanitizer.ts`
**Role:** XSS prevention utilities.
**Notable:** `escapeHtml()`, `stripHtml()`, `sanitizeText()`, `sanitizeArrayField()`, `sanitizeJsonField()`, `sanitizeUrl()`. The sanitizers are thorough. However, they are not consistently applied at the server action layer — some fields go through `sanitizeText()` via `compileCompanionProfile()` but others may not.

#### `src/lib/pagination.ts`
**Role:** Cursor-based pagination for messages.
**Notable:** `paginateMessages()` fetches `limit + 1` to detect `hasMore`. `getMessageCount()` for totals. Clean, reusable.

### 2.10 Configuration Modules

#### `src/config/checkpoints.ts`
**Role:** Stable Diffusion checkpoint configuration.
**Notable:**
- Anime checkpoint: `ultimateHentaiAnimeRXTRexAnime_rxV1.safetensors` with LoRA, cfg=6, steps=28
- Realistic checkpoint: `realisticVision` (placeholder name), cfg=7, steps=30 — **has a TODO comment noting the actual model name is not set**
- Adding new checkpoints requires code changes — no database-driven configuration

#### `src/config/generation.ts`
**Role:** Default constants for image and LLM generation.
**Notable:** `DEFAULT_COMPANION_STATE` defines starting outfit/location/action. `LLM_CHAT_CONFIG` defines temperature 0.9, max tokens 150. These are used in places but the LLM generator also has its own hardcoded values — not fully centralized.

#### `src/config/personality-profiles.ts`
**Role:** Detailed personality archetype and trait definitions.
**Notable:** Four archetypes (Yandere, Tsundere, Kuudere, Dandere) with detailed behavior rules, examples, patterns, and forbidden behaviors. Ten trait definitions with weights, triggers, and manifestations. `generateBehaviorInstructions()` and `determineResponseStyle()` exported for use by prompt adapters.

#### `src/config/patterns.ts`
**Role:** Content detection keyword lists.
**Notable:** `EXPLICIT_KEYWORDS` for nude/naked detection, `OUTFIT_KEYWORDS.UNDERWEAR` and `OUTFIT_KEYWORDS.OUTERWEAR` lists. These feed `outfit-filter.ts`.

#### `src/config/scene-enhancements.ts`
**Role:** Location-specific SD tag enhancements.
**Notable:** `LOCATION_ENHANCEMENTS` maps locations to lighting/atmosphere/prop suggestions. `enhanceLocation()` and `enhanceAction()` exported. However, this module does not appear to be used in the current sd-prompt-generator path — it may be legacy or intended for future use.

#### `src/config/prompts/llm-response.ts`
**Role:** Builds the system prompt for companion LLM responses.
**Notable:** Two modes: if `extendedPersonality` present, uses rich `buildPersonalityInstructions()` format; otherwise falls back to legacy prompt format. The system prompt includes companion backstory, response style, explicit content guidelines, memory context, and behavior rules.

#### `src/config/prompts/context-analysis.ts`
**Role:** System prompt for context analysis LLM calls.
**Notable:** Detailed JSON output schema specification. Rules for each field (outfit, location, action, visual_tags, is_user_present, expression, lighting). Instructs LLM to preserve previous state when uncertain.

#### `src/config/prompts/sd-prompt-generator.ts`
**Role:** System prompt for the SD prompt generator LLM.
**Notable:** Comprehensive guide covering SD syntax, tag ordering, character appearance anchoring, outfit canonical truth, action-to-pose translation, negative prompt construction. Well-structured with numbered sections.

#### `src/config/prompts/memory-extraction.ts`
**Role:** System prompt for memory extraction.
**Notable:** Defines 4 memory categories, 1-10 importance scoring, extraction rules with examples. Instructions to ignore trivial facts and focus on personally meaningful information.

#### `src/config/prompts/image-generation.ts`
**Role:** Shared negative prompt components.
**Notable:** `BASE_NEGATIVE`, `COUPLE_NEGATIVE_ADDITIONS`, `SOLO_NEGATIVE_ADDITIONS`, `NUDE_NEGATIVE_ADDITIONS` — used by fallback prompt builder and legacy generator.

### 2.11 Type Definitions

#### `src/types/index.ts`
**Role:** Central type definitions for the entire application.
**Notable:**
- `Companion` type does NOT include `averageRating` field (pre-`prisma generate` issue)
- `CompanionWizardState` includes all wizard fields: physical appearance, personality, extended personality, voice, hobbies, fetishes, clothing
- `ChatWorkflowArgs` is the complete parameter set passed to `ChatWorkflow`
- `WorkflowProgress` tracks status, progress (0-100), current step, streamed text, image URL, audio URL
- `MemoryRecord` includes `relevanceScore` (added during retrieval scoring)
- `PublicCompanion` for community feed — includes creator username, stats

#### `src/types/next-auth.d.ts`
**Role:** Module augmentation extending NextAuth User, Session, and JWT types.
**Notable:** Adds `id`, `username`, `email`, `name` to `User`; `id`, `username`, `email`, `name` to `Session.user`; `id`, `username` to `JWT`.

### 2.12 UI Components

#### `src/hooks/useWorkflowStream.ts`
**Role:** React hook managing SSE connection to workflow stream endpoint.
**Notable:**
- Creates `EventSource` with `?from=` cursor for reconnect deduplication
- Exponential backoff reconnect (max 5 attempts, max 10s delay)
- Handles `token`, `progress`, `complete`, `error` event types
- 300ms `MIN_STATUS_DISPLAY_TIME` debounce prevents status flicker
- Returns `{ streamState, isStreaming }` to the component

#### `src/components/ChatContainer.tsx`
**Role:** Main chat UI container.
**Notable:**
- Manages optimistic messages — user message appears immediately before server processes
- Uses `flex-col-reverse` scroll-to-bottom trick (`scrollTop = 0` on a reversed flex container)
- Coordinates: `sendMessage` → start `useWorkflowStream` → display streaming → `finalizeMessage` → replace optimistic with real message

#### `src/components/ChatForm.tsx`
**Role:** Chat input form.
**Notable:**
- Hidden inputs for `companionId`, `voiceEnabled`, `ragEnabled`, `deepThink`, `voiceId` (all persisted in `localStorage`)
- Image generation checkbox triggers SD pipeline
- Voice toggle persisted per-companion in localStorage
- Calls `sendMessage()`, starts `useWorkflowStream()`, calls `finalizeMessage()` on completion

#### `src/components/ChatMessages.tsx`
**Role:** Renders the message list.
**Notable:**
- Renders initial messages, optimistic user message, and streaming assistant message (with blinking cursor)
- Shows `AudioPlayer` for messages with `audioUrl`

#### `src/components/AudioPlayer.tsx`
**Role:** Custom audio player component.
**Notable:** Play/pause, progress bar (click to seek), mute toggle, time display. Compact and full variants. Uses HTML5 `<audio>` API.

#### `src/components/sidebar.tsx`
**Role:** Navigation sidebar.
**Notable:** Client component. Nav links: Chat, Companions, Community, Gallery, Generate, Settings. Shows session username. Sign out button.

#### `src/components/wizard/CompanionWizard.tsx`
**Role:** Multi-step companion creation wizard.
**Notable:**
- 6 steps: Style → Look → Body → Identity → Voice → Finish
- Progress bar with step icons
- Two modes: `create` (step-by-step) and `edit` (single scrollable page via `EditMode`)
- Calls `compileCompanionProfile()` on submit then invokes the passed `action`

#### `src/components/wizard/EditMode.tsx`
**Role:** All-sections-on-one-page edit layout.
**Notable:** Sticky left sidebar with portrait + style toggle + voice settings. Right column with sections for identity, personality depth, clothing, appearance, body, advanced. Floating save button. Very long component (~650 lines) — could be decomposed further.

#### `src/components/wizard/PersonalityDepth.tsx`
**Role:** Collapsible "Personality Depth" section with extended personality fields.
**Notable:** Speech style, speech patterns (verbal tics), behavior traits, initiation style, confidence level, emotional traits, vulnerabilities, quirks, flirtation style, humor style, intimacy pace. All optional fields that enrich the LLM prompt.

#### `src/components/wizard/steps/IdentityStep.tsx`
**Role:** Identity wizard step — name, age, height, occupation, relationship, personality, hobbies, fetishes, clothing.
**Notable:** Contains the full clothing selector (repeated from EditMode — some code duplication). Includes PersonalityDepth section inline.

#### `src/components/wizard/steps/VoiceStep.tsx`
**Role:** Voice selection wizard step.
**Notable:** Grid of voice cards with preview buttons. Uses `/api/voice/preview?voiceId=...` proxy. Uses a `div[role="button"]` instead of nested `<button>` to avoid invalid HTML (nested buttons).

#### `src/components/wizard/hooks/useWizardState.ts`
**Role:** State management hook for wizard — hair system, clothing system, hobby/fetish toggles.
**Notable:** Three-tier hair system (primary + modifier + texture) builds `hairStyle` string. Clothing selections build `defaultOutfit` comma-separated string.

#### `src/components/community/CompanionFeedCard.tsx`
**Role:** Card component for community feed.
**Notable:** Shows header image (3:4 aspect ratio), style badge, name, description, personality/occupation tags, view/chat counts, rating stars, creator username.

#### `src/components/community/CloneCompanionButton.tsx`
**Role:** "Chat with [companion]" button that clones and redirects.
**Notable:** Uses `useTransition` for pending state. On success, redirects to `/?companion={id}`.

#### `src/components/community/RateCompanionForm.tsx`
**Role:** Interactive star rating form.
**Notable:** Hover preview, submit, success/error states. Uses `useTransition`.

#### `src/components/community/CommunityFilters.tsx`
**Role:** Filter controls for community discovery.
**Notable:** URL-based filter state (search params). Style filter, sort order, minimum rating filter.

#### `src/components/community/RatingStars.tsx`
**Role:** Read-only star display component.
**Notable:** Renders filled/partial/empty stars based on float rating. Accepts `size` prop (sm/md/lg).

#### `src/components/delete-companion-button.tsx`
**Role:** Delete companion button with confirmation.
**Notable:** Client-side confirmation dialog before calling `deleteCompanion()` server action.

#### `src/components/publish-companion-button.tsx`
**Role:** Publish/unpublish toggle button.
**Notable:** Uses `useTransition` for pending state. Calls `togglePublishCompanion()`.

#### `src/components/scheduled-message-form.tsx`
**Role:** Form for creating scheduled messages.
**Notable:** Greeting type grid selection, timezone picker, custom cron expression support. Shows next run time preview.

#### `src/components/scheduled-message-list.tsx`
**Role:** List of existing scheduled messages with enable/disable/delete controls.
**Notable:** Shows cron expression, human-readable schedule, next run time.

#### `src/components/settingsList.tsx`
**Role:** Application settings UI.
**Notable:** RAG toggle (localStorage), DeepThink toggle (localStorage). Per-companion wipe-memory buttons with confirmation dialog.

#### `src/components/image-cropper.tsx`
**Role:** Image crop modal using Canvas API.
**Notable:** Mouse drag + zoom controls. Outputs 512×512 PNG. Uses `canvas.toDataURL("image/png")` — outputs PNG even though storage optimizes to JPEG.

#### `src/components/image-gallery-grid.tsx`
**Role:** Grid of images with lightbox.
**Notable:** Renders 4-column grid. Opens `ImageLightbox` on click.

#### `src/components/error-boundary.tsx`
**Role:** React class-based error boundary.
**Notable:** Provides reset functionality. Used at root layout level.

#### `src/components/providers.tsx`
**Role:** SessionProvider wrapper.
**Notable:** Single line. Correct pattern.

### 2.13 Test Files

#### `src/__tests__/registration.test.ts`
**Role:** Zod schema validation tests for registration.
**Notable:** 20 tests covering valid inputs, invalid name/email/username/password, edge cases. All test the `registrationSchema` from `validation.ts` directly. Clean unit tests.

#### `src/__tests__/memory-integration.test.ts`
**Role:** End-to-end memory lifecycle integration tests.
**Notable:** 8 tests covering: full extract→store→retrieve cycle, companion isolation, recency ranking, importance ranking, graceful failure, inactive memory filtering, context preservation, parallel storage. Well-structured integration tests that mock at the boundary (fetch + prisma).

#### `src/temporal/activities/context-analyzer.test.ts`
**Role:** Context analyzer unit tests.
**Notable:** 14 tests covering: generic outfit preservation, user presence detection, API error fallback, JSON parse fallback, history speaker labeling, cleanTagString, default values, empty field preservation, valid outfit update, network error, API endpoint/model verification, history length limiting, boolean coercion. Comprehensive.

#### `src/temporal/activities/memory-extractor.test.ts`
**Role:** Memory extractor unit tests.
**Notable:** 14 tests covering: valid extraction, category normalization, valid categories, importance clamping, default importance, empty content skipping, API error, malformed JSON, empty memories, partial failure continuation, content trimming, sourceMessageIds, context storage, isActive default, database errors, parallel processing, API endpoint/model verification. Very thorough.

#### `src/temporal/activities/memory-retriever.test.ts`
**Role:** Memory retriever unit tests.
**Notable:** 17 tests covering all aspects of hybrid scoring, empty states, missing/invalid embeddings, TOP_K limit, access metadata update, metadata update failure, importance clamping, sort order, error degradation, DB error degradation, recency decay, `_debug` field removal, active memory filtering, fetch limit verification, semantic similarity as primary factor. Excellent test coverage.

#### `src/lib/embeddings.test.ts`
**Role:** Embeddings module unit tests.
**Notable:** Tests for `generateEmbedding` (8 tests), `cosineSimilarity` (11 tests), `generateEmbeddingsBatch` (7 tests). Thorough coverage including edge cases (zero vectors, dimension mismatch, empty arrays, 1536-dim performance).

#### `src/temporal/activities/helpers/json-parser.test.ts` / `outfit-filter.test.ts` / `prompt-builder.test.ts` / `image-generator.test.ts`
**Role:** Helper and activity unit tests.
**Notable:** These test files cover their respective modules. The test suite overall is well-structured and covers the most critical paths.

---

## 3. Architecture Analysis

### 3.1 Request Flow

```
Browser
  │
  ├─[1] POST /api/auth  ──────────────────────────────────────────► NextAuth handler
  │
  ├─[2] Server Action: sendMessage()
  │       │
  │       ├─ Rate limit check (DB)
  │       ├─ Save user Message to DB
  │       ├─ Start Temporal ChatWorkflow (non-blocking)
  │       └─ Return { workflowId, userMessageId }
  │
  ├─[3] GET /api/chat/stream/{workflowId}  (SSE)
  │       │
  │       ├─ Auth + ownership check
  │       ├─ Send catch-up text from DB (reconnect support)
  │       ├─ Subscribe to Redis channel
  │       └─ Poll Temporal progress query every 200-500ms
  │
  │         Temporal Worker (separate process)
  │         │
  │         ├─ analyzeContext (Novita LLM)
  │         ├─ retrieveRelevantMemories (DB + OpenAI embeddings)
  │         ├─ generateLLMResponse (Novita LLM, streaming → Redis → SSE)
  │         ├─ extractAndStoreMemories (concurrent, Novita + OpenAI)
  │         ├─ re-analyzeContext (Novita LLM)
  │         ├─ updateCompanionContext (DB)
  │         ├─ generateVoiceAudio (ElevenLabs → disk)
  │         ├─ generateSDPrompt (Novita LLM)
  │         └─ generateCompanionImage (SD API → disk)
  │
  └─[4] Server Action: finalizeMessage()
          │
          ├─ Await Temporal result (4-min timeout)
          ├─ Save assistant Message to DB
          └─ Update WorkflowExecution record
```

### 3.2 Streaming Architecture

The streaming pipeline is a multi-layer pub/sub system:

1. **LLM generator activity** receives a streaming response from Novita and emits each token
2. **Two parallel writes** happen per token batch (every 100ms): write to `WorkflowExecution.streamedText` in PostgreSQL AND publish a delta to Redis channel `workflow:{workflowId}`
3. **SSE route** subscribes to Redis and forwards deltas to the browser in real-time
4. **Fallback**: if Redis is unavailable, SSE route polls `WorkflowExecution.streamedText` in DB every 200ms
5. **Reconnect support**: SSE route accepts `?from=cursor` and sends catch-up text from DB on connect

This is architecturally robust — the Redis path provides sub-100ms latency while the DB path guarantees eventual delivery even without Redis.

### 3.3 Memory Architecture

The memory system implements a complete RAG (Retrieval Augmented Generation) pipeline:

1. **Extraction**: After each conversation turn, an LLM analyzes the exchange and extracts 0-5 memories in 4 categories (personal_fact, preference, event, relationship) with 1-10 importance scores
2. **Embedding**: Each memory is embedded via OpenAI `text-embedding-3-small` (1536-dim) in parallel
3. **Storage**: Memories stored in PostgreSQL with embedding as `vector(1536)` (pgvector)
4. **Retrieval**: At conversation start, the user's message is embedded and top-100 candidate memories are scored using hybrid algorithm: `similarity × 0.6 + recency_decay × 0.3 + importance × 0.1`
5. **Access tracking**: Retrieved memories have `lastAccessedAt` and `accessCount` updated

**Key strength**: The system degrades gracefully at every step — if OpenAI is unavailable, the system falls back to recency+importance scoring. If memory extraction fails, it simply doesn't store memories for that turn.

**Key weakness**: At scale, fetching 100 memories per query and scoring them in-memory will become slow. The pgvector extension is installed but not used for ANN (approximate nearest neighbor) queries.

### 3.4 Context Tracking

The companion tracks visual state (outfit, location, action, expression, lighting, userPresent) across conversation turns using a two-phase LLM analysis:

- **Phase 1** (before LLM response): analyzes the incoming user message to predict scene changes
- **Phase 2** (after LLM response): re-analyzes with the full exchange to confirm state

The state is persisted in the `Companion` table and propagated forward into the next message. This creates a continuously updated "scene state" that feeds the SD prompt generator.

### 3.5 Separation of Concerns

| Concern | Where |
|---------|-------|
| Business logic | Server actions (`app/actions.ts`, `chat-actions.ts`, etc.) |
| AI pipeline | Temporal workflow + activities |
| Data access | Prisma client (via `lib/prisma.ts`) |
| Auth | NextAuth (via `lib/auth.ts`) |
| Prompts | `config/prompts/` (centralized) |
| Constants/config | `config/` |
| Type definitions | `types/index.ts` |
| UI | `components/` |

The separation is good but not perfect — some concerns leak. The community detail page (`/community/[id]/page.tsx`) duplicates the `extendedPersonality` JSON parsing logic that exists elsewhere. The wizard `IdentityStep` duplicates the clothing selector from `EditMode`.

### 3.6 Error Handling Strategy

The codebase uses a tiered error handling approach:

1. **Critical errors**: throw, propagate up, shown to user
2. **Non-critical pipeline steps**: catch + log, return degraded result (memory extraction, voice generation, context analysis)
3. **Infrastructure failures**: fail open (Redis unavailable → fallback polling; DB rate limit error → allow request)
4. **Temporal retry policies**: configured per activity with appropriate backoff

This is a mature approach to error handling in an AI pipeline where partial success is often better than total failure.

---

## 4. Industry Standards Assessment

### 4.1 Security

| Standard | Assessment | Status |
|----------|-----------|--------|
| Authentication | NextAuth with JWT, bcrypt 10 rounds | GOOD |
| Authorization | Every sensitive action calls `getAuthenticatedUser()` + ownership verification | GOOD |
| Rate limiting | Database-backed, per-action limits | GOOD |
| Input validation | Zod schemas at action layer, `sanitizeText()` applied to some fields | PARTIAL |
| XSS prevention | `text-sanitizer.ts` exists but not universally applied | PARTIAL |
| SQL injection | Prisma ORM with parameterized queries; no raw SQL except health check | GOOD |
| CSRF | Next.js Server Actions include built-in CSRF protection | GOOD |
| Security headers | CSP, HSTS (prod), X-Frame-Options, etc. in `next.config.js` | GOOD |
| Secret management | Via environment variables; `env.ts` validates presence | GOOD |
| File upload security | Base64 validation + sharp processing + whitelist MIME types | GOOD |
| Audit logging | Comprehensive audit trail for auth and data events | GOOD |
| Middleware protection | All routes protected by NextAuth middleware | GOOD |

**Security gaps:**
- The companion `fetishes` field is stored and sent to external LLM APIs — no PII classification or content audit
- `console.error` used in `api/voice/preview/route.ts` instead of structured logger — potential log injection if attacker controls voice ID
- No RBAC — all users have equal capabilities; no admin role
- `cleanupOrphanedImages()` is unimplemented — orphaned files accumulate over time

### 4.2 Performance

| Concern | Current State | Assessment |
|---------|--------------|-----------|
| DB queries | Prisma ORM, mostly indexed queries | GOOD |
| Community search | `contains` on name/description/occupation — full table scan at scale | POOR |
| Memory retrieval | Fetches 100 memories, scores in TypeScript | OK (degrades at scale) |
| Image serving | Static files via Next.js — no CDN, no lazy loading | POOR |
| Gallery pagination | Cursor-based — correct approach | GOOD |
| Connection pooling | Prisma PgPool adapter | GOOD |
| Cron processing | Sequential per-schedule processing | POOR (at scale) |
| Chat flow | Temporal async + Redis streaming — non-blocking | GOOD |
| API calls | Multiple sequential Novita calls per workflow (3-4 LLM calls per message) | OK |

### 4.3 Code Quality

| Metric | Assessment |
|--------|-----------|
| Type safety | TypeScript throughout; some `any` casts in wizard (intentional ergonomics) | GOOD |
| Error handling | Tiered, deliberate strategy | GOOD |
| Test coverage | Memory system well-tested; UI components not tested; workflow not tested | PARTIAL |
| Code duplication | Clothing selector duplicated, extendedPersonality parsing duplicated | MEDIUM |
| Documentation | Inline comments good; JSDoc on public APIs; config files well-commented | GOOD |
| Logging | Structured Pino logging throughout; some `console.error` leaks | GOOD |
| Consistency | Novita URL hardcoded in 3/4 callers; `env.NOVITA_API_URL` only in llm-generator | POOR |

### 4.4 Reliability

| Concern | Assessment |
|---------|-----------|
| Temporal retries | Configured per activity with appropriate policies | GOOD |
| Graceful degradation | Memory, voice, context analysis all degrade without blocking response | GOOD |
| Redis fallback | DB polling fallback if Redis unavailable | GOOD |
| Workflow persistence | Temporal provides full workflow state durability | GOOD |
| Rate limiting | Fails open on DB error — correct for availability | GOOD |
| Cron concurrency | No distributed lock on scheduled message processing | RISK |

### 4.5 Maintainability

| Concern | Assessment |
|---------|-----------|
| Dependency freshness | `next-auth` at beta; otherwise reasonable versions | MEDIUM |
| Config centralization | Good for prompts; inconsistent for API URLs | MEDIUM |
| Wizard state | Raw state not stored in DB — edit mode relies on brittle regex parser | POOR |
| Checkpoint config | Hardcoded in TypeScript — requires deploy to change models | MEDIUM |
| Environment validation | Missing `OPENAI_API_KEY` in `env.ts` | BAD |

---

## 5. Issues Found

### CRITICAL (Will cause runtime failures)

#### ISSUE-C1: `averageRating` not in Prisma types
**File:** `prisma/schema.prisma` + `src/app/actions.ts`
**Description:** `averageRating Float` was added to the `Companion` model but `npx prisma db push && npx prisma generate` has not been run. The `rateCompanion()` server action attempts to update `averageRating` on the Companion model, which will throw a Prisma type error at runtime.
**Fix:** Run `npx prisma db push && npx prisma generate` immediately.

#### ISSUE-C2: `OPENAI_API_KEY` missing from `env.ts`
**File:** `src/lib/env.ts` + `src/lib/embeddings.ts`
**Description:** `src/lib/embeddings.ts` accesses `env.OPENAI_API_KEY` but this key is not defined in `src/lib/env.ts`. TypeScript will not catch this because `env` is typed as `Partial<Record<string, string>>` for optional fields. At runtime, `env.OPENAI_API_KEY` will be `undefined`, the Authorization header will be `"Bearer undefined"`, and all embedding API calls will receive a 401 error.
**Impact:** The memory system silently fails to generate embeddings. New memories are not stored. Memory retrieval falls back to recency-only scoring.
**Fix:** Add `OPENAI_API_KEY` to `src/lib/env.ts` as an optional field, and add it to the `.env` file.

### HIGH (Significant functionality impact)

#### ISSUE-H1: Hardcoded Novita API URL in 3 of 4 callers
**Files:** `src/temporal/activities/context-analyzer.ts`, `src/temporal/activities/sd-prompt-generator.ts`, `src/temporal/activities/memory-extractor.ts`
**Description:** Three activities hardcode `https://api.novita.ai/v3/openai/chat/completions` directly. Only `llm-generator.ts` uses `env.NOVITA_API_URL`. This prevents switching to a different endpoint (e.g., for testing, rate limiting, or provider switching) without code changes.
**Fix:** Replace all hardcoded URLs with `env.NOVITA_API_URL` and ensure all three activities also use `env.NOVITA_MODEL` (or a per-activity model config).

#### ISSUE-H2: No distributed lock for cron scheduled messages
**File:** `src/app/api/cron/scheduled-messages/route.ts`
**Description:** If the cron fires twice in rapid succession (common with external cron services), both invocations will query for due schedules simultaneously and both will process the same schedule, resulting in duplicate messages sent to users.
**Fix:** Implement a distributed lock using Redis (`SET NX EX`) or a DB-level transaction that marks schedules as `processing` before starting.

#### ISSUE-H3: Companion soft-delete not enforced globally
**File:** `prisma/schema.prisma` + all `companion.findMany` queries
**Description:** `Companion.deletedAt` soft-delete field exists but there is no Prisma middleware or global query filter enforcing `deletedAt: null`. If any query omits this filter, soft-deleted companions will appear. Current code manually adds `deletedAt: null` where needed, but this is fragile.
**Fix:** Add a Prisma `$extends` global query middleware that automatically injects `deletedAt: null` for all Companion queries, with an explicit `ignoreDeleted: false` escape hatch.

#### ISSUE-H4: `prompt-parser.ts` reverse engineering is brittle
**File:** `src/lib/prompt-parser.ts`
**Description:** Edit mode depends on reverse-engineering the compiled `visualDescription` + `systemPrompt` strings back into wizard state using regex keyword matching. This will fail for companions created with custom visual prompts, companions created by cloning, or any case where the compiled strings don't match the expected patterns.
**Fix:** Store the raw `CompanionWizardState` JSON in the `Companion` table alongside the compiled strings. On edit, read from the stored raw state instead of parsing.

#### ISSUE-H5: `getVoicePreviewUrl()` has inverted logic
**File:** `src/lib/elevenlabs.ts`
**Description:** The function first attempts an API call to ElevenLabs to get the preview URL. If `ELEVENLABS_API_KEY` is not set or the API call fails, it falls back to the hardcoded `previewUrl` from the `RECOMMENDED_VOICES` list. The correct and efficient path should be to return the hardcoded URL directly for known voices, only making the API call for unknown voice IDs.
**Fix:** Check if the `voiceId` exists in `RECOMMENDED_VOICES` and return its `previewUrl` directly. Fall back to API lookup only for custom/unknown voice IDs.

#### ISSUE-H6: Client-side registration validation incomplete
**File:** `src/app/register/page.tsx`
**Description:** The registration form shows "Minimum 8 characters" as the only password hint, but the server-side `passwordComplexitySchema` requires uppercase + lowercase + number + special character. Users can complete the form thinking their password is valid, submit, and receive a cryptic server error.
**Fix:** Display the full password complexity requirements on the register page, or add client-side validation that mirrors the server-side rules.

### MEDIUM (Quality, maintainability, or minor functionality issues)

#### ISSUE-M1: `cleanupOrphanedImages()` is unimplemented
**File:** `src/lib/storage.ts`
**Description:** The function exists and returns `[]` with a TODO comment. Over time, images associated with deleted messages or failed uploads will accumulate on disk.
**Fix:** Implement by querying the DB for all known image paths and comparing against filesystem contents.

#### ISSUE-M2: Community text search is not indexed
**File:** `src/app/actions.ts` — `getPublicCompanions()`
**Description:** The `search` filter uses Prisma `contains` on `name`, `description`, and `occupation` fields. This is a full table scan at scale. As the community grows, this query will degrade.
**Fix:** Add a PostgreSQL full-text search index using `to_tsvector` on the relevant fields and switch to `@@` operator queries, or use pg_trgm for fuzzy search.

#### ISSUE-M3: `scene-enhancements.ts` unused in current pipeline
**File:** `src/config/scene-enhancements.ts`
**Description:** `enhanceLocation()` and `enhanceAction()` are defined but not called anywhere in the current SD prompt generation path. The LLM-based SD prompt generator was likely intended to incorporate these enhancements but they were not wired up.
**Fix:** Either wire `enhanceLocation()` into the `generateSDPrompt()` activity's user content, or document that these functions are reserved for future use.

#### ISSUE-M4: `console.error` in voice preview route
**File:** `src/app/api/voice/preview/route.ts`
**Description:** Uses `console.error` instead of the structured `apiLogger`. This breaks log aggregation and makes voice preview errors invisible in production monitoring.
**Fix:** Replace with `apiLogger.error({ voiceId, error }, 'Voice preview proxy failed')`.

#### ISSUE-M5: Image cropper outputs PNG, storage optimizes to JPEG
**File:** `src/components/image-cropper.tsx` + `src/lib/storage.ts`
**Description:** `canvas.toDataURL("image/png")` produces a PNG data URL. `uploadImage()` in `storage.ts` uses `sharp` to re-encode as JPEG (mozjpeg). The PNG → JPEG conversion wastes memory and time. Since the final output is always JPEG, the canvas should output JPEG directly.
**Fix:** Change `canvas.toDataURL("image/jpeg", 0.9)` in the image cropper.

#### ISSUE-M6: `extendedPersonality` parsing duplicated
**Files:** `src/app/community/[id]/page.tsx`, `src/lib/prompt-compiler.ts`, `src/lib/prompt-personality-adapter.ts`
**Description:** The community detail page defines a local `parseExtendedPersonality()` function. Similar logic exists in the prompt compiler. The extended personality JSON schema should be centralized in `src/types/index.ts` with a shared parse utility.
**Fix:** Export a typed `ExtendedPersonality` interface from `src/types/index.ts` and a `parseExtendedPersonality()` utility from `src/lib/prompt-compiler.ts`.

#### ISSUE-M7: Temporal worker not in Docker Compose
**File:** `docker-compose.yml`
**Description:** Developers must manually run `npm run worker` after starting Docker Compose. This is not documented in the compose file and is a common source of confusion ("why isn't the chat working?").
**Fix:** Add a `worker` service to `docker-compose.yml` that runs `npx tsx src/temporal/worker.ts` with a build context.

#### ISSUE-M8: `WorkflowExecution.streamedText` grows unbounded
**File:** `prisma/schema.prisma`
**Description:** Every streamed token is appended to `streamedText` in the DB. Long responses (especially with DeepThink) will create large rows. There is no truncation or archival strategy.
**Fix:** Either truncate `streamedText` after the workflow completes (since the final response is stored in `Message.content`), or add a `maxlength` constraint and truncate at a reasonable limit.

#### ISSUE-M9: Archetype list inconsistency between `prompt-compiler.ts` and `personality-profiles.ts`
**Files:** `src/lib/prompt-compiler.ts`, `src/config/personality-profiles.ts`
**Description:** `prompt-compiler.ts` maps 6 archetypes (Adventurous, Shy, Dominant, Bratty, Motherly, Yandere) to personality description strings. `personality-profiles.ts` defines 4 archetypes (Yandere, Tsundere, Kuudere, Dandere) with structured behavior rules. These two systems are not aligned — selecting "Tsundere" in the wizard will not find a match in `getPersonalityTraits()`.
**Fix:** Align the archetype lists. Either expand `personality-profiles.ts` to include all 6 wizard archetypes, or update the wizard dropdown to only show archetypes that have profiles in both systems.

### LOW (Minor issues, style, or future considerations)

#### ISSUE-L1: Next.js `<img>` used instead of `next/image`
**Multiple files:** Gallery, community feed, companion cards
**Description:** Raw `<img>` elements are used throughout the UI. Next.js `Image` component provides automatic WebP/AVIF conversion, lazy loading, and layout shift prevention.
**Fix:** Replace critical above-the-fold images with `<Image>` from `next/image`. Configure `remotePatterns` if needed.

#### ISSUE-L2: `process.env.NOVITA_KEY` accessed directly in `image-generator.ts`
**File:** `src/temporal/activities/image-generator.ts`
**Description:** Direct `process.env.NOVITA_KEY` access bypasses the validated `env` accessor from `src/lib/env.ts`.
**Fix:** Replace with `env.NOVITA_KEY`.

#### ISSUE-L3: Realistic checkpoint is a placeholder
**File:** `src/config/checkpoints.ts`
**Description:** The realistic checkpoint model name is `realisticVision` with a TODO comment. Anyone using `realistic` style companions will use whatever SD model is currently loaded, not a configured one.
**Fix:** Configure the actual checkpoint filename matching the deployed SD instance.

#### ISSUE-L4: No loading states for community/gallery image loading
**Files:** `src/app/community/page.tsx`, `src/app/gallery/[id]/page.tsx`
**Description:** Images load without placeholder or blur data URLs. The gallery grid shows layout shift as images load.
**Fix:** Add `loading="lazy"` attributes and placeholder background colors matching the image palette.

#### ISSUE-L5: Session `maxAge` is hardcoded at 30 days
**File:** `src/lib/auth.ts`
**Description:** Session expiry is not configurable without a code change.
**Fix:** Read from an optional `AUTH_SESSION_MAX_AGE_DAYS` env var with a 30-day default.

#### ISSUE-L6: Rate limit entries are never cleaned up
**File:** `src/lib/rate-limit-db.ts`
**Description:** Expired rate limit records accumulate in the `RateLimit` table. There is no TTL or cleanup cron.
**Fix:** Add cleanup of expired rate limit records to the cron endpoint or a separate maintenance job.

#### ISSUE-L7: No `robots.txt` or `sitemap.xml`
**File:** `src/app/`
**Description:** The community discovery feature could benefit from SEO. There is no `robots.txt` to prevent indexing of private user data.
**Fix:** Add `src/app/robots.txt` blocking `/companions`, `/settings`, `/gallery`, `/generate`. Add `sitemap.xml` for public community companions.

---

## 6. Improvement Recommendations

### 6.1 Personality and AI Quality

#### REC-P1: Unify Personality Archetype Systems
**Priority:** HIGH
**Description:** Two parallel archetype systems exist: `getPersonalityTraits()` (6 archetypes in `prompt-compiler.ts`) and `PERSONALITY_ARCHETYPES` (4 archetypes in `personality-profiles.ts`). The wizard uses archetypes from the first system but the `buildPersonalityInstructions()` function uses the second system. A user selecting "Bratty" gets a description string from `getPersonalityTraits()` but no structured behavior rules from `PERSONALITY_ARCHETYPES` (no Bratty entry exists there).
**Recommendation:** Create a single unified archetype registry. For each archetype define: a description string (for legacy prompt format), structured behavior rules (for rich format), and trait associations. Remove the divergence between the two files.

#### REC-P2: Add Context-Aware Tone Shifting
**Priority:** MEDIUM
**Description:** The current LLM system prompt does not dynamically adjust based on conversation mood or context. A companion with a "Shy" archetype responds the same way whether the conversation is casual small talk or an explicit scene.
**Recommendation:** Pass the `contextAnalysis.expression` and `isUserPresent` fields into the system prompt construction in `buildLLMSystemPrompt()` to modulate the companion's tone. For example, if expression is `embarrassed` and isUserPresent is true, a shy companion should be more flustered and hesitant.

#### REC-P3: Memory-Informed Personality Continuity
**Priority:** MEDIUM
**Description:** Retrieved memories are injected into the system prompt as a raw list. The companion does not adapt its tone or behavior based on accumulated memory context (e.g., becoming more comfortable with the user over many conversations, referencing past shared experiences naturally).
**Recommendation:** In `formatMemoriesWithPersonality()`, add a `conversationFamiliarity` score based on the total count and recency of memories. Pass this score to the LLM system prompt to adjust the companion's warmth, familiarity level, and willingness to reference shared history.

#### REC-P4: DeepThink Prompt Enhancement
**Priority:** LOW
**Description:** DeepThink mode currently only increases `max_tokens` to 400 and reduces temperature to 0.7. This produces longer responses but not necessarily more thoughtful ones.
**Recommendation:** In DeepThink mode, add an explicit system prompt instruction to think step-by-step before responding, consider the emotional subtext of the user's message, and craft a response that demonstrates genuine engagement with the user's situation.

### 6.2 Image Generation Quality

#### REC-I1: Use pgvector for Memory Similarity (Not In-Memory)
**Priority:** HIGH (performance)
**Description:** The current memory retrieval fetches all 100 recent memories and scores them in TypeScript. For users with large memory stores, this will be slow and will miss older but highly relevant memories.
**Recommendation:** Use pgvector's cosine similarity operator for the retrieval query, fetching only the top-N candidates from the database. The query would look like:
```sql
SELECT *, embedding <=> $query_embedding AS distance
FROM "Memory"
WHERE "companionId" = $companionId AND "isActive" = true
ORDER BY distance
LIMIT 100;
```
This is an ANN query that pgvector can optimize with an HNSW or IVFFlat index.

#### REC-I2: Dynamic Prompt Weighting Based on Context
**Priority:** MEDIUM
**Description:** The SD prompt generator always produces prompts with the same structure regardless of scene type. An intimate solo scene and an action outdoor scene benefit from different prompt strategies.
**Recommendation:** In `buildSDPromptSystemPrompt()`, add conditional instructions based on the `isUserPresent` and `location` parameters. For example: in intimate/solo scenes, emphasize soft lighting and close-up framing; in outdoor scenes, prioritize environmental context and full-body shots.

#### REC-I3: Checkpoint Override in `/generate` Page
**Priority:** LOW
**Description:** The `/generate` page has checkpoint override via `override_settings` commented out. This prevents users from switching models from the generate UI.
**Recommendation:** Uncomment and implement the checkpoint override, passing the selected checkpoint name via `override_settings.sd_model_checkpoint`. Add a dropdown to the generate page UI showing available checkpoints.

#### REC-I4: Image Caching Strategy
**Priority:** MEDIUM
**Description:** Generated images are served from `public/uploads/` by Next.js static file handler with no cache headers. Every page load re-fetches images.
**Recommendation:** Add a `Cache-Control: public, max-age=31536000, immutable` header for the `public/uploads/` path. Since filenames include nanoid, they are content-addressable and safe to cache forever.

### 6.3 Voice System

#### REC-V1: Fix `getVoicePreviewUrl()` Logic
**Priority:** HIGH
**Description:** The voice preview URL logic is inverted (see ISSUE-H5). Fix this as described.

#### REC-V2: Stream Voice Generation Progress
**Priority:** LOW
**Description:** Voice generation currently blocks workflow progress at the 85-90% step. Large responses take 3-5 seconds for ElevenLabs to generate. The user sees a "Generating voice..." spinner with no progress feedback.
**Recommendation:** Since ElevenLabs does not provide streaming for v2 multilingual, consider using ElevenLabs streaming endpoint (`/v1/text-to-speech/{voiceId}/stream`) and building audio chunks progressively, or move voice generation off the critical path (similar to memory extraction).

#### REC-V3: Voice Response Chunking for Long Messages
**Priority:** MEDIUM
**Description:** The 5000 character limit in `generateSpeech()` silently truncates long responses. The LLM can generate responses longer than this (especially with DeepThink mode).
**Recommendation:** Add a check in `voice-generator.ts` before calling ElevenLabs. If the text is too long, either truncate to the first natural sentence break under 5000 characters with a log warning, or split into multiple audio chunks (concatenated client-side).

### 6.4 Features

#### REC-F1: Store Raw Wizard State in DB
**Priority:** HIGH
**Description:** The edit mode brittle regex parsing (ISSUE-H4) fundamentally undermines the edit experience. This is the most impactful feature improvement.
**Recommendation:** Add a `wizardStateJson String?` column to the `Companion` model. On create/update via wizard, JSON-serialize the `CompanionWizardState` and store it alongside the compiled fields. On edit, read from `wizardStateJson` when present, falling back to `parseCompanionToWizardState()` for companions without it.

#### REC-F2: Real-Time Companion Online Status
**Priority:** LOW
**Description:** The chat page does not indicate whether the companion's backend is operational (Temporal worker running, SD API reachable, etc.).
**Recommendation:** Extend the health check endpoint to return per-service status (Temporal reachable, Redis reachable, SD API reachable). Display a status indicator in the chat header.

#### REC-F3: Conversation Search
**Priority:** LOW
**Description:** With 100-message history loads and no search, finding past conversations is impossible.
**Recommendation:** Add full-text search over `Message.content` for a given companion using PostgreSQL's `to_tsvector`/`to_tsquery` functions.

#### REC-F4: Companion Export/Import
**Priority:** LOW
**Description:** Users cannot back up or transfer companions between accounts. The clone feature only works for published companions.
**Recommendation:** Add export action that serializes a companion to a JSON file (with optional image download). Add import action that creates a companion from a JSON file.

#### REC-F5: Admin Dashboard
**Priority:** MEDIUM
**Description:** There is no admin role or management interface. Content moderation of published companions (removing inappropriate ones), user management (banning), and system health monitoring all require direct database access.
**Recommendation:** Add an `isAdmin` field to `User`. Create `/admin` routes protected by admin role check. Implement companion moderation (remove from community, hide), user management, and system stats.

### 6.5 Performance

#### REC-PERF1: Add Database Indexes
**Priority:** HIGH
**Description:** Several query patterns lack indexes:
- `Message.companionId` + `Message.imageUrl IS NOT NULL` (gallery queries)
- `Memory.companionId` + `Memory.isActive` + `Memory.createdAt` (memory retrieval)
- `Companion.isPublic` + `Companion.deletedAt` + `Companion.viewCount` (community listing)
- `ScheduledMessage.isActive` + `ScheduledMessage.nextRunAt` (cron processing)
- `WorkflowExecution.workflowId` (streaming route lookup)

**Recommendation:** Add composite indexes in `schema.prisma` for all of these patterns.

#### REC-PERF2: CDN for Uploaded Images
**Priority:** MEDIUM
**Description:** All images are served directly from the Node.js process via Next.js static file handling. At any reasonable traffic level this will saturate the process.
**Recommendation:** Move uploaded files to an object storage (e.g., S3/R2/B2) and serve via CDN. Update `storage.ts` to write to S3 instead of the local filesystem.

#### REC-PERF3: Parallel Cron Processing
**Priority:** MEDIUM
**Description:** The cron endpoint processes scheduled messages sequentially. With many active schedules, a single slow workflow can block all subsequent ones.
**Recommendation:** Process scheduled messages in parallel using `Promise.allSettled()` or a bounded concurrency queue (e.g., p-queue with concurrency=5).

#### REC-PERF4: Message History Truncation
**Priority:** LOW
**Description:** `chat-actions.ts` fetches the last 30 messages for workflow history. The LLM system prompt also includes memories and personality instructions. With very verbose companions or long messages, the total prompt length may approach or exceed model context limits.
**Recommendation:** Track approximate token count of the message history and truncate from oldest messages first if approaching the model's context limit. Log when truncation occurs.

### 6.6 Developer Experience

#### REC-DX1: Add Worker to Docker Compose
**Priority:** HIGH
**Description:** See ISSUE-M7. The #1 cause of developer confusion is forgetting to start the worker.

#### REC-DX2: Centralize Novita URL/Model Configuration
**Priority:** HIGH
**Description:** Fix ISSUE-H1. All Novita callers should use `env.NOVITA_API_URL` and `env.NOVITA_MODEL`. Consider a shared `callNovita()` helper function that handles the HTTP call, error parsing, and retries consistently.

#### REC-DX3: Add `OPENAI_API_KEY` to `env.ts`
**Priority:** HIGH
**Description:** Fix ISSUE-C2. Also add it to the `.env.example` file if one exists.

#### REC-DX4: Add E2E Tests for Chat Flow
**Priority:** MEDIUM
**Description:** The most critical user journey (sendMessage → stream → finalize) has no automated test. A unit test that mocks Temporal and asserts the correct sequence of DB operations would catch regressions in the chat flow.

#### REC-DX5: Add `CONTRIBUTING.md` and `.env.example`
**Priority:** LOW
**Description:** New developers need to know which env vars to set and how to start the full stack. A `.env.example` listing all required and optional variables (with comments) would reduce onboarding time significantly.

#### REC-DX6: TypeScript Strict Mode
**Priority:** MEDIUM
**Description:** The `tsconfig.json` was not audited, but the codebase uses `any` in several places (wizard update function, EditMode props). Enabling `strict: true` and fixing the remaining type errors would improve long-term type safety.

---

## 7. Quick Wins

These are low-effort, high-impact improvements that can be done in under an hour each:

| ID | Task | Effort | Impact |
|----|------|--------|--------|
| QW1 | Run `npx prisma db push && npx prisma generate` to fix `averageRating` | 5 min | CRITICAL — unblocks rating feature |
| QW2 | Add `OPENAI_API_KEY` to `src/lib/env.ts` and `.env` file | 10 min | HIGH — fixes embedding failures |
| QW3 | Replace hardcoded Novita URLs with `env.NOVITA_API_URL` in context-analyzer, sd-prompt-generator, memory-extractor | 30 min | HIGH — enables provider switching |
| QW4 | Replace `console.error` in `voice/preview/route.ts` with `apiLogger.error` | 5 min | LOW — improves observability |
| QW5 | Change image cropper to output JPEG: `canvas.toDataURL("image/jpeg", 0.9)` | 5 min | LOW — removes unnecessary PNG→JPEG conversion |
| QW6 | Fix `getVoicePreviewUrl()` to return hardcoded `previewUrl` for known voices | 15 min | MEDIUM — fixes voice preview for users without API key |
| QW7 | Add password complexity hints to the register page | 20 min | MEDIUM — dramatically improves registration UX |
| QW8 | Add `loading="lazy"` to gallery and community card images | 10 min | LOW — improves page load performance |
| QW9 | Add `robots.txt` to prevent indexing private routes | 15 min | LOW — basic SEO hygiene |
| QW10 | Replace `process.env.NOVITA_KEY` in `image-generator.ts` with `env.NOVITA_KEY` | 2 min | LOW — consistency fix |

---

## 8. Summary

### Overall Assessment

`my-companion-hub` is a well-architected project with thoughtful engineering decisions at its core. The Temporal workflow orchestration, Redis-backed streaming with DB fallback, hybrid memory scoring, outfit layering filter, and tiered error handling all demonstrate mature thinking about reliability and user experience in an AI pipeline context. The codebase is reasonably clean, TypeScript throughout, and the most critical paths (memory system, context analysis, streaming) have good test coverage.

The primary technical debts are:

1. **Two blocking issues** that must be fixed before the rating and memory features work correctly (ISSUE-C1 and ISSUE-C2)
2. **Configuration inconsistency** in how Novita is called (ISSUE-H1) that undermines configurability
3. **Edit mode reliability** (ISSUE-H4) — the regex-based wizard state reconstruction will break for customized companions
4. **Missing distributed lock** on cron processing (ISSUE-H2) that will cause duplicate messages

The codebase would benefit most from:
1. Storing raw wizard state in the DB (eliminates the brittle edit mode parser)
2. Using pgvector for memory retrieval (enables scale)
3. Adding the Temporal worker to Docker Compose (eliminates a major developer confusion point)
4. Centralizing all Novita API configuration (reduces maintenance burden)
5. Adding database indexes for the most common query patterns (prevents performance degradation as data grows)

### Strengths Summary

- Robust streaming architecture with dual delivery paths (Redis + DB fallback)
- Non-blocking chat flow — user gets immediate feedback while workflow runs
- Graceful degradation at every AI pipeline step
- Comprehensive memory system with hybrid scoring
- Well-structured Temporal workflow with appropriate retry policies
- Thorough personality system with archetypes, traits, behavior rules
- Good security posture (auth, rate limiting, audit logging, input validation)
- SD prompt generation is LLM-driven with character identity anchoring
- Outfit layering filter is creative and correctly scoped
- Test coverage for memory system is excellent

### Risk Areas

- OpenAI embeddings effectively non-functional without `OPENAI_API_KEY` in env.ts
- Rating feature blocked by missing `prisma generate`
- Cron duplicate message risk grows with user base
- Community search will degrade without indexes as companion count grows
- Edit mode will silently corrupt customized companions
- No CDN means image-heavy pages will be slow as content grows

### Lines of Code Estimate

| Category | Files | Approx Lines |
|----------|-------|-------------|
| Temporal workflow + activities | 12 | ~2,500 |
| Library modules | 18 | ~1,800 |
| Server actions + API routes | 9 | ~1,200 |
| Configuration + prompts | 12 | ~1,000 |
| React components | ~30 | ~4,000 |
| Type definitions | 2 | ~250 |
| Tests | 10 | ~2,500 |
| **Total** | **~93** | **~13,250** |

---

*This document reflects the state of the codebase as of 2026-02-25. It should be updated when significant architectural changes are made or new issues are discovered.*
