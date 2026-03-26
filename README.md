# my-companion-hub

A full-stack AI companion platform where you create, chat with, and share custom AI companions. Companions maintain persistent state across conversations — tracking mood, affection, trust, outfit, and memories — and respond with contextually generated images, voice, and text.

---

## Features

- **Multi-step Companion Wizard** — define 50+ attributes: personality archetype, physical appearance, speech style, emotional traits, relationships, and more
- **Persistent Companion State** — companions track `currentMood` (12 states), `affectionLevel`, and `trustLevel` (0–100), updating every conversation turn
- **9 Personality Archetypes** — Adventurous, Shy, Dominant, Bratty, Motherly, Yandere, Tsundere, Kuudere, Dandere — each with full behavioral profiles
- **Real-time Token Streaming** — LLM responses stream token-by-token via Redis pub/sub → SSE
- **AI Image Generation** — Stable Diffusion images generated per-message with contextually aware scene descriptions; separate image gallery per companion
- **Semantic Memory** — companions remember facts, preferences, and emotional moments using vector embeddings (pgvector); retrieved via RAG each turn
- **Voice Synthesis** — optional ElevenLabs TTS per companion with per-message audio playback
- **Scheduled Messages** — cron-based automated messages from companions with timezone support
- **Community Marketplace** — publish, discover, clone, and rate companions created by other users
- **SFW Mode** — server-side toggle that suppresses explicit content throughout the application
- **306 passing tests** across 14 test files

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Database | PostgreSQL + pgvector, Prisma ORM |
| Workflow Engine | Temporal.io (durable multi-step AI orchestration) |
| Streaming | Redis pub/sub → Server-Sent Events |
| LLM | Novita AI (`sao10k/l31-70b-euryale-v2.2`) |
| Image Generation | Stable Diffusion (SD Forge / Novita) |
| Voice | ElevenLabs (optional) |
| Auth | next-auth v5 beta (credentials, JWT) |
| Testing | Vitest, Testing Library, MSW |
| Styling | Tailwind CSS v3 |

---

## Architecture

```
User Message
    │
    ▼
Next.js Server Action (sendMessage)
    │
    ▼
Temporal ChatWorkflow ──────────────────────────────────────┐
    │                                                        │
    ├── context-analyzer    (extract scene/visual context)  │
    ├── memory-retriever    (semantic search via pgvector)  │
    ├── llm-generator       (Novita API, token streaming)   │
    │       │                                               │
    │       └── Redis pub/sub ── SSE route ── client hook  │
    ├── sd-prompt-generator (build optimized SD prompt)    │
    ├── image-generator     (Stable Diffusion API)         │
    ├── voice-generator     (ElevenLabs TTS, optional)     │
    └── memory-extractor    (parse memories + mood deltas) │
                                                            │
    ▼                                                       │
finalizeMessage (save to DB) ◄──────────────────────────────┘
```

The Temporal worker runs as a separate process from the Next.js server. Docker Compose manages Postgres, Temporal, and Redis.

---

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- A [Novita AI](https://novita.ai) API key (LLM)
- A Stable Diffusion instance (local SD Forge, or Novita)
- *(Optional)* An [ElevenLabs](https://elevenlabs.io) API key (voice)

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/KarWah/my_companion_hub.git
cd my-companion-hub
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/companion_hub"

# Auth
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# LLM
NOVITA_KEY="your-novita-api-key"

# Image generation
SD_API_URL="http://localhost:7860"

# Temporal
TEMPORAL_ADDRESS="localhost:7233"

# Optional
ELEVENLABS_API_KEY="your-elevenlabs-key"
CRON_SECRET="random-bearer-token-for-cron-endpoint"
SFW_MODE="false"
```

### 3. Start infrastructure

```bash
docker-compose up -d
```

Starts PostgreSQL (port 5432), Temporal (port 7233), and Redis (port 6379).

### 4. Initialize the database

```bash
npx prisma db push
npx prisma generate
```

### 5. Run the application

In two separate terminals:

```bash
# Terminal 1 — Next.js dev server
npm run dev

# Terminal 2 — Temporal worker (required for chat to work)
npm run worker
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Run production build |
| `npm run worker` | Start Temporal worker (required for chat) |
| `npm run test` | Run Vitest in watch mode |
| `npm run test:run` | Run all tests once |
| `npm run test:ui` | Open Vitest browser UI |
| `npm run db:push` | Apply Prisma schema to database |
| `npm run db:studio` | Open Prisma Studio (database GUI) |
| `npm run lint` | Run ESLint |

---

## Project Structure

```
src/
├── app/                    # Next.js pages and API routes
│   ├── api/
│   │   ├── auth/           # NextAuth endpoints
│   │   ├── chat/stream/    # SSE token streaming
│   │   ├── cron/           # Scheduled message trigger
│   │   ├── health/         # Health check
│   │   └── voice/preview/  # ElevenLabs audio proxy
│   ├── companions/         # Companion list, create, edit, schedules
│   ├── community/          # Public companion discovery + ratings
│   ├── gallery/            # Per-companion image galleries
│   ├── generate/           # Standalone image generation tool
│   ├── settings/           # App settings + memory management
│   └── page.tsx            # Main chat page
├── components/
│   ├── wizard/             # Multi-step companion creation wizard
│   └── community/          # Discovery feed, ratings, clone button
├── config/
│   ├── personality-profiles.ts   # 9 archetype definitions
│   └── prompts/                  # LLM system prompt templates
├── lib/                    # Utilities (auth, redis, storage, rate limiting, etc.)
├── temporal/
│   ├── workflows.ts        # ChatWorkflow definition
│   ├── activities.ts       # Activity orchestration layer
│   └── activities/         # Individual activity implementations
└── hooks/
    └── useWorkflowStream.ts  # SSE client hook
prisma/
└── schema.prisma           # 10 models: User, Companion, Message, Memory, Rating, ...
```

---

## Database Models

| Model | Purpose |
|---|---|
| `User` | Account, hashed password, settings (RAG, deep think, SFW) |
| `Companion` | Full companion definition, mood, affection/trust levels, public status |
| `Message` | Chat history with image/audio URLs per message |
| `Memory` | Extracted facts with vector embeddings for semantic recall |
| `WorkflowExecution` | Temporal workflow state and streamed text for SSE fallback |
| `Rating` | 1–5 star ratings with optional review text |
| `ScheduledMessage` | Cron expression, template, timezone, execution tracking |
| `RateLimit` | Per-user and per-IP rate limiting records |
| `AuditLog` | Security event log (login, companion ops, ratings) |

---

## API Routes

| Route | Auth | Description |
|---|---|---|
| `GET /api/health` | None | Database + Temporal connectivity check |
| `POST /api/auth/[...nextauth]` | None | NextAuth session endpoints |
| `GET /api/chat/stream/[workflowId]` | Session | SSE token stream for active workflow |
| `POST /api/cron/scheduled-messages` | Bearer token | External cron trigger for scheduled messages |
| `GET /api/voice/preview` | Session | Proxy audio from ElevenLabs CDN |

---

## Pages

| Path | Description |
|---|---|
| `/` | Main chat interface |
| `/companions` | List your companions |
| `/companions/new` | Create companion (6-step wizard) |
| `/companions/[id]/edit` | Edit companion |
| `/companions/[id]/schedules` | Manage scheduled messages |
| `/gallery` | Image gallery overview |
| `/gallery/[id]` | Per-companion gallery (paginated) |
| `/generate` | Standalone image generation tool |
| `/community` | Discover public companions |
| `/community/[id]` | Companion profile + rating |
| `/settings` | App settings, memory wipe |
| `/login` / `/register` | Authentication |

---

## License

This project is for personal and educational use.
