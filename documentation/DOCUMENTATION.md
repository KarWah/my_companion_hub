# My Companion Hub - Comprehensive Technical Documentation

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [Features & Functionality](#5-features--functionality)
6. [Architecture & Data Flow](#6-architecture--data-flow)
7. [External Integrations](#7-external-integrations)
8. [Configuration System](#8-configuration-system)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Temporal Workflows](#10-temporal-workflows)
11. [Type System](#11-type-system)
12. [Environment Setup](#12-environment-setup)
13. [Development Guide](#13-development-guide)
14. [Deployment](#14-deployment)
15. [API Reference](#15-api-reference)

---

## 1. Project Overview

**My Companion Hub** is a sophisticated Next.js application that enables users to create and interact with AI-powered companions. The application features persistent contextual chat, dynamic image generation, and workflow orchestration through Temporal.

### Key Features

- **AI Companions**: Create customized AI companions with unique personalities and appearances
- **Contextual Chat**: Persistent conversations with context-aware responses
- **Dynamic State Tracking**: Companions track outfit, location, and current actions
- **Image Generation**: Stable Diffusion-powered image generation with contextual prompts
- **Image Gallery**: Paginated gallery to browse and manage generated images (24 per page)
- **User Authentication**: Secure account management with NextAuth.js
- **Memory Management**: Reset companion context and wipe conversation history
- **Rate Limiting**: Database-backed rate limiting to prevent abuse and ensure fair usage
- **File Upload Validation**: Client and server-side validation for image uploads
- **Error Boundaries**: Graceful error handling with user-friendly error pages

### Primary Use Cases

1. Creating and managing AI companions with custom personalities
2. Engaging in persistent, context-aware conversations
3. Generating contextual images of companions in various settings
4. Managing and viewing generated image galleries
5. Customizing companion appearance and behavior

---

## 2. Technology Stack

### Frontend
- **Next.js 16.0.8** - React framework with App Router
- **React 19.2.1** - UI library
- **TypeScript 5.9.3** - Type-safe development
- **Tailwind CSS 3.4.1** - Utility-first styling
- **lucide-react 0.558.0** - Icon library

### Backend
- **Next.js Server Actions** - Server-side operations
- **Prisma ORM 7.1.0** - Database toolkit
- **PostgreSQL** - Primary database (via @prisma/adapter-pg 7.1.0)
- **pg 8.16.3** - PostgreSQL driver

### Authentication
- **NextAuth.js v5.0.0-beta.30** - Authentication framework
- **@auth/prisma-adapter 2.11.1** - Prisma adapter for NextAuth
- **bcryptjs 3.0.3** - Password hashing

### AI Services
- **Novita AI API** - 70B LLM (sao10k/l31-70b-euryale-v2.2)
- **Stable Diffusion Forge** - Image generation (txt2img)

### Orchestration
- **Temporal.io v1.13.2** - Workflow orchestration
  - @temporalio/activity
  - @temporalio/client
  - @temporalio/worker
  - @temporalio/workflow

### Validation & Utilities
- **Zod 4.2.0** - Schema validation
- **nanoid 3.3.7** - Unique ID generation
- **clsx 2.1.1** - Conditional class names
- **tailwind-merge 3.4.0** - Merge Tailwind classes
- **dotenv 17.2.3** - Environment variables

---

## 3. Project Structure

```
my-companion-hub/
├── prisma/
│   ├── schema.prisma              # Database models (User, Companion, Message)
│   └── seed.ts                    # Database seeding script
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── layout.tsx             # Root layout with providers
│   │   ├── page.tsx               # Main chat interface
│   │   ├── globals.css            # Global styles
│   │   ├── error.tsx              # Global error boundary
│   │   │
│   │   ├── actions.ts             # Companion CRUD server actions
│   │   ├── chat-actions.ts        # Chat & Temporal workflow actions
│   │   ├── image-actions.ts       # Image generation actions
│   │   ├── auth-actions.ts        # User registration actions
│   │   │
│   │   ├── api/
│   │   │   └── auth/[...nextauth]/route.ts  # NextAuth handler
│   │   │
│   │   ├── companions/
│   │   │   ├── page.tsx           # Companion list
│   │   │   ├── new/page.tsx       # Create companion
│   │   │   ├── [id]/edit/page.tsx # Edit companion
│   │   │   ├── loading.tsx        # Loading state
│   │   │   └── error.tsx          # Error boundary
│   │   │
│   │   ├── gallery/
│   │   │   ├── page.tsx           # Gallery overview
│   │   │   ├── [id]/page.tsx      # Companion gallery detail
│   │   │   ├── loading.tsx        # Loading state
│   │   │   └── error.tsx          # Error boundary
│   │   │
│   │   ├── generate/
│   │   │   ├── page.tsx           # Standalone image generator
│   │   │   ├── loading.tsx        # Loading state
│   │   │   └── error.tsx          # Error boundary
│   │   │
│   │   ├── login/
│   │   │   ├── page.tsx           # Login form
│   │   │   └── loading.tsx        # Loading state
│   │   │
│   │   ├── register/
│   │   │   └── page.tsx           # Registration form
│   │   │
│   │   └── settings/
│   │       ├── page.tsx           # Settings page
│   │       ├── loading.tsx        # Loading state
│   │       └── error.tsx          # Error boundary
│   │
│   ├── components/
│   │   ├── ChatForm.tsx           # Chat input with image toggle
│   │   ├── sidebar.tsx            # Navigation sidebar
│   │   ├── providers.tsx          # NextAuth SessionProvider
│   │   ├── error-boundary.tsx     # React error boundary
│   │   ├── companion-form.tsx     # Create/edit companion form
│   │   ├── delete-companion-button.tsx  # Delete with confirmation
│   │   ├── image-cropper.tsx      # Canvas-based image cropping
│   │   ├── image-gallery-grid.tsx # Gallery grid display
│   │   └── settingsList.tsx       # Settings with memory wipe
│   │
│   ├── config/
│   │   ├── generation.ts          # Image/LLM configuration
│   │   ├── clothing-keywords.ts   # Outfit layering logic
│   │   └── scene-enhancements.ts  # Location/lighting enhancements
│   │
│   ├── lib/
│   │   ├── auth.ts                # NextAuth configuration
│   │   ├── auth-helpers.ts        # Auth utility functions
│   │   ├── prisma.ts              # Prisma singleton
│   │   └── validation.ts          # Zod validation schemas
│   │
│   ├── temporal/
│   │   ├── workflows.ts           # ChatWorkflow orchestration
│   │   ├── activities.ts          # Temporal activities
│   │   └── worker.ts              # Temporal worker process
│   │
│   └── types/
│       ├── prisma.ts              # Type definitions
│       └── next-auth.d.ts         # NextAuth type extensions
│
├── .env                           # Environment variables
├── .env.example                   # Environment template
├── docker-compose.yml             # PostgreSQL & Temporal services
├── next.config.js                 # Next.js configuration
├── tailwind.config.ts             # Tailwind configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # Dependencies & scripts
└── README.md                      # Project documentation
```

---

## 4. Database Schema

### User Model

```prisma
model User {
  id              String      @id @default(uuid())
  email           String      @unique
  username        String      @unique
  name            String
  hashedPassword  String
  companions      Companion[]
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([email])
  @@index([username])
}
```

**Purpose**: Store user account information with authentication credentials.

**Fields**:
- `id`: UUID primary key
- `email`: Unique email address
- `username`: Unique username (lowercase, alphanumeric + underscore)
- `name`: Display name
- `hashedPassword`: bcrypt-hashed password (10 rounds)
- `companions`: One-to-many relationship with companions
- `createdAt`: Account creation timestamp
- `updatedAt`: Last modification timestamp

**Indexes**: email, username for fast lookups

---

### Companion Model

```prisma
model Companion {
  id                  String    @id @default(uuid())
  name                String
  description         String    @db.Text
  visualDescription   String    @db.Text
  userAppearance      String?   @db.Text
  defaultOutfit       String
  currentOutfit       String
  currentLocation     String
  currentAction       String
  avatarUrl           String?
  headerImage         String?   @db.Text
  userId              String
  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages            Message[]
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@index([userId])
}
```

**Purpose**: Store companion definitions and dynamic state.

**Fields**:
- `id`: UUID primary key
- `name`: Companion name (max 100 chars)
- `description`: Personality traits and behavior (Text, min 10 chars)
- `visualDescription`: Physical appearance for image generation (Text, min 10 chars)
- `userAppearance`: Optional description of user's appearance (Text)
- `defaultOutfit`: Initial outfit, used when resetting memory
- `currentOutfit`: Dynamic state tracking current clothing
- `currentLocation`: Dynamic state tracking current location
- `currentAction`: Dynamic state tracking current activity
- `avatarUrl`: Deprecated field (use headerImage)
- `headerImage`: Base64-encoded profile image (Text, optional)
- `userId`: Foreign key to User
- `user`: Relation to User with cascade delete
- `messages`: One-to-many relationship with messages
- `createdAt`: Creation timestamp
- `updatedAt`: Last modification timestamp

**Dynamic State**: currentOutfit, currentLocation, and currentAction are updated through conversation context analysis.

**Indexes**: userId for fast user-owned companion lookups

---

### Message Model

```prisma
model Message {
  id           String    @id @default(uuid())
  role         String
  content      String
  imageUrl     String?
  companionId  String
  companion    Companion @relation(fields: [companionId], references: [id], onDelete: Cascade)
  createdAt    DateTime  @default(now())

  @@index([companionId])
}
```

**Purpose**: Store conversation history and generated images.

**Fields**:
- `id`: UUID primary key
- `role`: Message sender ("user" | "assistant")
- `content`: Text content of message
- `imageUrl`: Generated image (base64 data URL or URL, optional)
- `companionId`: Foreign key to Companion
- `companion`: Relation to Companion with cascade delete
- `createdAt`: Message timestamp

**Indexes**: companionId for fast conversation retrieval

**Storage**: Images stored as base64 data URLs directly in database (no separate storage service)

---

## 5. Features & Functionality

### 5.1 Chat System

**Location**: `src/app/page.tsx`, `src/components/ChatForm.tsx`, `src/app/chat-actions.ts`

#### Components

**ChatForm.tsx**:
- Text input with send button
- "Generate Image" checkbox toggle
- Submits to `sendMessage` server action

**page.tsx (Main Chat Interface)**:
- Displays companion status bar (outfit, location, action)
- Message history in reverse flex layout (newest at bottom)
- User messages right-aligned (blue), AI messages left-aligned (purple)
- Images displayed inline with messages
- Auto-scroll to bottom on new messages

#### Features

1. **Real-time Chat**: Submit messages and receive AI responses
2. **Context-Aware Responses**: AI maintains conversation context
3. **Image Generation Toggle**: Optional image with each message
4. **Message History**: Limited to 30 most recent messages
5. **Companion State Display**: Shows current outfit, location, and action

#### Data Flow

1. User types message in ChatForm
2. Form submits to `sendMessage()` server action
3. Message validated with Zod schema
4. User authenticated and ownership verified
5. User message saved to database
6. Temporal workflow initiated
7. AI response generated and saved
8. Page revalidated, UI updates

**Code Location**: src/app/chat-actions.ts:17-118

---

### 5.2 Companion Management

**Location**: `src/app/actions.ts`, `src/app/companions/`, `src/components/companion-form.tsx`

#### CRUD Operations

**Create Companion** (`createCompanion`)
- **Location**: src/app/actions.ts:8-40
- **Validation**: companionSchema (Zod)
- **Fields**: name, description, visualDescription, userAppearance, defaultOutfit, headerImage
- **Behavior**: Sets currentOutfit = defaultOutfit, currentLocation = "living room", currentAction = "looking at viewer"
- **Image Support**: Base64 header image via drag-drop/paste/file upload

**Read Companions**
- `getCompanions()`: Fetch all user's companions (src/app/actions.ts:43-53)
- `getActiveCompanion()`: Fetch specific companion by ID

**Update Companion** (`updateCompanion`)
- **Location**: src/app/actions.ts:56-90
- **Behavior**: Updates all fields, resets currentOutfit to defaultOutfit
- **Validation**: companionSchema (Zod)

**Delete Companion** (`deleteCompanion`)
- **Location**: src/app/actions.ts:93-109
- **Behavior**: Cascade deletes all messages
- **Confirmation**: UI-level confirmation in delete-companion-button.tsx

#### Features

1. **Header Image**:
   - Upload via file picker
   - Drag-and-drop support
   - Paste from clipboard
   - Canvas-based cropping to 512x512 (image-cropper.tsx)
   - Stored as base64 data URL

2. **Form Validation**:
   - Name: 1-100 characters
   - Description: min 10 characters
   - Visual Description: min 10 characters
   - Default Outfit: min 1 character
   - User Appearance: optional

3. **Companion Cards**:
   - Header image preview
   - Name and description
   - Quick actions: Chat, Edit, Delete buttons
   - Location: src/app/companions/page.tsx

**Code Locations**:
- Form Component: src/components/companion-form.tsx
- Server Actions: src/app/actions.ts
- Companion List: src/app/companions/page.tsx
- Create Page: src/app/companions/new/page.tsx
- Edit Page: src/app/companions/[id]/edit/page.tsx

---

### 5.3 Image Generation

**Location**: `src/app/image-actions.ts`, `src/app/generate/page.tsx`, `src/temporal/activities.ts`

#### Standalone Generator

**Location**: src/app/generate/page.tsx

**Features**:
- Full control over Stable Diffusion parameters
- Prompt and negative prompt text areas
- Dimension selector (512x512 to 1024x1024)
- Steps slider (1-50, default 28)
- CFG Scale slider (1-20, default 6.0)
- Seed input (-1 for random)
- Sampler dropdown (11 options: DPM++, Euler, DDIM, etc.)
- Real-time preview with loading spinner
- Download and copy to clipboard buttons

**Server Action**: `generateStandaloneImage()` (src/app/image-actions.ts:7-54)

#### Contextual Generation (In-Chat)

**Trigger**: User checks "Generate Image" in ChatForm

**Process**:
1. User message triggers Temporal workflow with `shouldGenerateImage: true`
2. Context analysis extracts visual tags, expression, lighting
3. Automatic prompt construction from companion state
4. Smart outfit layering (removes hidden underwear)
5. Location enhancements applied
6. Image generated via Stable Diffusion
7. Returned as base64 and stored with message

**Prompt Construction**:
```
[Quality Tags] + [LoRA Weight] + [Character Tags] + [Composition Tags] +
[Visual Tags] + [Expression] + [Location] + [Enhancements] +
[Lighting] + [User Appearance Tags (if present)] + [Outfit] + [Visual Description]
```

**Example**:
```
(masterpiece, best quality:1.2), absurdres, highres, cinematic light,
uncensored, <lora:[inukai mofu]:0.4>, 1girl, solo, looking at viewer,
standing, bedroom, soft lighting, warm tones, intimate, cozy,
red hair, green eyes, wearing black jeans and white t-shirt
```

**Code Locations**:
- Standalone: src/app/image-actions.ts:7-54
- Contextual: src/temporal/activities.ts:92-174
- Prompt Building: src/temporal/activities.ts:114-142
- Outfit Filtering: src/config/clothing-keywords.ts:96-149

#### Smart Outfit Layering

**Purpose**: Prevent illogical underwear visibility in images

**Logic**:
- Detects explicit content keywords (naked, nude, etc.)
- Detects virtual contexts (selfie, video call)
- Categorizes clothing: upper/lower outerwear, underwear, exposed tops, full coverage
- Hides underwear when covered by outer layers
- Preserves underwear in explicit or virtual contexts

**Code Location**: src/config/clothing-keywords.ts

#### Scene Enhancements

**Purpose**: Add environmental context to image prompts

**Enhancements**:
- **Locations**: bedroom, living room, kitchen, bathroom, gym, office, park, beach, street, car, shower, pool, hot tub
- **Actions**: selfie, portrait, sitting, lying, stretching, bending, etc.

**Example** (bedroom):
```
soft lighting, warm tones, intimate, cozy, bed, pillows, sheets
```

**Code Location**: src/config/scene-enhancements.ts

---

### 5.4 Gallery System

**Location**: `src/app/gallery/`, `src/components/image-gallery-grid.tsx`

#### Gallery Overview

**Location**: src/app/gallery/page.tsx

**Features**:
- Lists all companions with image counts
- Aggregated query to count messages with images
- Click companion card to view gallery

**Query Optimization**:
```typescript
const companionsWithCounts = await prisma.companion.findMany({
    where: { userId: user.id },
    include: {
        _count: {
            select: {
                messages: { where: { imageUrl: { not: null } } }
            }
        }
    }
});
```

#### Individual Gallery

**Location**: src/app/gallery/[id]/page.tsx

**Features**:
- Grid layout of all generated images for companion
- Hover to reveal download button
- Date/time display for each image
- Message context preview
- Ordered by most recent first

**Query**:
```typescript
const messagesWithImages = await prisma.message.findMany({
    where: { companionId: companion.id, imageUrl: { not: null } },
    orderBy: { createdAt: "desc" }
});
```

**Code Locations**:
- Gallery Overview: src/app/gallery/page.tsx
- Individual Gallery: src/app/gallery/[id]/page.tsx
- Grid Component: src/components/image-gallery-grid.tsx

---

### 5.5 Settings & Memory Management

**Location**: `src/app/settings/page.tsx`, `src/components/settingsList.tsx`

#### Features

1. **RAG (Memory) Toggle**: UI-only, not implemented
2. **DeepThink Logic Toggle**: UI-only, not implemented
3. **Danger Zone - Wipe Companion Memory**:
   - Deletes all messages for companion
   - Resets currentOutfit to defaultOutfit
   - Resets currentLocation to "living room"
   - Resets currentAction to "looking at viewer"
   - Confirmation dialog before deletion

**Server Action**: `wipeCompanionMemory()` (src/app/actions.ts:112-133)

**Code Locations**:
- Settings Page: src/app/settings/page.tsx
- Settings List Component: src/components/settingsList.tsx
- Wipe Action: src/app/actions.ts:112-133

---

## 6. Architecture & Data Flow

### 6.1 Request Flow: Chat Message with Image

```
1. User Types Message in ChatForm.tsx
   ↓
2. Form Submission (sendMessage server action)
   ├─ Input: message (string), companionId (UUID), generateImage (boolean)
   ↓
3. Zod Validation (messageSchema)
   ├─ message: 1-2000 chars
   ├─ companionId: valid UUID
   └─ generateImage: optional boolean
   ↓
4. Auth Check (getAuthenticatedUser)
   ├─ Retrieves session via NextAuth
   └─ Throws if not authenticated
   ↓
5. Ownership Verification (verifyCompanionOwnership)
   ├─ Fetches companion from database
   ├─ Verifies user owns companion
   └─ Throws if not owner
   ↓
6. Save User Message to DB
   ├─ prisma.message.create()
   ├─ role: "user"
   └─ content: message text
   ↓
7. Fetch Message History (30 recent)
   ├─ prisma.message.findMany()
   ├─ where: { companionId }
   ├─ orderBy: { createdAt: "desc" }
   └─ take: 30
   ↓
8. Fetch Companion Data
   ├─ prisma.companion.findUnique()
   └─ Includes: name, description, visualDescription, state fields
   ↓
9. Start Temporal Workflow (ChatWorkflow)
   ├─ Task Queue: 'companion-chat-queue'
   ├─ Workflow ID: `chat-${companionId}-${nanoid()}`
   ├─ Input:
   │   ├─ companionId
   │   ├─ companionName
   │   ├─ userMessage
   │   ├─ userName
   │   ├─ currentOutfit
   │   ├─ currentLocation
   │   ├─ currentAction
   │   ├─ msgHistory (30 messages)
   │   └─ shouldGenerateImage
   ↓
10. Workflow Executes:
    ├─ STEP 1: analyzeContext(userMessage) - Initial context analysis
    │   └─ Returns: outfit, location, action, visualTags, expression, lighting
    │
    ├─ STEP 2: generateLLMResponse() - Generate companion reply
    │   └─ Returns: text response (1-3 sentences)
    │
    ├─ STEP 3: analyzeContext(userMessage + response) - Re-analyze with response
    │   └─ Detects state changes from companion's described actions
    │
    ├─ STEP 4: updateCompanionContext() (conditional)
    │   └─ Only if state changed from initial analysis
    │
    ├─ STEP 5: generateCompanionImage() (conditional)
    │   └─ Only if shouldGenerateImage = true
    │
    └─ Return: { text, imageUrl, updatedState }
    ↓
11. Save Assistant Message with Image URL
    ├─ prisma.message.create()
    ├─ role: "assistant"
    ├─ content: workflow.text
    └─ imageUrl: workflow.imageUrl (if generated)
    ↓
12. Revalidate Path and Return Success
    ├─ revalidatePath("/")
    └─ return { success: true }
    ↓
13. UI Updates with New Messages
    └─ Page re-renders with new messages and images
```

**Code Location**: src/app/chat-actions.ts:17-118

---

### 6.2 Temporal Workflow Architecture

**Location**: `src/temporal/workflows.ts` & `src/temporal/activities.ts`

#### ChatWorkflow Process

**Workflow Definition**: src/temporal/workflows.ts:29-105

**Steps**:

1. **Analyze Initial Context**
   - **Activity**: `analyzeContext()`
   - **Input**: User message
   - **Output**: outfit, location, action, visualTags, expression, lighting, isUserPresent
   - **Purpose**: Extract context from user's message

2. **Generate LLM Response**
   - **Activity**: `generateLLMResponse()`
   - **Input**: companionId, companionName, userMessage, userName, context, history
   - **Output**: AI response text (1-3 sentences)
   - **Purpose**: Generate companion's reply

3. **Analyze Final Context**
   - **Activity**: `analyzeContext()`
   - **Input**: User message + companion response
   - **Output**: Updated context (may include state changes)
   - **Purpose**: Re-analyze including companion's described actions

4. **Update Context (Conditional)**
   - **Activity**: `updateCompanionContext()`
   - **Condition**: Only if state changed from initial analysis
   - **Input**: companionId, newOutfit, newLocation, newAction
   - **Output**: Updated companion record
   - **Purpose**: Persist state changes to database

5. **Generate Image (Conditional)**
   - **Activity**: `generateCompanionImage()`
   - **Condition**: Only if shouldGenerateImage = true
   - **Input**: companion data, context, user appearance
   - **Output**: Base64-encoded PNG image
   - **Purpose**: Generate contextual image of companion

#### Activities (4 Total)

**1. analyzeContext()**
- **Location**: src/temporal/activities.ts:229-303
- **Purpose**: LLM-based context extraction
- **Input**: Message text
- **Output**: JSON with outfit, location, action, visual_tags, expression, lighting, is_user_present
- **LLM Config**: Temperature 0.2 (deterministic), max tokens 600
- **Fallback**: Returns previous state if JSON parsing fails

**2. generateLLMResponse()**
- **Location**: src/temporal/activities.ts:306-384
- **Purpose**: Generate character response
- **Input**: companion data, user message, context, history
- **Output**: Text response (1-3 sentences)
- **LLM Config**: Temperature 0.85 (creative), max tokens 150
- **System Prompt**: Includes companion personality, current context, visual description

**3. generateCompanionImage()**
- **Location**: src/temporal/activities.ts:92-174
- **Purpose**: Generate image via Stable Diffusion
- **Input**: companion data, context analysis
- **Output**: Base64-encoded PNG
- **Process**:
  1. Build prompt from context
  2. Apply outfit filtering (hide hidden underwear)
  3. Apply scene enhancements
  4. Send to Stable Diffusion API
  5. Return base64 image

**4. updateCompanionContext()**
- **Location**: src/temporal/activities.ts:177-192
- **Purpose**: Update companion state in database
- **Input**: companionId, newOutfit, newLocation, newAction
- **Output**: Updated companion record
- **Database**: prisma.companion.update()

#### Worker Configuration

**Location**: src/temporal/worker.ts

**Configuration**:
```typescript
Task Queue: 'companion-chat-queue'
Workflows Path: 'src/temporal/workflows.ts'
Activities: All from 'src/temporal/activities.ts'
Connection: localhost:7233 (default Temporal server)
```

**Start Worker**:
```bash
npm run worker
```

---

### 6.3 Component Hierarchy

```
app/layout.tsx (Root)
├─ Providers (NextAuth SessionProvider)
└─ Body
    ├─ Sidebar (Navigation)
    │   ├─ MessageSquare → Chat (/)
    │   ├─ Users → Companions (/companions)
    │   ├─ Image → Gallery (/gallery)
    │   ├─ Sparkles → Generate (/generate)
    │   ├─ Settings → Settings (/settings)
    │   └─ LogOut → Sign Out
    │
    └─ Main Content
        ├─ app/page.tsx (Chat)
        │   ├─ Companion Status Bar
        │   ├─ Message List
        │   │   ├─ User Messages (right-aligned)
        │   │   └─ AI Messages (left-aligned, with images)
        │   └─ ChatForm
        │       ├─ Textarea Input
        │       ├─ Image Checkbox
        │       └─ Send Button
        │
        ├─ app/companions/page.tsx (Companion List)
        │   └─ Companion Cards
        │       ├─ Header Image
        │       ├─ Name/Description
        │       └─ Action Buttons (Chat, Edit, Delete)
        │
        ├─ app/companions/new/page.tsx (Create)
        │   └─ CompanionForm
        │       ├─ Name Input
        │       ├─ Description Textarea
        │       ├─ Visual Description Textarea
        │       ├─ User Appearance Textarea
        │       ├─ Default Outfit Input
        │       ├─ Header Image Upload
        │       │   ├─ ImageCropper (modal)
        │       │   └─ Preview
        │       └─ Submit Button
        │
        ├─ app/gallery/page.tsx (Gallery Overview)
        │   └─ Companion Cards with Image Counts
        │
        ├─ app/gallery/[id]/page.tsx (Individual Gallery)
        │   └─ ImageGalleryGrid
        │       └─ Image Cards (with download, date, context)
        │
        ├─ app/generate/page.tsx (Standalone Generator)
        │   ├─ Prompt Textarea
        │   ├─ Negative Prompt Textarea
        │   ├─ Parameter Controls
        │   ├─ Generate Button
        │   └─ Image Preview (with download/copy)
        │
        └─ app/settings/page.tsx (Settings)
            └─ SettingsList
                ├─ Companion Selector
                ├─ RAG Toggle (UI-only)
                ├─ DeepThink Toggle (UI-only)
                └─ Wipe Memory Button (Danger Zone)
```

---

## 7. External Integrations

### 7.1 Novita AI API

**Purpose**: Large Language Model (LLM) for chat and context analysis

**Endpoint**: `https://api.novita.ai/v3/openai/chat/completions`

**Model**: `sao10k/l31-70b-euryale-v2.2` (70B parameter LLM)

**Authentication**: Bearer token via `NOVITA_KEY` environment variable

#### Use Case 1: Chat/Response Generation

**Function**: `generateLLMResponse()` (src/temporal/activities.ts:306-384)

**Configuration**:
```typescript
{
  model: "sao10k/l31-70b-euryale-v2.2",
  messages: [
    { role: "system", content: "<personality + context>" },
    { role: "user", content: "<message history>" },
    { role: "user", content: "<current message>" }
  ],
  temperature: 0.85,      // Creative but focused
  max_tokens: 150,        // Enforces 1-3 sentence responses
  top_p: 0.95,
  repetition_penalty: 1.1
}
```

**Response**:
```typescript
{
  choices: [{
    message: {
      content: "AI response text"
    }
  }]
}
```

#### Use Case 2: Context Analysis

**Function**: `analyzeContext()` (src/temporal/activities.ts:229-303)

**Configuration**:
```typescript
{
  model: "sao10k/l31-70b-euryale-v2.2",
  messages: [
    { role: "system", content: "<analysis prompt>" },
    { role: "user", content: "<conversation text>" }
  ],
  temperature: 0.2,       // Deterministic analysis
  max_tokens: 600
}
```

**Expected Response** (JSON):
```json
{
  "outfit": "black jeans and white t-shirt",
  "location": "bedroom",
  "action_summary": "lying on bed, looking at phone",
  "is_user_present": true,
  "visual_tags": ["lying", "relaxed", "phone"],
  "expression": "neutral",
  "lighting": "soft lighting"
}
```

**Fallback**: If JSON parsing fails, returns previous state

---

### 7.2 Stable Diffusion Forge API

**Purpose**: Text-to-image generation

**Endpoint**: `${SD_API_URL}/sdapi/v1/txt2img`

**Authentication**: None (direct HTTP POST)

**Configuration**: `IMAGE_GENERATION_DEFAULTS` (src/config/generation.ts:7-33)

#### Parameters

```typescript
{
  prompt: string,              // Positive prompt
  negative_prompt: string,     // Negative prompt
  width: 832,                  // Default width
  height: 1216,                // Default height (portrait)
  steps: 28,                   // Sampling steps
  cfg_scale: 6.0,              // Classifier-free guidance scale
  seed: -1,                    // Random seed (-1 = random)
  sampler_name: "DPM++ 2M",    // Sampling method
  scheduler: "karras"          // Noise scheduler
}
```

#### Available Samplers

```typescript
[
  "DPM++ 2M",          // Default - fast, high quality
  "DPM++ 2M Karras",   // With Karras noise schedule
  "DPM++ SDE",
  "DPM++ SDE Karras",
  "Euler",             // Simple, fast
  "Euler a",           // Ancestral sampling
  "Heun",
  "DDIM",              // Denoising diffusion
  "PLMS",
  "UniPC",
  "LCM"                // Latent consistency model
]
```

#### Response

```typescript
{
  images: [
    "base64_encoded_png_data"  // Single image
  ]
}
```

**Processing**: Base64 data converted to data URL (`data:image/png;base64,<data>`)

**Code Locations**:
- Standalone: src/app/image-actions.ts:7-54
- Contextual: src/temporal/activities.ts:92-174
- Config: src/config/generation.ts

---

### 7.3 Temporal.io Server

**Purpose**: Workflow orchestration and durable execution

**Connection**: `localhost:7233` (gRPC endpoint)

**UI**: `http://localhost:8233` (Web UI)

**Services**:
- Workflow execution
- Activity scheduling
- State persistence
- Failure handling with automatic retries
- Timeout management

#### Configuration

**Worker** (src/temporal/worker.ts):
```typescript
{
  connection: await NativeConnection.connect({ address: "localhost:7233" }),
  namespace: "default",
  taskQueue: "companion-chat-queue",
  workflowsPath: path.resolve(__dirname, "./workflows"),
  activities: {
    analyzeContext,
    generateLLMResponse,
    generateCompanionImage,
    updateCompanionContext
  }
}
```

**Client** (src/app/chat-actions.ts:28-32):
```typescript
const client = new Client({ connection: await Connection.connect() });
```

#### Workflow Timeouts

**Execution Timeout**: 2 minutes (src/temporal/workflows.ts:93)
```typescript
await startToCloseTimeout('2 minutes', () =>
  proxyActivities<typeof activities>({ ... })
);
```

#### Docker Compose Setup

```yaml
temporal:
  image: temporalio/admin-tools:latest
  ports:
    - "7233:7233"  # gRPC
    - "8233:8233"  # Web UI
  command: temporal server start-dev
```

**Start Services**:
```bash
docker-compose up -d
```

---

## 8. Configuration System

### 8.1 Image Generation Configuration

**Location**: `src/config/generation.ts`

#### Default Parameters

```typescript
export const IMAGE_GENERATION_DEFAULTS = {
  dimensions: { width: 832, height: 1216 },  // Portrait aspect
  steps: 28,                                  // Sampling steps
  sampler: "DPM++ 2M" as const,              // Sampling method
  scheduler: "karras" as const,              // Noise scheduler
  cfgScale: 6,                               // Guidance scale
  seed: -1,                                  // Random seed

  lora: {
    name: "[inukai mofu] Artist Style Illustrious_2376885",
    weight: 0.4
  },

  qualityTags: {
    positive: "(masterpiece, best quality:1.2), absurdres, highres, cinematic light, uncensored",
    negative: "(bad quality:1.15), (worst quality:1.3), neghands, monochrome, 3d, long neck, ..."
  }
};
```

#### Default Companion State

```typescript
export const DEFAULT_COMPANION_STATE = {
  outfit: "casual clothes",
  location: "living room",
  action: "looking at viewer",
  lighting: "cinematic lighting",
  expression: "neutral"
};
```

#### LLM Configuration

```typescript
export const LLM_CHAT_CONFIG = {
  temperature: 0.85,      // Creative chat responses
  max_tokens: 150,        // 1-3 sentence limit
  top_p: 0.95,
  repetition_penalty: 1.1
};

export const LLM_MODEL = "sao10k/l31-70b-euryale-v2.2" as const;

export const CONTEXT_ANALYSIS_CONFIG = {
  temperature: 0.2,       // Deterministic analysis
  max_tokens: 600,
  historyLimit: 8         // Use last 8 messages for context
};
```

---

### 8.2 Clothing Keywords

**Location**: `src/config/clothing-keywords.ts`

**Purpose**: Smart outfit layering logic for realistic image generation

#### Keyword Categories

**1. Explicit Content** (always show underwear):
```typescript
["naked", "nude", "topless", "bottomless", "spreading", ...]
```

**2. Virtual Context** (always show underwear):
```typescript
["selfie", "video call", "webcam", "phone camera", "mirror pic", ...]
```

**3. Clothing Categories**:

```typescript
// Upper Outerwear (hides upper underwear)
["hoodie", "jacket", "sweater", "coat", "blazer", ...]

// Lower Outerwear (hides lower underwear)
["pants", "jeans", "skirt", "shorts", "leggings", ...]

// Upper Underwear (hidden by upper outerwear)
["bra", "sports bra", "bikini top", ...]

// Lower Underwear (hidden by lower outerwear)
["thong", "panties", "underwear", "bikini bottom", ...]

// Exposed Tops (may show upper underwear)
["tank top", "crop top", "camisole", ...]

// Full Coverage (hides all underwear)
["dress", "jumpsuit", "romper", "bodysuit", ...]
```

#### Smart Filtering Function

```typescript
export function filterOutfitForImageGeneration(
  outfit: string
): string
```

**Logic**:
1. Check for explicit content → preserve all
2. Check for virtual context → preserve all
3. Check for full coverage → remove all underwear
4. Check for upper outerwear → remove upper underwear
5. Check for lower outerwear → remove lower underwear
6. Return filtered outfit string

**Example**:
```
Input:  "black jeans, white t-shirt, red bra"
Output: "black jeans, white t-shirt"
Reason: T-shirt and jeans hide bra
```

---

### 8.3 Scene Enhancements

**Location**: `src/config/scene-enhancements.ts`

**Purpose**: Add environmental context to image prompts

#### Location Enhancements

```typescript
export const LOCATION_ENHANCEMENTS: Record<string, string> = {
  bedroom: "soft lighting, warm tones, intimate, cozy, bed, pillows, sheets",
  "living room": "natural light, ambient, comfortable, casual, couch, sofa",
  kitchen: "bright, clean lighting, modern, clean, counter",
  bathroom: "bright, fluorescent, clean, modern, mirror, tiles",
  gym: "bright, high contrast, energetic, athletic, weights, equipment, mat",
  office: "neutral lighting, professional, clean, desk, chair, computer",
  park: "natural sunlight, outdoors, peaceful, nature, trees, grass, bench",
  beach: "bright sunlight, golden hour, relaxed, tropical, sand, ocean, waves",
  street: "natural daylight, urban, city, buildings, sidewalk",
  car: "car interior lighting, confined, intimate, car seat, dashboard, interior",
  shower: "wet, steam, water drops, intimate, wet, shower, water, steam, tiles",
  pool: "bright, reflective water, wet, summery, pool, water, wet",
  "hot tub": "dim, steam, mood lighting, intimate, relaxed, hot tub, water, steam"
};
```

#### Action Enhancements

```typescript
export const ACTION_ENHANCEMENTS: Record<string, string> = {
  selfie: "selfie, from above, phone visible, casual angle",
  portrait: "portrait, facing camera, upper body",
  sitting: "sitting, relaxed pose",
  lying: "lying down, reclined",
  stretching: "stretching, dynamic pose",
  bending: "bending over, dynamic pose",
  // ... more actions
};
```

**Usage** (in generateCompanionImage):
```typescript
const locationEnhancement = LOCATION_ENHANCEMENTS[context.location.toLowerCase()] || "";
const actionEnhancement = ACTION_ENHANCEMENTS[context.action.toLowerCase()] || "";

const prompt = `${basePrompt}, ${locationEnhancement}, ${actionEnhancement}`;
```

---

## 9. Authentication & Authorization

### 9.1 NextAuth Configuration

**Location**: `src/lib/auth.ts`

**Version**: NextAuth.js v5.0.0-beta.30

#### Configuration

```typescript
export const authConfig = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // 1. Find user by email or username (case-insensitive)
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: credentials.email?.toLowerCase() },
              { username: credentials.email?.toLowerCase() }
            ]
          }
        });

        // 2. Verify password with bcrypt
        const isValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        // 3. Return user if valid
        if (isValid) return user;
        return null;
      }
    })
  ],

  session: {
    strategy: "jwt",       // JWT-based sessions
    maxAge: 30 * 24 * 60 * 60  // 30 days
  },

  callbacks: {
    async jwt({ token, user }) {
      // Add user ID and username to JWT
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
      }
      return token;
    },

    async session({ session, token }) {
      // Add user ID and username to session
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
      }
      return session;
    }
  }
};
```

---

### 9.2 Authentication Helpers

**Location**: `src/lib/auth-helpers.ts`

#### getAuthenticatedUser()

**Purpose**: Retrieve current user from session

```typescript
export async function getAuthenticatedUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  if (!user) throw new Error("User not found");

  return user;
}
```

**Usage**:
```typescript
const user = await getAuthenticatedUser();
// Throws if not logged in
```

#### verifyCompanionOwnership()

**Purpose**: Fetch companion and verify ownership

```typescript
export async function verifyCompanionOwnership(
  companionId: string,
  userId: string
) {
  const companion = await prisma.companion.findUnique({
    where: { id: companionId }
  });

  if (!companion) {
    throw new Error("Companion not found");
  }

  if (companion.userId !== userId) {
    throw new Error("Unauthorized");
  }

  return companion;
}
```

**Usage**:
```typescript
const user = await getAuthenticatedUser();
const companion = await verifyCompanionOwnership(companionId, user.id);
// Throws if user doesn't own companion
```

---

### 9.3 User Registration

**Location**: `src/app/auth-actions.ts`

#### registerUser Server Action

```typescript
export async function registerUser(formData: FormData) {
  // 1. Validate input with Zod
  const validated = registrationSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password")
  });

  // 2. Check for existing email
  const existingEmail = await prisma.user.findUnique({
    where: { email: validated.email.toLowerCase() }
  });
  if (existingEmail) {
    return { success: false, error: "Email already in use" };
  }

  // 3. Check for existing username
  const existingUsername = await prisma.user.findUnique({
    where: { username: validated.username.toLowerCase() }
  });
  if (existingUsername) {
    return { success: false, error: "Username already taken" };
  }

  // 4. Hash password (bcrypt, 10 rounds)
  const hashedPassword = await bcrypt.hash(validated.password, 10);

  // 5. Create user
  await prisma.user.create({
    data: {
      name: validated.name,
      email: validated.email.toLowerCase(),
      username: validated.username.toLowerCase(),
      hashedPassword
    }
  });

  return { success: true };
}
```

**Validation Schema** (src/lib/validation.ts:27-35):
```typescript
export const registrationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
});
```

---

### 9.4 Login/Logout Flow

#### Login

**Location**: src/app/login/page.tsx

**Process**:
1. User submits credentials form
2. Form POSTs to `/api/auth/callback/credentials`
3. NextAuth calls `authorize()` function
4. User lookup by email/username (case-insensitive)
5. Password verified with bcrypt
6. JWT session created on success
7. Redirect to home page

#### Logout

**Component**: Sidebar (src/components/sidebar.tsx:56-63)

**Process**:
```typescript
<button
  onClick={async () => {
    await signOut({ redirectTo: "/login" });
  }}
>
  <LogOut className="w-5 h-5" />
  <span>Sign Out</span>
</button>
```

---

## 10. Temporal Workflows

### 10.1 ChatWorkflow

**Location**: `src/temporal/workflows.ts:29-105`

**Purpose**: Orchestrate multi-step AI conversation processing

#### Input Arguments

```typescript
interface ChatWorkflowArgs {
  companionId: string;
  companionName: string;
  userMessage: string;
  userName: string;
  currentOutfit: string;
  currentLocation: string;
  currentAction: string;
  msgHistory: MessageHistory[];
  shouldGenerateImage: boolean;
}
```

#### Execution Steps

**STEP 1: Analyze Initial Context**
```typescript
const initialContext = await activities.analyzeContext(
  userMessage
);
```

**STEP 2: Generate LLM Response**
```typescript
const llmResponse = await activities.generateLLMResponse(
  companionId,
  companionName,
  userMessage,
  userName,
  currentOutfit,
  currentLocation,
  currentAction,
  msgHistory
);
```

**STEP 3: Analyze Final Context**
```typescript
const finalContext = await activities.analyzeContext(
  `${userMessage}\n\n${llmResponse}`
);
```

**STEP 4: Update Context (Conditional)**
```typescript
if (
  finalContext.outfit !== currentOutfit ||
  finalContext.location !== currentLocation ||
  finalContext.action_summary !== currentAction
) {
  await activities.updateCompanionContext(
    companionId,
    finalContext.outfit,
    finalContext.location,
    finalContext.action_summary
  );
}
```

**STEP 5: Generate Image (Conditional)**
```typescript
let imageUrl: string | null = null;

if (shouldGenerateImage) {
  imageUrl = await activities.generateCompanionImage(
    companionId,
    visualDescription,
    userAppearance,
    finalContext
  );
}
```

#### Return Value

```typescript
interface WorkflowResult {
  text: string;           // AI response text
  imageUrl: string | null;  // Generated image (if requested)
  updatedState: {
    outfit: string;
    location: string;
    action: string;
  };
}
```

---

### 10.2 Activity Reference

#### analyzeContext()

**Location**: src/temporal/activities.ts:229-303

**Signature**:
```typescript
export async function analyzeContext(
  messageText: string
): Promise<LLMAnalysisResponse>
```

**Input**: Conversation text (user message or user message + AI response)

**Output**:
```typescript
interface LLMAnalysisResponse {
  outfit: string;
  location: string;
  action_summary: string;
  visual_tags: string[];
  is_user_present: boolean;
  expression: string;
  lighting: string;
}
```

**Process**:
1. Call Novita AI API with analysis prompt
2. Extract JSON from LLM response
3. Parse and validate JSON structure
4. Return structured context data
5. On failure: return default state with previous values

**LLM Prompt** (abbreviated):
```
Analyze this conversation and extract:
1. Outfit description
2. Location
3. Action summary
4. Visual tags
5. User presence (true/false)
6. Expression
7. Lighting

Respond ONLY with JSON:
{ "outfit": "...", "location": "...", ... }
```

---

#### generateLLMResponse()

**Location**: src/temporal/activities.ts:306-384

**Signature**:
```typescript
export async function generateLLMResponse(
  companionId: string,
  companionName: string,
  userMessage: string,
  userName: string,
  currentOutfit: string,
  currentLocation: string,
  currentAction: string,
  msgHistory: MessageHistory[]
): Promise<string>
```

**Input**: Companion data, user message, context, history

**Output**: Text response (1-3 sentences)

**Process**:
1. Fetch companion from database
2. Build system prompt with personality + context
3. Format message history
4. Call Novita AI API
5. Return AI response text

**System Prompt Structure**:
```
You are [COMPANION_NAME].
[PERSONALITY_DESCRIPTION]

CURRENT CONTEXT:
- Location: [LOCATION]
- Action: [ACTION]
- Outfit: [OUTFIT]
[USER_APPEARANCE_NOTE]

VISUAL APPEARANCE:
[VISUAL_DESCRIPTION]

IMPORTANT:
- Keep responses to 1-3 sentences
- Stay in character
- Consider current context
- Be specific about actions/outfit changes
```

---

#### generateCompanionImage()

**Location**: src/temporal/activities.ts:92-174

**Signature**:
```typescript
export async function generateCompanionImage(
  companionId: string,
  visualDescription: string,
  userAppearance: string | null,
  context: LLMAnalysisResponse
): Promise<string>
```

**Input**: Companion visual description, user appearance (optional), context

**Output**: Base64 data URL (`data:image/png;base64,...`)

**Process**:
1. Build base prompt with quality tags + LoRA
2. Determine character tags (1girl/solo or 1girl, 1boy)
3. Add composition tags
4. Add visual tags from context
5. Add expression and location
6. Apply location enhancements
7. Apply action enhancements
8. Add lighting
9. Add user appearance tags (if present)
10. Filter outfit (remove hidden underwear)
11. Add filtered outfit + visual description
12. Call Stable Diffusion API
13. Return base64 image

**Prompt Construction Example**:
```
(masterpiece, best quality:1.2), absurdres, highres, cinematic light, uncensored,
<lora:[inukai mofu]:0.4>,
1girl, solo,
looking at viewer,
standing,
smiling,
bedroom, soft lighting, warm tones, intimate, cozy, bed, pillows, sheets,
cinematic lighting,
red hair, green eyes,
black jeans, white t-shirt
```

---

#### updateCompanionContext()

**Location**: src/temporal/activities.ts:177-192

**Signature**:
```typescript
export async function updateCompanionContext(
  companionId: string,
  newOutfit: string,
  newLocation: string,
  newAction: string
): Promise<void>
```

**Input**: Companion ID, new state values

**Output**: None (void)

**Process**:
```typescript
await prisma.companion.update({
  where: { id: companionId },
  data: {
    currentOutfit: newOutfit,
    currentLocation: newLocation,
    currentAction: newAction
  }
});
```

---

### 10.3 Worker Setup

**Location**: `src/temporal/worker.ts`

**Purpose**: Run Temporal worker process to execute workflows and activities

**Code**:
```typescript
import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities";
import path from "path";

async function run() {
  const connection = await NativeConnection.connect({
    address: "localhost:7233"
  });

  const worker = await Worker.create({
    connection,
    namespace: "default",
    taskQueue: "companion-chat-queue",
    workflowsPath: path.resolve(__dirname, "./workflows"),
    activities
  });

  console.log("Temporal worker started on task queue: companion-chat-queue");
  await worker.run();
}

run().catch((err) => {
  console.error("Worker error:", err);
  process.exit(1);
});
```

**Start Worker**:
```bash
npm run worker
```

**Logs**: Worker logs workflow executions and activity calls to console

---

## 11. Type System

### 11.1 Core Types

**Location**: `src/types/prisma.ts`

#### User Type

```typescript
export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  hashedPassword: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Companion Type

```typescript
export interface Companion {
  id: string;
  name: string;
  description: string;
  visualDescription: string;
  userAppearance: string | null;
  defaultOutfit: string;
  currentOutfit: string;
  currentLocation: string;
  currentAction: string;
  avatarUrl: string | null;
  headerImage: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Message Type

```typescript
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl: string | null;
  companionId: string;
  createdAt: Date;
}
```

---

### 11.2 Workflow Types

**Location**: `src/temporal/workflows.ts`, `src/temporal/activities.ts`

#### ChatWorkflowArgs

```typescript
export interface ChatWorkflowArgs {
  companionId: string;
  companionName: string;
  userMessage: string;
  userName: string;
  currentOutfit: string;
  currentLocation: string;
  currentAction: string;
  msgHistory: MessageHistory[];
  shouldGenerateImage: boolean;
}
```

#### MessageHistory

```typescript
export interface MessageHistory {
  role: "user" | "assistant";
  content: string;
}
```

#### LLMAnalysisResponse

```typescript
interface LLMAnalysisResponse {
  outfit: string;
  location: string;
  action_summary: string;
  visual_tags: string[];
  is_user_present: boolean;
  expression: string;
  lighting: string;
}
```

---

### 11.3 API Response Types

**Location**: `src/temporal/activities.ts`

#### NovitaChatResponse

```typescript
interface NovitaChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}
```

#### SDGenerationParams

```typescript
export interface SDGenerationParams {
  prompt: string;
  negative_prompt: string;
  width: number;
  height: number;
  steps: number;
  cfg_scale: number;
  seed: number;
  sampler_name: string;
}
```

---

### 11.4 Server Action Result Types

**Location**: `src/app/actions.ts`, `src/app/chat-actions.ts`

#### ActionResult

```typescript
export type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};
```

**Usage**:
```typescript
// No data
return { success: true };
return { success: false, error: "Error message" };

// With data
return { success: true, data: { id: "123" } };
```

---

### 11.5 NextAuth Type Extensions

**Location**: `src/types/next-auth.d.ts`

```typescript
declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    email: string;
    name: string;
  }

  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
  }
}
```

---

## 12. Environment Setup

### 12.1 Required Environment Variables

**File**: `.env` (create from `.env.example`)

```bash
# Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/companion_hub"

# NextAuth Configuration
NEXTAUTH_SECRET="<generate-with-openssl-rand-base64-32>"
NEXTAUTH_URL="http://localhost:3000"

# Novita AI API
NOVITA_KEY="<your-novita-api-key>"

# Stable Diffusion Forge
SD_API_URL="http://<sd-forge-host>:<port>"

# Optional
NODE_ENV="development"
```

### 12.2 Generating Secrets

**NEXTAUTH_SECRET**:
```bash
openssl rand -base64 32
```

**Example**: `vZQM8fF5nL7pK9wX2tY6mN4hG3jB8sR1dQ0cA5vW7eU=`

### 12.3 External Services Setup

#### PostgreSQL

**Option 1: Docker Compose**
```bash
docker-compose up -d postgres
```

**Option 2: Local Installation**
```bash
# Install PostgreSQL 15
# Create database
psql -U postgres
CREATE DATABASE companion_hub;
```

**DATABASE_URL Format**:
```
postgresql://<username>:<password>@<host>:<port>/<database>
```

**Example**: `postgresql://postgres:password@localhost:5432/companion_hub`

#### Temporal Server

**Docker Compose**:
```bash
docker-compose up -d temporal
```

**Verify**:
- gRPC: `telnet localhost 7233`
- Web UI: `http://localhost:8233`

#### Stable Diffusion Forge

**Requirement**: Running Stable Diffusion Forge instance

**Setup**:
1. Install Stable Diffusion Forge
2. Start with `--api` flag
3. Note the host and port (e.g., `http://localhost:7860`)
4. Set `SD_API_URL` in `.env`

**Verification**:
```bash
curl http://localhost:7860/sdapi/v1/options
```

#### Novita AI

**Setup**:
1. Sign up at https://novita.ai
2. Generate API key
3. Set `NOVITA_KEY` in `.env`

**Verification**:
```bash
curl -X POST https://api.novita.ai/v3/openai/chat/completions \
  -H "Authorization: Bearer $NOVITA_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sao10k/l31-70b-euryale-v2.2",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'
```

---

## 13. Development Guide

### 13.1 Initial Setup

**1. Clone Repository**
```bash
git clone <repository-url>
cd my-companion-hub
```

**2. Install Dependencies**
```bash
npm install
```

**3. Configure Environment**
```bash
cp .env.example .env
# Edit .env with your values
```

**4. Start External Services**
```bash
docker-compose up -d
```

**5. Initialize Database**
```bash
npm run db:push
```

**6. Start Development Servers**

**Terminal 1: Next.js Dev Server**
```bash
npm run dev
```

**Terminal 2: Temporal Worker**
```bash
npm run worker
```

**7. Access Application**
- App: http://localhost:3000
- Temporal UI: http://localhost:8233

---

### 13.2 Development Workflow

#### Creating a New Companion

1. Navigate to http://localhost:3000/companions
2. Click "Create Companion"
3. Fill form:
   - Name: "Luna"
   - Description: "A friendly and outgoing companion who loves outdoor activities"
   - Visual Description: "Long blonde hair, blue eyes, athletic build"
   - User Appearance: (optional) "Short brown hair, brown eyes"
   - Default Outfit: "gym clothes"
   - Header Image: Upload or drag-drop image
4. Click "Create"
5. Redirected to companions list

#### Chatting with Companion

1. Select companion from sidebar or companions page
2. Type message in chat input
3. (Optional) Check "Generate Image" for visual response
4. Click Send
5. Wait for AI response (and image if requested)
6. View companion state changes in status bar

#### Generating Standalone Image

1. Navigate to http://localhost:3000/generate
2. Enter prompt: "beautiful landscape, mountains, sunset"
3. Adjust parameters (steps, CFG scale, dimensions)
4. Click "Generate Image"
5. Wait for generation
6. Download or copy to clipboard

---

### 13.3 Database Management

#### Prisma Studio (Visual Editor)

```bash
npm run db:studio
```

**Access**: http://localhost:5555

**Features**:
- Browse all tables
- Edit records
- Create test data
- Delete records

#### Database Migrations

**Push Schema Changes**:
```bash
npm run db:push
```

**Generate Prisma Client** (after schema changes):
```bash
npx prisma generate
```

#### Database Seeding

**Create Seed File**: `prisma/seed.ts`

**Example**:
```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10);

  const user = await prisma.user.create({
    data: {
      email: "test@example.com",
      username: "testuser",
      name: "Test User",
      hashedPassword
    }
  });

  await prisma.companion.create({
    data: {
      name: "Luna",
      description: "Friendly and outgoing",
      visualDescription: "Blonde hair, blue eyes",
      defaultOutfit: "casual clothes",
      currentOutfit: "casual clothes",
      currentLocation: "living room",
      currentAction: "looking at viewer",
      userId: user.id
    }
  });
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
```

**Run Seed**:
```bash
npx prisma db seed
```

---

### 13.4 Debugging

#### Server Actions

**Add Logging**:
```typescript
export async function sendMessage(formData: FormData) {
  console.log("sendMessage called with:", Object.fromEntries(formData));

  try {
    // ... implementation
  } catch (error) {
    console.error("sendMessage error:", error);
    throw error;
  }
}
```

#### Temporal Workflows

**View in Temporal UI**:
1. Open http://localhost:8233
2. Navigate to "Workflows"
3. Find workflow by ID (format: `chat-<companionId>-<nanoid>`)
4. View execution history
5. Check activity inputs/outputs

**Add Logging to Activities**:
```typescript
export async function analyzeContext(messageText: string) {
  console.log("analyzeContext input:", messageText);

  const result = // ... analysis

  console.log("analyzeContext result:", result);
  return result;
}
```

#### Database Queries

**Enable Query Logging**:

**In** `src/lib/prisma.ts`:
```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
});
```

**View in Console**: All SQL queries logged

---

### 13.5 Testing

#### Manual Testing Checklist

**Authentication**:
- [ ] Register new user
- [ ] Login with email
- [ ] Login with username
- [ ] Logout
- [ ] Access protected pages while logged out (should redirect)

**Companion Management**:
- [ ] Create companion with all fields
- [ ] Create companion with minimal fields
- [ ] Edit companion
- [ ] Delete companion (verify messages cascade delete)
- [ ] Upload header image (drag-drop, paste, file picker)
- [ ] Crop header image

**Chat**:
- [ ] Send message without image generation
- [ ] Send message with image generation
- [ ] View message history
- [ ] Verify state updates (outfit, location, action)
- [ ] Send long message (near 2000 char limit)

**Image Generation**:
- [ ] Generate standalone image
- [ ] Generate contextual image in chat
- [ ] Test different samplers
- [ ] Test different dimensions
- [ ] Download image
- [ ] Copy image to clipboard

**Gallery**:
- [ ] View gallery overview
- [ ] View individual companion gallery
- [ ] Download image from gallery

**Settings**:
- [ ] Wipe companion memory (verify messages deleted, state reset)

---

## 14. Deployment

### 14.1 Production Checklist

**Environment**:
- [ ] Generate new `NEXTAUTH_SECRET` for production
- [ ] Set `NEXTAUTH_URL` to production domain
- [ ] Configure production `DATABASE_URL`
- [ ] Set `NODE_ENV=production`
- [ ] Secure all API keys

**Database**:
- [ ] Use managed PostgreSQL (AWS RDS, Neon, Supabase)
- [ ] Enable SSL for database connection
- [ ] Configure connection pooling
- [ ] Set up automated backups

**Temporal**:
- [ ] Deploy Temporal server (Temporal Cloud or self-hosted)
- [ ] Update Temporal connection address
- [ ] Deploy worker as separate service

**External Services**:
- [ ] Verify Novita AI rate limits for production
- [ ] Ensure Stable Diffusion Forge is accessible
- [ ] Consider load balancing for SD Forge

**Security**:
- [ ] Enable HTTPS
- [ ] Configure CSP headers
- [ ] Implement rate limiting
- [ ] Review CORS settings
- [ ] Rotate all development credentials

**Performance**:
- [ ] Enable Next.js caching
- [ ] Configure CDN for static assets
- [ ] Monitor database query performance
- [ ] Set up error tracking (Sentry)

---

### 14.2 Deployment Platforms

#### Vercel (Recommended for Next.js)

**Limitations**:
- Serverless functions (10-second timeout)
- No long-running processes (worker must be deployed separately)

**Setup**:
1. Push to GitHub
2. Connect Vercel to repository
3. Configure environment variables
4. Deploy

**Temporal Worker**:
- Deploy worker to separate service (Railway, Fly.io, AWS EC2)

#### Docker Deployment

**Create Dockerfile**:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**Docker Compose** (full stack):
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: companion_hub
    volumes:
      - postgres_data:/var/lib/postgresql/data

  temporal:
    image: temporalio/admin-tools:latest
    ports:
      - "7233:7233"
    command: temporal server start-dev
    volumes:
      - temporal_data:/data

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/companion_hub
      NEXTAUTH_URL: http://localhost:3000
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NOVITA_KEY: ${NOVITA_KEY}
      SD_API_URL: ${SD_API_URL}
    depends_on:
      - postgres
      - temporal

  worker:
    build: .
    command: npm run worker
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/companion_hub
      NOVITA_KEY: ${NOVITA_KEY}
      SD_API_URL: ${SD_API_URL}
    depends_on:
      - temporal

volumes:
  postgres_data:
  temporal_data:
```

---

### 14.3 Scaling Considerations

**Database**:
- Enable connection pooling (PgBouncer)
- Add read replicas for heavy read workloads
- Implement database caching (Redis)

**Temporal**:
- Scale workers horizontally (multiple instances)
- Use Temporal Cloud for managed infrastructure
- Monitor workflow execution times

**Image Storage**:
- Move from base64 to object storage (S3, Cloudflare R2)
- Implement image CDN
- Add image compression

**Rate Limiting**:
- Implement per-user rate limits
- Add API key management for Novita/SD
- Monitor and alert on quota usage

---

## 15. API Reference

### 15.1 Server Actions

#### Companion Actions (src/app/actions.ts)

**createCompanion**
```typescript
async function createCompanion(formData: FormData): Promise<ActionResult>
```
**Parameters**:
- `name` (string): Companion name (1-100 chars)
- `description` (string): Personality traits (min 10 chars)
- `visualDescription` (string): Physical appearance (min 10 chars)
- `userAppearance` (string, optional): User's appearance
- `defaultOutfit` (string): Initial outfit (min 1 char)
- `headerImage` (string, optional): Base64 image data

**Returns**: `{ success: boolean, error?: string }`

---

**updateCompanion**
```typescript
async function updateCompanion(
  companionId: string,
  formData: FormData
): Promise<ActionResult>
```
**Parameters**: Same as createCompanion + `companionId`
**Behavior**: Resets currentOutfit to defaultOutfit

---

**deleteCompanion**
```typescript
async function deleteCompanion(companionId: string): Promise<ActionResult>
```
**Behavior**: Cascade deletes all messages

---

**getCompanions**
```typescript
async function getCompanions(): Promise<Companion[]>
```
**Returns**: Array of user's companions

---

**wipeCompanionMemory**
```typescript
async function wipeCompanionMemory(companionId: string): Promise<ActionResult>
```
**Behavior**: Deletes all messages, resets state to defaults

---

#### Chat Actions (src/app/chat-actions.ts)

**sendMessage**
```typescript
async function sendMessage(formData: FormData): Promise<ActionResult>
```
**Parameters**:
- `message` (string): User message (1-2000 chars)
- `companionId` (string): UUID
- `generateImage` (boolean, optional): Generate image with response

**Process**:
1. Validates input
2. Saves user message
3. Starts Temporal workflow
4. Saves AI response
5. Revalidates page

**Returns**: `{ success: boolean, error?: string }`

---

#### Image Actions (src/app/image-actions.ts)

**generateStandaloneImage**
```typescript
async function generateStandaloneImage(
  formData: FormData
): Promise<ActionResult<{ imageUrl: string }>>
```
**Parameters**:
- `prompt` (string): Positive prompt
- `negative_prompt` (string): Negative prompt
- `width` (number): Image width
- `height` (number): Image height
- `steps` (number): Sampling steps
- `cfg_scale` (number): CFG scale
- `seed` (number): Seed (-1 = random)
- `sampler_name` (string): Sampler method

**Returns**: `{ success: boolean, data: { imageUrl: string }, error?: string }`

---

#### Auth Actions (src/app/auth-actions.ts)

**registerUser**
```typescript
async function registerUser(formData: FormData): Promise<ActionResult>
```
**Parameters**:
- `name` (string): Display name
- `email` (string): Valid email
- `username` (string): 3-20 chars, alphanumeric + underscore
- `password` (string): Min 8 chars

**Validation**:
- Email uniqueness
- Username uniqueness
- Password hashing (bcrypt, 10 rounds)

**Returns**: `{ success: boolean, error?: string }`

---

### 15.2 Temporal Activities

#### analyzeContext
```typescript
async function analyzeContext(
  messageText: string
): Promise<LLMAnalysisResponse>
```
**Returns**:
```typescript
{
  outfit: string;
  location: string;
  action_summary: string;
  visual_tags: string[];
  is_user_present: boolean;
  expression: string;
  lighting: string;
}
```

---

#### generateLLMResponse
```typescript
async function generateLLMResponse(
  companionId: string,
  companionName: string,
  userMessage: string,
  userName: string,
  currentOutfit: string,
  currentLocation: string,
  currentAction: string,
  msgHistory: MessageHistory[]
): Promise<string>
```
**Returns**: AI response text (1-3 sentences)

---

#### generateCompanionImage
```typescript
async function generateCompanionImage(
  companionId: string,
  visualDescription: string,
  userAppearance: string | null,
  context: LLMAnalysisResponse
): Promise<string>
```
**Returns**: Base64 data URL

---

#### updateCompanionContext
```typescript
async function updateCompanionContext(
  companionId: string,
  newOutfit: string,
  newLocation: string,
  newAction: string
): Promise<void>
```

---

### 15.3 External API Endpoints

#### Novita AI

**Endpoint**: `https://api.novita.ai/v3/openai/chat/completions`

**Method**: POST

**Headers**:
```json
{
  "Authorization": "Bearer <NOVITA_KEY>",
  "Content-Type": "application/json"
}
```

**Body**:
```json
{
  "model": "sao10k/l31-70b-euryale-v2.2",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "temperature": 0.85,
  "max_tokens": 150,
  "top_p": 0.95,
  "repetition_penalty": 1.1
}
```

**Response**:
```json
{
  "choices": [{
    "message": {
      "content": "AI response text"
    }
  }]
}
```

---

#### Stable Diffusion Forge

**Endpoint**: `${SD_API_URL}/sdapi/v1/txt2img`

**Method**: POST

**Headers**:
```json
{
  "Content-Type": "application/json"
}
```

**Body**:
```json
{
  "prompt": "...",
  "negative_prompt": "...",
  "width": 832,
  "height": 1216,
  "steps": 28,
  "cfg_scale": 6.0,
  "seed": -1,
  "sampler_name": "DPM++ 2M"
}
```

**Response**:
```json
{
  "images": ["base64_encoded_png_data"]
}
```

---

## Appendix

### A. Validation Schemas

**Location**: `src/lib/validation.ts`

```typescript
export const companionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(10),
  visualDescription: z.string().min(10),
  userAppearance: z.string().optional(),
  defaultOutfit: z.string().min(1),
  headerImage: z.string().optional()
});

export const messageSchema = z.object({
  message: z.string().min(1).max(2000),
  companionId: z.string().uuid(),
  generateImage: z.boolean().optional()
});

export const registrationSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  username: z.string()
    .min(3).max(20)
    .regex(/^[a-z0-9_]+$/),
  password: z.string().min(8)
});
```

---

### B. Key File Locations

| Purpose | File Path |
|---------|-----------|
| Chat Interface | src/app/page.tsx |
| Chat Server Actions | src/app/chat-actions.ts |
| Companion CRUD | src/app/actions.ts |
| Temporal Workflows | src/temporal/workflows.ts |
| Temporal Activities | src/temporal/activities.ts |
| Temporal Worker | src/temporal/worker.ts |
| NextAuth Config | src/lib/auth.ts |
| Prisma Schema | prisma/schema.prisma |
| Validation Schemas | src/lib/validation.ts |
| Image Generation Config | src/config/generation.ts |
| Clothing Logic | src/config/clothing-keywords.ts |
| Scene Enhancements | src/config/scene-enhancements.ts |

---

### C. Common Issues & Solutions

**Issue**: Temporal connection refused
**Solution**: Ensure Temporal server is running (`docker-compose up -d temporal`)

**Issue**: Database connection error
**Solution**: Verify `DATABASE_URL` in `.env` and PostgreSQL is running

**Issue**: Image generation fails
**Solution**: Check `SD_API_URL` is correct and Stable Diffusion Forge is running with `--api` flag

**Issue**: NextAuth session not persisting
**Solution**: Verify `NEXTAUTH_SECRET` is set and `NEXTAUTH_URL` matches your domain

**Issue**: Workflow timeout
**Solution**: Check worker logs, verify activities complete within 2 minutes

---

### D. Performance Metrics

**Average Response Times** (local development):
- Chat without image: 2-4 seconds
- Chat with image: 15-30 seconds
- Standalone image generation: 10-20 seconds
- Page load (with 30 messages): <1 second

**Database Query Counts**:
- Chat page load: 3 queries (user, companion, messages)
- Send message: 5 queries (user, companion, insert message, fetch history, insert response)
- Gallery overview: 2 queries (user, companions with counts)

---

This documentation provides a comprehensive technical reference for the My Companion Hub application. For additional support, refer to the source code comments and official documentation for Next.js, Prisma, Temporal, and other dependencies.
