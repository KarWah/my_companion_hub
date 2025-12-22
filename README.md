Welcome to My Companion Hub

this is my first actual application that's "production ready" so there might be a few flaws.

My Companion Hub is a Next.js application that enables users to create, manage, and interact with AI companions. It features persistent contextual chat, dynamic state tracking (outfit, location, actions), and seamless image generation using Stable Diffusion Forge, all orchestrated via Temporal workflows.
Key Features

     Personalized AI Companions: Create companions with unique personalities, visual descriptions, and behavioral traits.
     Context-Aware Chat: Persistent conversations where the AI remembers context. The system dynamically tracks the companion's Outfit, Location, and Current Action based on the chat flow.
     Dynamic Image Generation:
        In-Chat: Generate contextually accurate images of your companion during conversation (e.g., matching their current outfit and location).
        Smart Layering: Logic to handle clothing layering (e.g., hiding underwear under jeans) to ensure accurate imaging.
        Standalone Generator: A full-featured UI for prompting Stable Diffusion directly.

     Image Gallery: Browse, manage, and download generated images organized by companion.
     Robust Architecture: Uses Temporal.io for reliable workflow orchestration, ensuring complex chains of Logic (Context Analysis → LLM Response → State Update → Image Generation) never fail silently.
     Secure: User authentication and management via NextAuth.js.

Technology Stack
Core

    Framework: Next.js 16.0.8 (App Router)
    Language: TypeScript 5.9.3
    Styling: Tailwind CSS 3.4
    Database: PostgreSQL (via Prisma ORM 7.1)
    Auth: NextAuth.js v5 Beta

AI & Orchestration

    Orchestration: Temporal.io (Workflows & Activities)
    LLM Provider: Novita AI (Model: sao10k/l31-70b-euryale-v2.2)
    Image Generation: Stable Diffusion Forge (Local/Remote API)

 Prerequisites

Before running the project, ensure you have the following installed/available:

    Node.js (v20+ recommended)
    Docker & Docker Compose (for Database and Temporal server)
    Stable Diffusion Forge: You must have a running instance of SD Forge with the API flag enabled (--api).
    Novita AI API Key: For LLM chat and context analysis.

 Environment Setup

    Clone the repository:
    Bash

git clone https://github.com/yourusername/my-companion-hub.git
cd my-companion-hub

Install dependencies:
Bash

npm install

Create a .env file in the root directory:
Bash

cp .env.example .env

Configure your environment variables in .env:

    # Database
    DATABASE_URL="postgresql://user:password@localhost:5432/companion_hub"

    # NextAuth
    NEXTAUTH_URL="http://localhost:3000"
    NEXTAUTH_SECRET="<generate-using: openssl rand -base64 32>"

    # External APIs
    NOVITA_KEY="<your-novita-api-key>"
    SD_API_URL="http://127.0.0.1:7860" # URL to your running SD Forge instance

    # Environment
    NODE_ENV="development"

Getting Started
1. Start Infrastructure Services

Use Docker Compose to spin up PostgreSQL and the Temporal Server.
Bash

docker-compose up -d

    Temporal UI will be available at http://localhost:8233

2. Initialize Database

Push the Prisma schema to your local database.
Bash

npm run db:push

(Optional) Seed the database with a test user:
Bash

npx prisma db seed

3. Run the Application

You need to run two processes simultaneously (in separate terminals):

Terminal 1: The Temporal Worker This processes the chat logic, context analysis, and image generation.
Bash

npm run worker

Terminal 2: The Next.js App This runs the frontend and API routes.
Bash

npm run dev

4. Access the App

Open your browser and navigate to http://localhost:3000.
📂 Project Structure

src/
├── app/                  # Next.js App Router (Pages & Server Actions)
│   ├── companions/       # Companion CRUD
│   ├── gallery/          # Image Gallery
│   ├── generate/         # Standalone Image Generator
│   ├── chat-actions.ts   # Chat Server Actions
│   └── image-actions.ts  # Image Generation Actions
├── components/           # React Components (ChatForm, Sidebar, etc.)
├── config/               # Configuration Logic
│   ├── clothing-keywords.ts  # Smart outfit layering logic
│   └── scene-enhancements.ts # Prompt engineering helpers
├── lib/                  # Utilities (Auth, Prisma, Validation)
├── temporal/             # Orchestration Logic
│   ├── workflows.ts      # ChatWorkflow definition
│   ├── activities.ts     # LLM and SD API calls
│   └── worker.ts         # Worker entry point
└── types/                # TypeScript definitions

How It Works

    Context Analysis: When you send a message, the system sends your history to the LLM to extract the current Outfit, Location, and Action.
    State Update: If the companion decides to change clothes or move to a new location in the narrative, the database is updated automatically.
    Response: The companion replies to you using a specific persona prompt.

    Image Trigger (Optional): If enabled, the system constructs a complex Stable Diffusion prompt combining:
        Visual Description (Physical features)
        Current State (Outfit + Location + Action)
        Smart Enhancements (Lighting + Scene details)

    Result: The image is generated, saved to the database, and displayed in the chat stream.

⚠️ Known Issues / Troubleshooting

    currently image generation is stored on DB, might crash if too many images are saved (System design flaw)
    
    Connection Refused (Temporal): Ensure the Docker container for Temporal is running and the worker is started (npm run worker).
    
    Image Generation Fails: Ensure your SD_API_URL is reachable and Stable Diffusion Forge was started with the --api argument.
    
    Auth Errors: Verify your NEXTAUTH_SECRET is set.
    
