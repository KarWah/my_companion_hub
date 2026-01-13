# Companion Hub - Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Database Schema](#database-schema)
5. [Authentication System](#authentication-system)
6. [Chat & Workflow System](#chat--workflow-system)
7. [Temporal Workflows](#temporal-workflows)
8. [Image Generation](#image-generation)
9. [Rate Limiting](#rate-limiting)
10. [Security](#security)
11. [API Reference](#api-reference)
12. [Configuration](#configuration)
13. [Development Guide](#development-guide)

---

## Overview

**Companion Hub** is a production-ready, self-hosted AI companion chat application that enables users to create and interact with personalized AI companions. The application features real-time streaming chat, AI-generated images using Stable Diffusion, and dynamic context tracking for immersive conversations.

### Key Features
- **Personalized AI Companions**: Create companions with custom personalities, appearances, and behaviors
- **Streaming Chat**: Real-time message streaming with visual context awareness
- **AI Image Generation**: Automatic companion image generation based on conversation context
- **Dynamic State Tracking**: Companions remember and update their outfit, location, and current action
- **Multi-user Support**: Secure authentication with user isolation
- **Gallery**: View all AI-generated images
- **Rate Limiting**: Comprehensive protection against abuse

---

## Architecture

### System Design

Companion Hub follows a modern serverless architecture using Next.js 16 with the App Router pattern:

```
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
└────────┬────────┘
         │
         ├─── Server Actions (actions.ts, chat-actions.ts, auth-actions.ts)
         │
         ├─── API Routes (/api/auth, /api/chat/stream)
         │
         ├─── NextAuth v5 (Authentication)
         │
         └─── Temporal.io (Workflow Engine)
                    │
                    ├─── Activities (LLM, Image Gen, DB Updates)
                    │
                    └─── Workflows (ChatWorkflow)
                             │
                             ├─── Novita AI (LLM API)
                             ├─── Stable Diffusion (Image API)
                             └─── PostgreSQL (Data Storage)
```

### Data Flow: Sending a Message

```
User types message → ChatForm
  ↓
calls sendMessage() Server Action
  ↓
Creates:
  - User Message record
  - WorkflowExecution record
  - Temporal ChatWorkflow started
  ↓
Returns workflowId immediately (optimistic UI update)
  ↓
Frontend subscribes to SSE endpoint: /api/chat/stream/[workflowId]
  ↓
SSE polls database every 100ms for:
  - Streamed tokens (AI response text)
  - Progress updates (0-100%)
  - Status changes
  ↓
Temporal Workflow runs 5 steps:
  1. Analyzing context
  2. Generating LLM response (streaming tokens to DB)
  3. Re-analyzing final context
  4. Updating companion state
  5. Generating companion image (optional)
  ↓
Workflow completes → SSE sends "complete" event
  ↓
Frontend calls finalizeMessage()
  ↓
Saves assistant Message record
  ↓
Page revalidates, shows real message from DB
```

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.0.x | React framework with App Router |
| React | 19.x | UI library |
| TypeScript | 5.9.x | Type safety |
| Tailwind CSS | 3.x | Utility-first styling |
| Lucide React | Latest | Icon library |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js Server Actions | 16.0.x | Type-safe API layer |
| NextAuth | 5.x (Beta) | Authentication |
| Prisma | 7.x | ORM for PostgreSQL |
| PostgreSQL | 15+ | Primary database |
| Temporal.io | 1.13.x | Workflow orchestration |
| Pino | Latest | Structured logging |

### AI/ML Services
| Service | Purpose |
|---------|---------|
| Novita AI API | LLM inference (sao10k/l31-70b-euryale-v2.2 model) |
| Stable Diffusion Forge | Image generation (832x1216 portraits) |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker Compose | Local development environment |
| Sharp | Image optimization (mozjpeg compression) |
| bcryptjs | Password hashing |
| Zod | Runtime validation |
| nanoid | UUID generation |

---

## Database Schema

### Entity Relationship Diagram

```
User (1) ────────┐
                 │
                 │ (1:Many)
                 ├─────> Companion (Many)
                 │             │
                 │             │ (1:Many)
                 │             ├─────> Message (Many)
                 │             │
                 │             └─────> WorkflowExecution (Many)
                 │
                 └─────> RateLimit (Many)
```

### Core Entities

#### User
```prisma
model User {
  id              String      @id @default(uuid())
  email           String      @unique
  username        String      @unique
  name            String      // Display name shown to companions
  hashedPassword  String
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  companions      Companion[]
}
```

**Key Fields:**
- `email`: Unique, used for login
- `username`: Unique, lowercase, used for login
- `name`: How the user appears to companions (e.g., "Master", "John")
- `hashedPassword`: bcrypt hash with 10 salt rounds

**Indexes:**
- Primary key: `id`
- Unique: `email`, `username`

---

#### Companion
```prisma
model Companion {
  id                  String              @id @default(uuid())
  userId              String
  name                String              // e.g., "Luna"
  description         String              // Personality (e.g., "Shy catgirl maid")
  visualDescription   String              // Physical appearance for image gen
  userAppearance      String?             // Optional: how user looks to companion

  // Dynamic state (updated by AI)
  defaultOutfit       String              // Starting outfit
  currentOutfit       String              // Current outfit (can change)
  currentLocation     String              // Current location
  currentAction       String              // What companion is doing

  // Images
  headerImageUrl      String?             // Profile picture
  headerImageLegacy   String?             // DEPRECATED: Old field for migration

  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  user                User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages            Message[]
  workflowExecutions  WorkflowExecution[]

  @@index([userId, createdAt(sort: Desc)])
}
```

**Key Fields:**
- `description`: AI personality (e.g., "A playful, teasing fox spirit who loves pranks")
- `visualDescription`: Physical tags for image generation (e.g., "1girl, fox ears, orange hair, amber eyes")
- `currentOutfit`, `currentLocation`, `currentAction`: Dynamically updated by AI during conversations
- `headerImageUrl`: User-uploaded profile picture

**Indexes:**
- Primary key: `id`
- Composite: `[userId, createdAt DESC]` for efficient companion listing

---

#### Message
```prisma
model Message {
  id          String    @id @default(uuid())
  companionId String
  role        String    // "user" | "assistant"
  content     String    @db.Text
  imageUrl    String?   // AI-generated image (optional)
  createdAt   DateTime  @default(now())

  companion   Companion @relation(fields: [companionId], references: [id], onDelete: Cascade)

  @@index([companionId, createdAt(sort: Desc)])
}
```

**Key Fields:**
- `role`: Either "user" (human message) or "assistant" (AI response)
- `content`: Message text (can be long, stored as TEXT)
- `imageUrl`: Optional URL to AI-generated image associated with this message

**Indexes:**
- Primary key: `id`
- Composite: `[companionId, createdAt DESC]` for fast chat history queries

---

#### WorkflowExecution
```prisma
model WorkflowExecution {
  id              String    @id @default(uuid())
  workflowId      String    @unique // Temporal workflow ID
  companionId     String
  status          String    // "started" | "analyzing" | "responding" | "imaging" | "completed" | "failed"
  progress        Int       @default(0) // 0-100
  currentStep     String?   // Human-readable step (e.g., "Generating response...")
  streamedText    String?   @db.Text // Accumulating tokens during streaming
  imageUrl        String?   // Generated image URL (if applicable)
  error           String?   @db.Text
  userMessageId   String?   // Reference to the user message that triggered this
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  companion       Companion @relation(fields: [companionId], references: [id], onDelete: Cascade)

  @@index([companionId, status, createdAt(sort: Desc)])
  @@index([createdAt])
}
```

**Key Fields:**
- `workflowId`: Unique Temporal workflow ID (used for SSE streaming subscription)
- `status`: Current workflow stage
- `progress`: 0-100 percentage for UI progress bars
- `streamedText`: AI response tokens accumulate here during generation (polled by SSE)
- `imageUrl`: URL to generated image (if image generation was enabled)

**Indexes:**
- Primary key: `id`
- Unique: `workflowId`
- Composite: `[companionId, status, createdAt DESC]` for filtering active workflows
- Single: `[createdAt]` for cleanup queries

---

#### RateLimit
```prisma
model RateLimit {
  id         String   @id @default(uuid())
  identifier String   // IP:action or userId:action
  action     String   // "login", "register", "chat", "image", "companion_create", "settings"
  count      Int      @default(1)
  resetAt    DateTime // When this window expires
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([identifier, action])
  @@index([resetAt])
}
```

**Key Fields:**
- `identifier`: Unique string combining IP/userId with action (e.g., "192.168.1.1:login" or "user-123:chat")
- `action`: Type of rate-limited operation
- `count`: Current attempts within this window
- `resetAt`: Timestamp when count resets to 0

**Indexes:**
- Primary key: `id`
- Unique: `[identifier, action]` for fast lookups
- Single: `[resetAt]` for cleanup queries

---

### Database Optimization Notes

1. **Composite Indexes**: Optimized for common query patterns (e.g., fetching user's companions sorted by creation date)
2. **Cascade Deletes**: Deleting a user automatically removes companions, messages, workflow executions
3. **Image Storage**: URLs stored (not base64) to avoid bloating database (5MB image → 7MB+ base64)
4. **Text Fields**: `@db.Text` used for long content (messages, errors) to avoid VARCHAR limits

---

## Authentication System

### Overview
Authentication is handled by **NextAuth v5** with a custom credentials provider. The system supports username/email login with rate limiting and secure password hashing.

### Registration Flow

**File**: `src/app/auth-actions.ts`

```typescript
export async function register(data: {
  name: string
  email: string
  username: string
  password: string
}) {
  // 1. Rate limit check (3 registrations per 24 hours per IP)
  const ip = await getClientIp()
  await checkRateLimit(`${ip}:register`, 'register', 3, 24 * 60)

  // 2. Validate input (Zod schema)
  const validated = registrationSchema.parse(data)

  // 3. Check uniqueness (email, username)
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: validated.email.toLowerCase() },
        { username: validated.username.toLowerCase() }
      ]
    }
  })
  if (existing) throw new Error('User already exists')

  // 4. Hash password (bcrypt, 10 rounds)
  const hashedPassword = await hashPassword(validated.password)

  // 5. Create user
  await prisma.user.create({
    data: {
      name: validated.name,
      email: validated.email.toLowerCase(),
      username: validated.username.toLowerCase(),
      hashedPassword
    }
  })

  // 6. Redirect to login
  redirect('/login')
}
```

**Validation Rules**:
- `name`: 1-50 characters
- `email`: Valid email format, unique
- `username`: 3-20 characters, alphanumeric + underscore, unique
- `password`: Minimum 8 characters

**Rate Limiting**: 3 registrations per 24 hours per IP address

---

### Login Flow

**File**: `src/lib/auth.ts`

```typescript
export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      async authorize(credentials) {
        // 1. Validate input
        const { identifier, password } = credentials

        // 2. Rate limit (5 attempts per 15 minutes per IP:identifier)
        const ip = await getClientIp()
        await checkRateLimit(`${ip}:${identifier}`, 'login', 5, 15)

        // 3. Find user by email OR username (case-insensitive)
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier.toLowerCase() },
              { username: identifier.toLowerCase() }
            ]
          }
        })
        if (!user) return null

        // 4. Verify password
        const isValid = await bcrypt.compare(password, user.hashedPassword)
        if (!isValid) return null

        // 5. Return user for JWT
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  }
}
```

**Features**:
- Accepts username OR email for login
- Case-insensitive matching
- Rate limited: 5 attempts per 15 minutes per IP+identifier
- JWT session strategy
- 30-day session expiration

---

### Authorization Helpers

**File**: `src/lib/auth-helpers.ts`

#### getAuthenticatedUser()
```typescript
export async function getAuthenticatedUser() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }
  return {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.name!,
    username: session.user.username!
  }
}
```

Used in all protected server actions to verify authentication.

#### verifyCompanionOwnership()
```typescript
export async function verifyCompanionOwnership(companionId: string, userId: string) {
  const companion = await prisma.companion.findUnique({
    where: { id: companionId },
    select: { userId: true }
  })

  if (!companion) {
    throw new Error('Companion not found')
  }

  if (companion.userId !== userId) {
    throw new Error('Unauthorized: You do not own this companion')
  }

  return companion
}
```

Prevents users from accessing/modifying other users' companions.

---

### Security Features

1. **Password Hashing**: bcryptjs with 10 salt rounds
2. **Rate Limiting**: IP-based (registration, login) and user-based (actions)
3. **Case-Insensitive Login**: Users can use any case for username/email
4. **Session Management**: JWT tokens with 30-day expiration
5. **Authorization Checks**: Ownership verification on all mutations
6. **No Password Logging**: Passwords never appear in logs

---

## Chat & Workflow System

### Overview
The chat system uses a **non-blocking, async architecture** powered by Temporal.io. When a user sends a message, the system:
1. Creates a user message record
2. Starts a background Temporal workflow
3. Returns immediately (no waiting)
4. Streams updates via Server-Sent Events (SSE)
5. Finalizes the assistant message when workflow completes

This architecture ensures the UI never freezes, even during slow LLM/image generation.

---

### Sending a Message

**File**: `src/app/chat-actions.ts`

```typescript
export async function sendMessage(
  companionId: string,
  content: string,
  generateImage: boolean = false
) {
  // 1. Authenticate
  const user = await getAuthenticatedUser()

  // 2. Verify ownership
  await verifyCompanionOwnership(companionId, user.id)

  // 3. Rate limit (30 messages per minute)
  await checkRateLimit(`${user.id}:chat`, 'chat', 30, 1)

  // 4. Create user message
  const userMessage = await prisma.message.create({
    data: {
      companionId,
      role: 'user',
      content
    }
  })

  // 5. Create workflow execution record
  const workflowId = `chat-${nanoid()}`
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId,
      companionId,
      status: 'started',
      progress: 0,
      userMessageId: userMessage.id
    }
  })

  // 6. Start Temporal workflow (non-blocking)
  const client = await getTemporalClient()
  await client.workflow.start(ChatWorkflow, {
    taskQueue: 'companion-chat-queue',
    workflowId,
    args: [{
      companionId,
      userMessage: content,
      userId: user.id,
      userName: user.name,
      shouldGenerateImage: generateImage
    }]
  })

  // 7. Return workflow ID immediately (UI can subscribe to SSE)
  return {
    workflowId,
    userMessageId: userMessage.id
  }
}
```

**Key Points**:
- Returns **immediately** after starting workflow (doesn't wait for completion)
- Rate limited: 30 messages per minute per user
- Creates `WorkflowExecution` record for tracking progress
- Frontend subscribes to `/api/chat/stream/[workflowId]` for updates

---

### SSE Streaming Endpoint

**File**: `src/app/api/chat/stream/[workflowId]/route.ts`

```typescript
export async function GET(
  req: Request,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const { workflowId } = await params

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      // Poll database every 100ms
      const interval = setInterval(async () => {
        const execution = await prisma.workflowExecution.findUnique({
          where: { workflowId }
        })

        if (!execution) {
          clearInterval(interval)
          controller.close()
          return
        }

        // Send progress update
        controller.enqueue(encoder.encode(
          `event: progress\ndata: ${execution.progress}\n\n`
        ))

        // Send new tokens (if any)
        if (execution.streamedText) {
          controller.enqueue(encoder.encode(
            `event: token\ndata: ${JSON.stringify(execution.streamedText)}\n\n`
          ))
        }

        // Send completion event
        if (execution.status === 'completed') {
          controller.enqueue(encoder.encode(
            `event: complete\ndata: ${JSON.stringify(execution)}\n\n`
          ))
          clearInterval(interval)
          controller.close()
        }

        // Send error event
        if (execution.status === 'failed') {
          controller.enqueue(encoder.encode(
            `event: error\ndata: ${JSON.stringify(execution.error)}\n\n`
          ))
          clearInterval(interval)
          controller.close()
        }
      }, 100) // Poll every 100ms
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
```

**Event Types**:
- `progress`: Current progress (0-100)
- `token`: New streamed text
- `complete`: Workflow finished successfully
- `error`: Workflow failed

**Polling Strategy**:
- Polls database every 100ms
- Sends only new tokens (delta)
- Closes stream when workflow completes or fails

---

### Frontend Streaming Hook

**File**: `src/hooks/useWorkflowStream.ts`

```typescript
export function useWorkflowStream(workflowId: string | null) {
  const [state, setState] = useState({
    progress: 0,
    streamedText: '',
    isComplete: false,
    error: null
  })

  useEffect(() => {
    if (!workflowId) return

    const eventSource = new EventSource(`/api/chat/stream/${workflowId}`)

    eventSource.addEventListener('progress', (e) => {
      setState(prev => ({ ...prev, progress: parseInt(e.data) }))
    })

    eventSource.addEventListener('token', (e) => {
      const text = JSON.parse(e.data)
      setState(prev => ({ ...prev, streamedText: text }))
    })

    eventSource.addEventListener('complete', (e) => {
      setState(prev => ({ ...prev, isComplete: true }))
      eventSource.close()
    })

    eventSource.addEventListener('error', (e) => {
      const error = JSON.parse(e.data)
      setState(prev => ({ ...prev, error, isComplete: true }))
      eventSource.close()
    })

    // Cleanup on unmount
    return () => eventSource.close()
  }, [workflowId])

  return state
}
```

**Features**:
- Subscribes to SSE endpoint
- Updates state in real-time
- Cleans up connection on unmount
- Exponential backoff retry (up to 5 attempts)

---

### Finalizing Messages

**File**: `src/app/chat-actions.ts`

```typescript
export async function finalizeMessage(
  workflowId: string,
  companionId: string
) {
  const user = await getAuthenticatedUser()
  await verifyCompanionOwnership(companionId, user.id)

  // Get completed workflow execution
  const execution = await prisma.workflowExecution.findUnique({
    where: { workflowId }
  })

  if (!execution || execution.status !== 'completed') {
    throw new Error('Workflow not completed')
  }

  // Save assistant message
  await prisma.message.create({
    data: {
      companionId,
      role: 'assistant',
      content: execution.streamedText || '',
      imageUrl: execution.imageUrl
    }
  })

  // Revalidate page to show real message
  revalidatePath('/')
}
```

Called by frontend after `complete` event received.

---

## Temporal Workflows

### Overview
Temporal.io orchestrates the multi-step chat workflow, ensuring reliability, retries, and fault tolerance. The main workflow is `ChatWorkflow`, which runs 5 steps to generate an AI response.

---

### ChatWorkflow

**File**: `src/temporal/workflows.ts`

```typescript
export async function ChatWorkflow(input: ChatWorkflowInput): Promise<void> {
  const {
    companionId,
    userMessage,
    userId,
    userName,
    shouldGenerateImage
  } = input

  // Get workflow ID from context
  const workflowId = workflowInfo().workflowId

  try {
    // STEP 1: Analyzing context (10-30% progress)
    await updateProgress(workflowId, 'analyzing', 10, 'Analyzing context...')

    const initialAnalysis = await executeActivity(analyzeContext, {
      companionId,
      userMessage,
      aiResponse: null
    }, { startToCloseTimeout: '2 minutes' })

    await updateProgress(workflowId, 'analyzing', 30, 'Context analyzed')

    // STEP 2: Generating LLM response (30-70% progress)
    await updateProgress(workflowId, 'responding', 30, 'Generating response...')

    const aiResponse = await executeActivity(generateLLMResponse, {
      companionId,
      userMessage,
      userName,
      workflowId
    }, { startToCloseTimeout: '2 minutes' })

    await updateProgress(workflowId, 'responding', 70, 'Response generated')

    // STEP 3: Re-analyze context with AI response (70-80% progress)
    const finalAnalysis = await executeActivity(analyzeContext, {
      companionId,
      userMessage,
      aiResponse
    }, { startToCloseTimeout: '2 minutes' })

    await updateProgress(workflowId, 'analyzing', 80, 'Final context analyzed')

    // STEP 4: Update companion state (80-85% progress)
    if (finalAnalysis.outfit || finalAnalysis.location || finalAnalysis.action) {
      await executeActivity(updateCompanionContext, {
        companionId,
        outfit: finalAnalysis.outfit,
        location: finalAnalysis.location,
        action: finalAnalysis.action
      }, { startToCloseTimeout: '1 minute' })
    }

    await updateProgress(workflowId, 'responding', 85, 'Companion state updated')

    // STEP 5: Generate image (85-100% progress) - Optional
    let imageUrl: string | null = null
    if (shouldGenerateImage) {
      await updateProgress(workflowId, 'imaging', 85, 'Generating image...')

      imageUrl = await executeActivity(generateCompanionImage, {
        companionId,
        outfit: finalAnalysis.outfit,
        location: finalAnalysis.location,
        visualTags: finalAnalysis.visualTags,
        expression: finalAnalysis.expression,
        lighting: finalAnalysis.lighting,
        isUserPresent: finalAnalysis.isUserPresent
      }, { startToCloseTimeout: '2 minutes' })

      await updateProgress(workflowId, 'imaging', 95, 'Image generated')
    }

    // Mark as completed
    await updateProgress(workflowId, 'completed', 100, 'Completed', imageUrl)

  } catch (error) {
    // Mark as failed
    await updateProgress(workflowId, 'failed', 0, 'Failed', null, error.message)
    throw error
  }
}

// Helper to update workflow execution progress
async function updateProgress(
  workflowId: string,
  status: string,
  progress: number,
  currentStep: string,
  imageUrl?: string | null,
  error?: string
) {
  await executeActivity(updateWorkflowExecution, {
    workflowId,
    status,
    progress,
    currentStep,
    imageUrl,
    error
  }, { startToCloseTimeout: '30 seconds' })
}
```

**5 Steps**:
1. **Analyzing** (10-30%): Analyze user message to extract outfit/location/action
2. **Responding** (30-70%): Generate LLM response with streaming
3. **Re-analyzing** (70-80%): Analyze AI response to capture final state
4. **Updating** (80-85%): Update companion's current outfit/location/action
5. **Imaging** (85-100%): Generate companion image (optional)

---

### Activities

**File**: `src/temporal/activities.ts`

#### 1. analyzeContext()
```typescript
export async function analyzeContext(input: {
  companionId: string
  userMessage: string
  aiResponse: string | null
}): Promise<ContextAnalysis> {
  // Fetch companion + last 10 messages
  const companion = await prisma.companion.findUnique({
    where: { id: input.companionId },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  })

  // Build system prompt for context analysis
  const systemPrompt = `You are a context analyzer...`

  // Call Novita AI API
  const response = await fetch('https://api.novita.ai/v3/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.NOVITA_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
        ...(aiResponse ? [{ role: 'assistant', content: aiResponse }] : [])
      ],
      max_tokens: 600,
      temperature: 0.2
    })
  })

  const data = await response.json()
  const rawContent = data.choices[0].message.content

  // Extract JSON (aggressive sanitization)
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    // Fallback to previous state
    return {
      outfit: companion.currentOutfit,
      location: companion.currentLocation,
      action: companion.currentAction,
      visualTags: [],
      isUserPresent: false,
      expression: 'neutral',
      lighting: 'soft natural light'
    }
  }

  const parsed = JSON.parse(jsonMatch[0])
  return {
    outfit: parsed.outfit || companion.currentOutfit,
    location: parsed.location || companion.currentLocation,
    action: parsed.action || companion.currentAction,
    visualTags: parsed.visualTags || [],
    isUserPresent: parsed.isUserPresent || false,
    expression: parsed.expression || 'neutral',
    lighting: parsed.lighting || 'soft natural light'
  }
}
```

**Purpose**: Extract structured context from conversation (outfit, location, action, expression, lighting)

---

#### 2. generateLLMResponse()
```typescript
export async function generateLLMResponse(input: {
  companionId: string
  userMessage: string
  userName: string
  workflowId: string
}): Promise<string> {
  // Fetch companion + history
  const companion = await prisma.companion.findUnique({
    where: { id: input.companionId },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  })

  // Build conversation history
  const messages = [
    {
      role: 'system',
      content: `You are ${companion.name}. ${companion.description}
Current state: ${companion.currentOutfit}, ${companion.currentLocation}, ${companion.currentAction}
User: ${input.userName} (${companion.userAppearance || 'appearance not specified'})`
    },
    ...companion.messages.reverse().map(m => ({
      role: m.role,
      content: m.content
    })),
    { role: 'user', content: input.userMessage }
  ]

  // Call Novita AI with streaming
  const response = await fetch('https://api.novita.ai/v3/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.NOVITA_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sao10k/l31-70b-euryale-v2.2',
      messages,
      max_tokens: 200,
      temperature: 0.9,
      stream: true
    })
  })

  // Process SSE stream
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') break

        const parsed = JSON.parse(data)
        const token = parsed.choices[0]?.delta?.content || ''
        fullText += token

        // Write to DB every 100ms for SSE polling
        await prisma.workflowExecution.update({
          where: { workflowId: input.workflowId },
          data: { streamedText: fullText }
        })
      }
    }
  }

  // Clean text (remove asterisk actions, parentheticals)
  const cleaned = fullText
    .replace(/\*[^*]+\*/g, '') // Remove *actions*
    .replace(/\([^)]+\)/g, '') // Remove (thoughts)
    .trim()

  return cleaned
}
```

**Purpose**: Generate AI response with streaming, write tokens to DB for SSE polling

---

#### 3. generateCompanionImage()
```typescript
export async function generateCompanionImage(input: {
  companionId: string
  outfit: string
  location: string
  visualTags: string[]
  expression: string
  lighting: string
  isUserPresent: boolean
}): Promise<string> {
  // Fetch companion
  const companion = await prisma.companion.findUnique({
    where: { id: input.companionId }
  })

  // Smart outfit filtering (remove underwear if outerwear present)
  const outfitLower = input.outfit.toLowerCase()
  const hasOuterwear = ['dress', 'shirt', 'jacket', 'coat', 'robe', 'kimono'].some(
    item => outfitLower.includes(item)
  )
  const filteredOutfit = hasOuterwear
    ? input.outfit.replace(/\b(bra|panties|underwear)\b/gi, '').trim()
    : input.outfit

  // Build prompt
  const characterTags = companion.visualDescription
  const outfitTags = filteredOutfit
  const locationTags = input.location
  const extraTags = input.visualTags.join(', ')
  const expressionTag = input.expression
  const lightingTag = input.lighting

  // User appearance (if present and not virtual context)
  const virtualContexts = ['pov', 'selfie', 'mirror', 'photo']
  const isVirtualContext = virtualContexts.some(ctx =>
    input.location.toLowerCase().includes(ctx)
  )
  const userAppearance = (input.isUserPresent && !isVirtualContext && companion.userAppearance)
    ? companion.userAppearance
    : ''

  const fullPrompt = [
    characterTags,
    outfitTags,
    locationTags,
    extraTags,
    expressionTag,
    lightingTag,
    userAppearance
  ].filter(Boolean).join(', ')

  // Negative prompt
  const baseNegative = 'bad quality, ugly, deformed, mutated, cropped'
  const soloNegative = input.isUserPresent ? '' : ', 1boy, male, man, penis, boyfriend'
  const groupNegative = input.isUserPresent ? ', extra limbs, floating limbs' : ''
  const nudeNegative = outfitLower.includes('naked') || outfitLower.includes('nude')
    ? ', clothes, shirt, bra, panties'
    : ''

  const negativePrompt = baseNegative + soloNegative + groupNegative + nudeNegative

  // Call Stable Diffusion API
  const response = await fetch(`${env.SD_API_URL}/sdapi/v1/txt2img`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: fullPrompt,
      negative_prompt: negativePrompt,
      width: 832,
      height: 1216,
      steps: 28,
      cfg_scale: 6,
      sampler_name: 'DPM++ 2M',
      batch_size: 1
    })
  })

  const data = await response.json()
  const base64Image = data.images[0]

  // Upload to storage
  const uploadResult = await uploadImage(
    base64Image,
    companion.id,
    'companion-generated'
  )

  return uploadResult.url
}
```

**Purpose**: Generate SD image with smart outfit filtering and context-aware prompts

---

#### 4. updateCompanionContext()
```typescript
export async function updateCompanionContext(input: {
  companionId: string
  outfit?: string
  location?: string
  action?: string
}): Promise<void> {
  await prisma.companion.update({
    where: { id: input.companionId },
    data: {
      currentOutfit: input.outfit,
      currentLocation: input.location,
      currentAction: input.action
    }
  })
}
```

**Purpose**: Update companion's dynamic state

---

### Workflow Configuration

**Task Queue**: `companion-chat-queue`

**Timeouts**:
- `startToCloseTimeout`: 2 minutes (activities), 30 seconds (updates)

**Retries**:
- Max attempts: 3
- Initial interval: 1 second
- Backoff coefficient: 2.0
- Max interval: 10 seconds

---

## Image Generation

### Overview
Image generation uses **Stable Diffusion Forge API** with intelligent prompt construction, outfit filtering, and context awareness.

---

### Direct Image Generation

**File**: `src/app/image-actions.ts`

```typescript
export async function generateImage(
  companionId: string,
  prompt?: string
) {
  const user = await getAuthenticatedUser()
  await verifyCompanionOwnership(companionId, user.id)

  // Rate limit: 10 images per hour
  await checkRateLimit(`${user.id}:image`, 'image', 10, 60)

  // Fetch companion
  const companion = await prisma.companion.findUnique({
    where: { id: companionId }
  })

  // Build prompt
  const fullPrompt = prompt || [
    companion.visualDescription,
    companion.currentOutfit,
    companion.currentLocation,
    'high quality, detailed'
  ].join(', ')

  // Call SD API
  const response = await fetch(`${env.SD_API_URL}/sdapi/v1/txt2img`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: fullPrompt,
      negative_prompt: 'bad quality, ugly, deformed',
      width: 832,
      height: 1216,
      steps: 28,
      cfg_scale: 6,
      sampler_name: 'DPM++ 2M'
    })
  })

  const data = await response.json()
  const base64Image = data.images[0]

  // Upload & optimize
  const result = await uploadImage(base64Image, companionId, 'companion-generated')

  return result
}
```

**Rate Limiting**: 10 images per hour per user

---

### Image Upload & Optimization

**File**: `src/lib/storage.ts`

```typescript
export async function uploadImage(
  base64Data: string,
  companionId: string,
  type: 'companion-header' | 'companion-generated'
): Promise<UploadResult> {
  // 1. Validate base64
  if (!base64Data.startsWith('data:image/')) {
    throw new Error('Invalid image format')
  }

  // 2. Extract MIME type and buffer
  const matches = base64Data.match(/^data:image\/([a-zA-Z+]+);base64,(.*)$/)
  if (!matches) throw new Error('Invalid base64 format')

  const [, mimeType, base64Content] = matches
  const buffer = Buffer.from(base64Content, 'base64')
  const originalSize = buffer.length

  // 3. Validate size (max 5MB)
  if (originalSize > 5 * 1024 * 1024) {
    throw new Error('Image too large (max 5MB)')
  }

  // 4. Determine max dimensions
  const maxDimensions = type === 'companion-header'
    ? { width: 800, height: 800 }
    : { width: 1920, height: 1920 }

  // 5. Optimize with Sharp
  const optimizedBuffer = await sharp(buffer)
    .resize(maxDimensions.width, maxDimensions.height, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer()

  const optimizedSize = optimizedBuffer.length
  const compressionRatio = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1)

  // 6. Generate filename
  const filename = `${nanoid()}.jpg`
  const subdir = type === 'companion-header' ? 'profile' : 'generated'
  const dir = path.join(process.cwd(), 'public', 'uploads', 'companions', companionId, subdir)

  // 7. Ensure directory exists
  await fs.mkdir(dir, { recursive: true })

  // 8. Write file
  const filepath = path.join(dir, filename)
  await fs.writeFile(filepath, optimizedBuffer)

  // 9. Return public URL
  const url = `/uploads/companions/${companionId}/${subdir}/${filename}`

  return {
    url,
    path: filepath,
    filename,
    originalSize,
    optimizedSize,
    compressionRatio: parseFloat(compressionRatio)
  }
}
```

**Optimization**:
- Resize: Max 1920x1920 (generated), 800x800 (header)
- Format: JPEG with mozjpeg compression
- Quality: 85
- Result: 15-35% smaller files

---

### Storage Operations

```typescript
// Delete single image
export async function deleteImage(imageUrl: string): Promise<void> {
  const filepath = path.join(process.cwd(), 'public', imageUrl)
  await fs.unlink(filepath)
}

// Delete all companion images
export async function deleteCompanionImages(companionId: string): Promise<void> {
  const dir = path.join(process.cwd(), 'public', 'uploads', 'companions', companionId)
  await fs.rm(dir, { recursive: true, force: true })
}

// Get storage stats
export async function getStorageStats(companionId: string): Promise<{
  totalSize: number
  imageCount: number
}> {
  const dir = path.join(process.cwd(), 'public', 'uploads', 'companions', companionId)
  let totalSize = 0
  let imageCount = 0

  const files = await fs.readdir(dir, { recursive: true })
  for (const file of files) {
    const stat = await fs.stat(path.join(dir, file))
    if (stat.isFile()) {
      totalSize += stat.size
      imageCount++
    }
  }

  return { totalSize, imageCount }
}
```

---

## Rate Limiting

### Overview
Rate limiting is **database-backed** (persists across server restarts) and uses a sliding window algorithm. Five strategies protect different endpoints.

---

### Core Implementation

**File**: `src/lib/rate-limit-db.ts`

```typescript
export async function checkRateLimit(
  identifier: string, // e.g., "192.168.1.1:login" or "user-123:chat"
  action: string,      // "login", "register", "chat", "image", etc.
  maxAttempts: number, // e.g., 5
  windowMinutes: number // e.g., 15
): Promise<void> {
  const now = new Date()
  const resetAt = new Date(now.getTime() + windowMinutes * 60 * 1000)

  try {
    // Find existing rate limit record
    const existing = await prisma.rateLimit.findUnique({
      where: {
        identifier_action: {
          identifier,
          action
        }
      }
    })

    // If not found or expired, create fresh record
    if (!existing || existing.resetAt < now) {
      await prisma.rateLimit.upsert({
        where: {
          identifier_action: { identifier, action }
        },
        create: {
          identifier,
          action,
          count: 1,
          resetAt
        },
        update: {
          count: 1,
          resetAt
        }
      })
      return // Allow request
    }

    // If under limit, increment count
    if (existing.count < maxAttempts) {
      await prisma.rateLimit.update({
        where: { id: existing.id },
        data: { count: existing.count + 1 }
      })
      return // Allow request
    }

    // Over limit, throw error
    const resetIn = Math.ceil((existing.resetAt.getTime() - now.getTime()) / 1000 / 60)
    throw new Error(`Rate limit exceeded. Try again in ${resetIn} minutes.`)

  } catch (error) {
    // On DB error, fail open (allow request to prevent blocking users)
    if (error.message.includes('Rate limit exceeded')) {
      throw error
    }
    console.error('Rate limit check failed:', error)
    return
  }
}
```

---

### Rate Limit Strategies

| Action | Identifier | Max Attempts | Window | Location |
|--------|------------|--------------|--------|----------|
| Login | IP + username/email | 5 | 15 min | `lib/auth.ts` |
| Register | IP only | 3 | 24 hours | `auth-actions.ts` |
| Chat | User ID | 30 | 1 minute | `chat-actions.ts` |
| Image | User ID | 10 | 1 hour | `image-actions.ts` |
| Companion Create | User ID | 10 | 1 hour | `actions.ts` |
| Settings Update | User ID | 20 | 1 hour | `actions.ts` |

---

### IP Extraction

**File**: `src/lib/rate-limit-db.ts`

```typescript
export async function getClientIp(): Promise<string> {
  const { headers } = await import('next/headers')
  const headersList = await headers()

  // Check for proxy headers
  const forwardedFor = headersList.get('x-forwarded-for')
  const realIp = headersList.get('x-real-ip')
  const cfConnectingIp = headersList.get('cf-connecting-ip')

  if (cfConnectingIp) return cfConnectingIp
  if (realIp) return realIp
  if (forwardedFor) return forwardedFor.split(',')[0].trim()

  return 'unknown'
}
```

Supports proxies (Cloudflare, Nginx, etc.)

---

### Cleanup

```typescript
export async function cleanupExpiredRateLimits(): Promise<number> {
  const result = await prisma.rateLimit.deleteMany({
    where: {
      resetAt: {
        lt: new Date()
      }
    }
  })

  return result.count
}
```

Can be run manually or via cron job.

---

## Security

### Security Headers

**File**: `next.config.js`

```javascript
{
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()'
        },
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://image.novita.ai; connect-src 'self' https://api.novita.ai;"
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains'
        }
      ]
    }
  ]
}
```

---

### Implemented Protections

1. **Authentication**
   - NextAuth v5 with JWT
   - Bcrypt password hashing (10 rounds)
   - 30-day session expiration

2. **Authorization**
   - Ownership verification on all mutations
   - `verifyCompanionOwnership()` helper

3. **Rate Limiting**
   - IP-based (login, register)
   - User-based (chat, image, companion creation)
   - Database-backed (persistent)

4. **Input Validation**
   - Zod schemas for all user input
   - Server-side image validation (MIME, size, format)

5. **SQL Injection**
   - Protected by Prisma ORM (parameterized queries)

6. **XSS Protection**
   - Content Security Policy (CSP)
   - X-XSS-Protection header

7. **Clickjacking**
   - X-Frame-Options: SAMEORIGIN

8. **HTTPS**
   - Strict-Transport-Security (HSTS) in production

---

## API Reference

### Server Actions

#### Chat Actions (`src/app/chat-actions.ts`)

**sendMessage()**
```typescript
sendMessage(
  companionId: string,
  content: string,
  generateImage?: boolean
): Promise<{ workflowId: string, userMessageId: string }>
```
- Creates user message
- Starts Temporal workflow
- Returns immediately with workflow ID
- Rate limited: 30/min

**finalizeMessage()**
```typescript
finalizeMessage(
  workflowId: string,
  companionId: string
): Promise<void>
```
- Saves assistant message from completed workflow
- Revalidates page

---

#### Companion Actions (`src/app/actions.ts`)

**createCompanion()**
```typescript
createCompanion(data: {
  name: string
  description: string
  visualDescription: string
  userAppearance?: string
  defaultOutfit: string
  headerImageUrl?: string
}): Promise<Companion>
```
- Creates new companion
- Rate limited: 10/hour

**updateCompanion()**
```typescript
updateCompanion(
  id: string,
  data: Partial<Companion>
): Promise<Companion>
```
- Updates existing companion
- Verifies ownership

**deleteCompanion()**
```typescript
deleteCompanion(id: string): Promise<void>
```
- Deletes companion + all messages
- Deletes all companion images
- Verifies ownership

**wipeCompanionMemory()**
```typescript
wipeCompanionMemory(
  companionId: string
): Promise<void>
```
- Deletes all messages for companion
- Resets conversation history
- Rate limited: 20/hour (settings action)

---

#### Image Actions (`src/app/image-actions.ts`)

**generateImage()**
```typescript
generateImage(
  companionId: string,
  prompt?: string
): Promise<UploadResult>
```
- Generates SD image
- Uploads & optimizes
- Rate limited: 10/hour

---

#### Auth Actions (`src/app/auth-actions.ts`)

**register()**
```typescript
register(data: {
  name: string
  email: string
  username: string
  password: string
}): Promise<void>
```
- Creates new user
- Rate limited: 3/24hours (per IP)
- Redirects to login

---

### API Routes

#### POST `/api/auth/[...nextauth]`
NextAuth authentication endpoints (login, logout, session)

#### GET `/api/chat/stream/[workflowId]`
SSE streaming endpoint for workflow updates

**Response Events**:
- `progress`: `{ data: number }` (0-100)
- `token`: `{ data: string }` (streamed text)
- `complete`: `{ data: WorkflowExecution }`
- `error`: `{ data: string }`

---

## Configuration

### Environment Variables

**Required**:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/companion_hub
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
NOVITA_KEY=<your novita ai api key>
SD_API_URL=http://localhost:7860
```

**Optional** (with defaults):
```bash
TEMPORAL_ADDRESS=localhost:7233
LOG_LEVEL=debug
NODE_ENV=development
```

---

### Prisma Setup

**Generate client**:
```bash
npx prisma generate
```

**Run migrations**:
```bash
npx prisma migrate deploy
```

**Seed database** (if needed):
```bash
npx prisma db seed
```

---

### Temporal Setup

**Start Temporal server**:
```bash
temporal server start-dev
```

**Start worker**:
```bash
npm run temporal:worker
```

**Task queue**: `companion-chat-queue`

---

### Next.js Configuration

**Body size limit**: 10MB (for image uploads)

**Security headers**: Configured in `next.config.js`

**TypeScript**: Strict mode enabled

---

## Development Guide

### Project Structure

```
src/
├── app/                     # Next.js App Router
│   ├── actions.ts           # Companion CRUD
│   ├── chat-actions.ts      # Chat workflow
│   ├── auth-actions.ts      # Registration
│   ├── image-actions.ts     # Image generation
│   ├── page.tsx             # Chat interface
│   ├── layout.tsx           # Root layout
│   ├── api/                 # API routes
│   ├── companions/          # Companion pages
│   ├── gallery/             # Image gallery
│   ├── generate/            # Direct image gen
│   ├── login/               # Login page
│   ├── register/            # Registration page
│   └── settings/            # Settings page
├── components/              # React components
│   ├── ChatContainer.tsx    # Chat UI
│   ├── ChatForm.tsx         # Message input
│   ├── ChatMessages.tsx     # Message display
│   ├── companion-form.tsx   # Companion form
│   ├── companion-wizard.tsx # Creation wizard
│   └── ...
├── hooks/                   # React hooks
│   └── useWorkflowStream.ts # SSE streaming
├── lib/                     # Utilities
│   ├── auth.ts              # NextAuth config
│   ├── auth-helpers.ts      # Auth utilities
│   ├── prisma.ts            # Prisma client
│   ├── temporal.ts          # Temporal client
│   ├── storage.ts           # Image storage
│   ├── rate-limit-db.ts     # Rate limiting
│   ├── validation.ts        # Zod schemas
│   ├── logger.ts            # Pino logging
│   └── env.ts               # Env validation
├── temporal/                # Temporal workflows
│   ├── workflows.ts         # ChatWorkflow
│   └── activities.ts        # Activities
├── types/                   # TypeScript types
│   └── index.ts             # All interfaces
└── __tests__/               # Tests
    └── registration.test.ts # Registration tests
```

---

### Running Locally

1. **Install dependencies**:
```bash
npm install
```

2. **Setup database**:
```bash
npx prisma migrate deploy
npx prisma generate
```

3. **Start Temporal**:
```bash
temporal server start-dev
```

4. **Start Temporal worker**:
```bash
npm run temporal:worker
```

5. **Start Stable Diffusion** (if using local SD):
```bash
# Follow SD Forge setup instructions
```

6. **Start Next.js dev server**:
```bash
npm run dev
```

7. **Open browser**:
```
http://localhost:3000
```

---

### Testing

**Run tests**:
```bash
npm test
```

**Run tests with UI**:
```bash
npm run test:ui
```

**Test framework**: Vitest

**Existing tests**:
- `src/__tests__/registration.test.ts` (40+ test cases)

---

### Logging

**Development**: Pretty-printed with colors
```
[14:32:15.123] INFO (ChatWorkflow): Starting workflow
  companionId: "abc-123"
  userId: "user-456"
```

**Production**: JSON format for log aggregators
```json
{"level":30,"time":1673894523123,"name":"ChatWorkflow","msg":"Starting workflow","companionId":"abc-123"}
```

**Log levels**: trace, debug, info, warn, error, fatal

**Module loggers**:
- `workflowLogger` - Temporal activities
- `dbLogger` - Database operations
- `apiLogger` - API endpoints
- `authLogger` - Authentication events

---

### Common Tasks

**Add a new Server Action**:
1. Create function in appropriate `*-actions.ts` file
2. Add `"use server"` directive at top
3. Authenticate with `getAuthenticatedUser()`
4. Verify ownership if needed
5. Add rate limiting
6. Validate input with Zod
7. Perform operation
8. Revalidate path if needed

**Add a new Temporal Activity**:
1. Define function in `src/temporal/activities.ts`
2. Export it
3. Call from workflow using `executeActivity()`
4. Set timeout (default: 2 minutes)

**Add a new Component**:
1. Create in `src/components/`
2. Use TypeScript with proper types
3. Mark as `"use client"` if interactive
4. Import and use in pages

---

### Performance Tips

1. **Database queries**: Use composite indexes for common queries
2. **Image optimization**: Always use Sharp for compression
3. **Rate limiting**: Adjust limits based on usage patterns
4. **Connection pooling**: Reuse Temporal client, Prisma client
5. **Streaming**: Use SSE for real-time updates (avoids polling overhead)

---

### Troubleshooting

**Issue**: Temporal workflow not starting
- **Fix**: Check Temporal server is running (`temporal server start-dev`)
- **Fix**: Check worker is running (`npm run temporal:worker`)
- **Fix**: Check task queue matches (`companion-chat-queue`)

**Issue**: Images not generating
- **Fix**: Check SD API is running and `SD_API_URL` is correct
- **Fix**: Check rate limit (10/hour)
- **Fix**: Check logs for SD API errors

**Issue**: SSE not streaming
- **Fix**: Check workflow execution record exists in database
- **Fix**: Check workflowId matches
- **Fix**: Check browser console for SSE errors

**Issue**: Rate limit blocking legitimate users
- **Fix**: Adjust limits in rate limit calls
- **Fix**: Run `cleanupExpiredRateLimits()` to clear old records

---

## Appendix

### Database Migration Guide

**Create migration**:
```bash
npx prisma migrate dev --name migration_name
```

**Apply migration**:
```bash
npx prisma migrate deploy
```

**Reset database** (WARNING: deletes all data):
```bash
npx prisma migrate reset
```

---

### API Response Formats

**Success**:
```json
{
  "workflowId": "chat-abc123",
  "userMessageId": "msg-456"
}
```

**Error**:
```json
{
  "error": "Rate limit exceeded. Try again in 5 minutes."
}
```

---

### Supported Image Formats

**Input**: JPEG, PNG, WebP
**Output**: JPEG (mozjpeg compressed)
**Max size**: 5MB (before optimization)
**Dimensions**: 832x1216 (portrait), 800x800 (profile)

---

### Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes
4. Add tests
5. Commit (`git commit -m 'Add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open Pull Request

---

### License

MIT License - see LICENSE file for details

---

### Support

For issues, questions, or contributions:
- **GitHub Issues**: https://github.com/your-repo/companion-hub/issues
- **Discussions**: https://github.com/your-repo/companion-hub/discussions

---

**Last Updated**: 2026-01-12
**Version**: 1.0.0
