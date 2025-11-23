# DeepFish

DeepFish is a visual AI workflow composer platform that democratizes access to
powerful generative AI models. It allows users to combine models from providers
like Fal.ai and Replicate into sophisticated pipelines through a node-based
interface—think "Zapier for AI" or a web-based ComfyUI.

## Features

- **Visual Composer**: Drag-and-drop node editor to build complex AI pipelines.
- **Multi-Modal**: Support for Text, Image, Audio, Video, and 3D generation.
- **Model Integrations**: First-class support for Fal.ai and Replicate models.
- **Workflow Library**: Import, share, and fork community workflows.
- **Credit System**: Built-in credit management and Stripe integration for
  billing.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **State**: Zustand + React Query
- **API**: tRPC
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk
- **Queues**: Inngest (Background processing)
- **UI**: Tailwind CSS + Radix UI + React Flow

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Accounts for: Clerk, Stripe, Fal.ai, Replicate, Vercel Blob

### Installation

1.  **Clone the repo**

    ```bash
    git clone <repo-url>
    cd deepfish
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Environment Setup** Rename `env.example` to `.env` and fill in your keys:

    ```bash
    cp env.example .env
    ```

    > **Note:** You will need your own API keys for all services.

4.  **Database Setup**

    ```bash
    npm run db:push
    ```

5.  **Run Development Server**
    ```bash
    npm run dev
    ```

## Architecture Notes

### Workflow Engine

The core of DeepFish is the **Composer** (`src/app/(app)/(dynamic)/composer`).
It uses a custom state management layer over React Flow to handle node
connections, validation, and execution.

- **Current State:** Client-directed graph execution.
- **Future Goal:** A fully persistent, server-side "network" model (akin to
  TouchDesigner) that supports arbitrary compute nodes and continuous async
  processing, allowing workflows to run autonomously even when users are
  offline.

### Async Processing

We use **Inngest** (`src/inngest`) to handle workflow executions. This ensures
that long-running generation tasks (like video generation) don't block the UI
and can handle failures/retries gracefully.

## Contributing

We welcome contributions! Please see the `.cursor/` directory for design
documents (`.mdc` files) that explain our coding patterns and architecture in
detail.

## License

MIT
