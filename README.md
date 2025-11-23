# Deepfish

A visual AI workflow composer platform that allows users to create, share, and
execute complex AI pipelines through a node-based interface.

## Overview

Deepfish is a Next.js web application that democratizes access to AI models by
providing a user-friendly, visual interface for combining multiple AI services
into sophisticated workflows. Think of it as Zapier for AI operations - users
can drag and drop AI model nodes to create complex pipelines that process text,
images, audio, video, and 3D content.

## Key Features

### 🎨 Visual Workflow Composer

- **Node-based editor**: Drag and drop interface for building AI workflows
- **Real-time execution**: Live progress tracking and detailed logging
- **Multiple node types**: Support for AI models, utility operations, and custom
  logic
- **Flow visualization**: Clear representation of data flow between operations

### 🤖 AI Service Integrations

- **Replicate**: Access to hundreds of open-source AI models
- **Fal AI**: High-performance AI inference platform
- **Multi-modal support**: Text, image, audio, video, and 3D model processing
- **Model chaining**: Connect outputs from one model as inputs to another

### 🌐 Community & Sharing

- **Workflow marketplace**: Browse and discover workflows created by the
  community
- **Public/private sharing**: Share workflows publicly or keep them private
- **One-click installation**: Install and customize community workflows
- **User profiles**: Showcase your created workflows and collections

### 💳 Subscription & Credits

- **Credit system**: Pay-per-use model for workflow execution
- **Stripe integration**: Secure payment processing
- **Subscription plans**: Monthly plans with credit allowances
- **Free tier**: Welcome credits for new users to get started

### 🔧 Developer Features

- **API access**: REST and tRPC APIs for programmatic workflow execution
- **Type-safe**: Full TypeScript coverage with end-to-end type safety
- **Authentication**: Secure user management with Clerk
- **File storage**: Integrated asset management with Vercel Blob

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **API**: tRPC with React Query
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Clerk
- **Payments**: Stripe
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Workflow Engine**: React Flow
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Clerk account for authentication
- Stripe account for payments (optional for development)

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://..."

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Stripe (optional)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# AI Services (users can provide their own)
REPLICATE_API_TOKEN="r8_..."
FAL_KEY="..."
```

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/deepfish.git
   cd deepfish
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up the database**

   ```bash
   npm run db:push
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser** Navigate to `http://localhost:3000`

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (app)/             # Main application routes
│   │   ├── composer/      # Visual workflow editor
│   │   ├── workflow/      # Individual workflow pages
│   │   └── dashboard/     # User dashboard
│   ├── (home)/           # Landing page and auth
│   └── api/              # API routes
├── components/            # Reusable UI components
│   ├── modals/           # Modal dialogs
│   ├── panels/           # Sidebar panels
│   └── ui/               # Base UI components
├── server/               # Backend API logic
│   ├── api/              # tRPC routers
│   └── db/               # Database schema
├── store/                # Zustand state stores
└── lib/                  # Utility functions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint and Biome checks
- `npm run db:push` - Push database schema changes

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## Links

- **Website**: [deepfi.sh](https://deepfi.sh)
- **Documentation**: [Coming soon]
- **Discord**: [Coming soon]
- **Twitter**: [Coming soon]
