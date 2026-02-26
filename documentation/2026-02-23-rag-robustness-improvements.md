# RAG Robustness Improvements

## Context
The current RAG memory system works conceptually but has three critical gaps:
1. **No pgvector search** — retrieval fetches the 100 most-recent memories into JS and runs cosine similarity in a loop. Memories older than ~100 conversations are permanently invisible regardless of importance.
2. **No deduplication** — every conversation appends new memories without checking for near-duplicates. Long-term users accumulate dozens of "User is a software engineer" variants.
3. **No similarity threshold** — all top-10 memories are injected into the prompt regardless of relevance score, wasting tokens on unrelated facts.

Additionally, `OPENAI_API_KEY` is missing from `env.ts` despite `embeddings.ts` referencing `env.OPENAI_API_KEY`, causing a silent runtime crash that degrades all three improvements.

---

## Changes

### 1. `src/lib/env.ts`
- Add `'OPENAI_API_KEY'` to `optionalEnvVars` array
- Add `OPENAI_API_KEY: process.env.OPENAI_API_KEY || ''` to the `env` object
- Optionally: add a `console.warn` in `validateEnv()` when OPENAI_API_KEY is absent so the degraded mode is visible in logs

### 2. `src/temporal/activities/memory-retriever.ts`

**New constants:**
```typescript
const MIN_SIMILARITY_THRESHOLD = 0.25; // Below this, memory is considered irrelevant
const CANDIDATE_LIMIT = 50;            // How many candidates DB returns before re-ranking
```

**When `queryEmbedding` is available (main path):**
Replace `prisma.memory.findMany({ take: 100 })` with a `$queryRawUnsafe` pgvector query:
```sql
SELECT id, "companionId", content, category, importance,
       "sourceMessageIds", context, "isActive", "accessCount",
       "lastAccessedAt", "createdAt", "updatedAt"
FROM "Memory"
WHERE "companionId" = $1 AND "isActive" = true
ORDER BY embedding <=> $2::vector
LIMIT 50
```
Where `$2` is the query embedding formatted as `'[0.1,0.2,...]'`.

Then apply hybrid scoring on the 50 candidates (same 60/30/10 formula as today), then filter `similarity < MIN_SIMILARITY_THRESHOLD`, then take top 10.

**When `queryEmbedding` is unavailable (fallback path):**
Keep existing `prisma.memory.findMany({ take: 100, orderBy: { createdAt: 'desc' } })` behavior. No threshold filtering (similarity is 0 for all).

**Why 50 candidates:** DB does the expensive semantic pre-filter; JS does the nuanced hybrid re-ranking on a small set. This removes the "100 most-recent" hard cap.

### 3. `src/temporal/activities/memory-extractor.ts`

**Deduplication before each write:**
After generating a memory's embedding but before `prisma.memory.create`, run:
```sql
SELECT id FROM "Memory"
WHERE "companionId" = $1 AND "isActive" = true
  AND embedding <=> $2::vector < 0.08
LIMIT 1
```
Cosine distance < 0.08 ≈ cosine similarity > 0.92 (near-duplicate).

If a row is returned, skip storing and log at `debug` level with the conflicting memory ID.

**Also:** Replace hardcoded `https://api.novita.ai/v3/openai/chat/completions` with `env.NOVITA_API_URL` (already in env.ts at line 98, just not used here).

### 4. Test updates

**`src/temporal/activities/memory-retriever.test.ts`**
- Happy-path tests: switch mock from `prisma.memory.findMany` → `prisma.$queryRawUnsafe` (or `prisma.$queryRaw`)
- Keep `findMany` mock only for the fallback (no embeddings) path
- Add: threshold test — memories with similarity < 0.25 are excluded from results
- Add: empty-result test when all candidates are below threshold

**`src/temporal/activities/memory-extractor.test.ts`**
- Add: dedup test — when `$queryRawUnsafe` returns an existing memory, the new one is NOT written to DB
- Add: dedup non-match test — when no similar memory found, write proceeds normally

---

## Prerequisite: pgvector extension
The docker-compose uses `pgvector/pgvector:pg18-trixie` which ships pgvector. The extension must be enabled:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
This should already be done if the schema has been pushed (the `Unsupported("vector(1536)")` column would have failed otherwise). Verify by running `\dx` in psql before testing.

---

## Files to modify
| File | Change |
|---|---|
| `src/lib/env.ts` | Add OPENAI_API_KEY optional var |
| `src/temporal/activities/memory-retriever.ts` | pgvector query + threshold filter |
| `src/temporal/activities/memory-extractor.ts` | dedup check + use env.NOVITA_API_URL |
| `src/temporal/activities/memory-retriever.test.ts` | update mocks + new tests |
| `src/temporal/activities/memory-extractor.test.ts` | new dedup tests |

---

## Verification
1. Start docker services: `docker compose up -d`
2. Start worker: `npm run worker`
3. Start dev server: `npm run dev`
4. Chat with a companion 3+ times with the same facts (e.g. "I work as a nurse")
5. Check DB: `SELECT COUNT(*) FROM "Memory" WHERE content ILIKE '%nurse%'` — should be 1, not 3+
6. Run tests: `npx vitest run src/temporal/activities/memory-retriever.test.ts src/temporal/activities/memory-extractor.test.ts`
