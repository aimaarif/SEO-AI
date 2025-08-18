# SEO AI Automation Application

## Overview

This is a web-based SEO automation application that streamlines the content creation workflow from keyword research to publication. The app uses AI agents to automate keyword research, content creation, editorial approval, social media sharing, and WordPress publishing. It features a modern, glass-morphism UI built with React/TypeScript and integrates with external services like Google Sheets, WordPress, and various AI providers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a full-stack architecture with clear separation between frontend and backend concerns:

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom glass-morphism design system
- **State Management**: TanStack Query for server state management
- **Animations**: Framer Motion for page transitions and micro-interactions

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Build Tool**: ESBuild for production builds, TSX for development
- **Database**: PostgreSQL with Drizzle ORM (fully implemented)
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Storage Interface**: DatabaseStorage class implementing full SEO workflow data models

## Key Components

### Frontend Structure
```
client/
├── src/
│   ├── components/
│   │   ├── ui/           # Reusable UI components (shadcn/ui)
│   │   ├── layout/       # Navigation and layout components
│   │   ├── keyword/      # Keyword research components
│   │   ├── content/      # Content creation components
│   │   ├── approval/     # Editorial approval components
│   │   ├── distribution/ # Social media and publishing components
│   │   └── settings/     # Configuration components
│   ├── pages/           # Page components for routing
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Utilities and configuration
```

### Page Structure
- `/dashboard` - Overview of workflow and AI agent status
- `/keyword-research` - Trigger keyword research and view results
- `/content-brief` - Generate and edit content briefs
- `/writer` - AI content writing interface
- `/approval` - Editorial review and approval panel
- `/distribution` - Social media posting and WordPress publishing
- `/settings` - API configuration and system settings

### Backend Structure
```
server/
├── index.ts      # Express server setup
├── routes.ts     # API route definitions
├── storage.ts    # Database abstraction layer
└── vite.ts       # Development server integration
```

## Database Schema

The PostgreSQL database supports the complete SEO automation workflow with these core entities:

- **Users**: Authentication and user management
- **Projects**: User-owned SEO projects with settings and configuration
- **Keywords**: Research targets with search volume, difficulty, and status tracking
- **Content Briefs**: AI-generated content outlines based on keywords
- **Articles**: Full content pieces with SEO scoring and approval workflow
- **Distributions**: Multi-platform publishing records (WordPress, social media)

### Database Relations
- Users → Projects (one-to-many)
- Projects → Keywords (one-to-many)
- Keywords → Content Briefs (one-to-many)
- Content Briefs → Articles (one-to-many)
- Articles → Distributions (one-to-many)

## Data Flow

1. **Keyword Research**: Results stored in keywords table with project association
2. **Content Brief Generation**: AI evaluates keywords and creates structured briefs
3. **Content Creation**: AI writers generate articles linked to approved briefs
4. **Editorial Review**: Status tracking through draft → review → approved states
5. **Publishing Pipeline**: Distribution records track multi-platform publishing status

### AI Agent Workflow
- Research Agent: Handles keyword research and competitor analysis
- Writer Agent: Generates content based on briefs
- Editor Agent: Provides feedback and revision suggestions
- Distribution Agent: Creates social media posts and generates images

## External Dependencies

### Core Technologies
- **Database**: PostgreSQL via Neon Database (@neondatabase/serverless)
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **UI Components**: Radix UI primitives with shadcn/ui styling
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack React Query for API state

### AI and External Services
- **AI Providers**: OpenAI/Claude integration (configured in settings)
- **Google Sheets**: For keyword storage and data management
- **WordPress**: For blog publishing
- **Social Media**: Twitter, LinkedIn, Facebook integration
- **Image Generation**: AI-powered image and infographic creation

### Development Tools
- **Replit Integration**: Custom Replit plugins for development environment
- **Error Handling**: Runtime error overlay for development
- **Build Tools**: Vite for frontend, ESBuild for backend production builds

## Deployment Strategy

### Development
- Frontend served via Vite dev server with HMR
- Backend runs with TSX for TypeScript execution
- Integrated development experience with Replit environment

### Production
- Frontend built to static assets via Vite
- Backend compiled to ESM bundle via ESBuild
- PostgreSQL database hosted on Neon
- Environment variables for API keys and database connections

### Configuration Management
- Database schema managed via Drizzle migrations
- API keys stored as environment variables
- Settings panel for runtime configuration of AI providers
- Modular storage interface allows for easy database provider switching

The application is designed with scalability in mind, using modern web standards and a clean separation of concerns that allows for easy maintenance and feature additions.