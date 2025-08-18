# SEO AI Automation Platform

A comprehensive web-based SEO automation platform that streamlines the entire content creation workflow from keyword research to publication. Built with React, TypeScript, and PostgreSQL, featuring a modern glass-morphism UI with sophisticated animations and AI-powered aesthetics.

## Features

- **Complete SEO Workflow**: From keyword research to content distribution
- **AI-Powered Automation**: Automated keyword research, content creation, and editorial review
- **Modern UI**: Glass-morphism design with neon accents and smooth animations
- **Multi-Platform Publishing**: WordPress, social media, and content distribution
- **Real-time Dashboard**: Track AI agents, workflow progress, and analytics
- **Database-Driven**: PostgreSQL backend with full data persistence

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling and development
- **Wouter** for lightweight routing
- **shadcn/ui** components with Radix UI primitives
- **Tailwind CSS** with custom glass-morphism design system
- **Framer Motion** for animations and transitions
- **TanStack Query** for server state management

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** database with Drizzle ORM
- **Neon Database** (serverless PostgreSQL)
- **ESBuild** for production builds

## Prerequisites

Before running this project locally, make sure you have:

- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)
- **Git** (to clone the repository)

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd seo-ai-automation
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

You'll need a PostgreSQL database. Choose one of these options:

#### Option A: Cloud Database (Recommended)

Sign up for a free PostgreSQL database at one of these providers:
- [Neon](https://neon.tech) (recommended)
- [Supabase](https://supabase.com)
- [Railway](https://railway.app)
- [Render](https://render.com)

After creating your database, you'll get a connection URL that looks like:
```
postgresql://username:password@hostname:port/database
```

#### Option B: Local PostgreSQL

1. Install PostgreSQL on your computer
2. Create a new database:
```sql
CREATE DATABASE seo_automation;
```
3. Your connection URL will be:
```
postgresql://username:password@localhost:5432/seo_automation
```

### 4. Environment Configuration

Create a `.env` file in the root directory:

```env
DATABASE_URL=your_postgresql_connection_string_here
NODE_ENV=development
```

**Important**: Replace `your_postgresql_connection_string_here` with your actual database URL.

### 5. Database Schema Setup

Push the database schema to your PostgreSQL database:

```bash
npm run db:push
```

This command will create all the necessary tables and relationships for the SEO automation workflow.

### 6. Start Development Server

```bash
npm run dev
```

The application will be available at: **http://localhost:5000**

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components for routing
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and configuration
├── server/                # Backend Express server
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API route definitions
│   ├── storage.ts        # Database abstraction layer
│   └── db.ts             # Database connection
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schema definitions
├── package.json          # Dependencies and scripts
└── drizzle.config.ts     # Database configuration
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Push database schema changes
- `npm run db:studio` - Open Drizzle Studio (database GUI)

## Database Schema

The application uses PostgreSQL with these main entities:

- **Users**: Authentication and user management
- **Projects**: User-owned SEO projects with settings
- **Keywords**: Research targets with search volume and difficulty
- **Content Briefs**: AI-generated content outlines
- **Articles**: Full content pieces with SEO scoring
- **Distributions**: Multi-platform publishing records

### Relations
- Users → Projects (one-to-many)
- Projects → Keywords (one-to-many)  
- Keywords → Content Briefs (one-to-many)
- Content Briefs → Articles (one-to-many)
- Articles → Distributions (one-to-many)

## Workflow Pages

- `/dashboard` - Overview of workflow and AI agent status
- `/keyword-research` - Trigger keyword research and view results
- `/content-brief` - Generate and edit content briefs
- `/writer` - AI content writing interface
- `/approval` - Editorial review and approval panel
- `/distribution` - Social media posting and WordPress publishing
- `/settings` - API configuration and system settings

## API Endpoints

The backend provides REST API endpoints for all entities:

- `GET/POST /api/users` - User management
- `GET/POST/PUT/DELETE /api/projects` - Project CRUD
- `GET/POST/PUT/DELETE /api/keywords` - Keyword management
- `GET/POST/PUT/DELETE /api/content-briefs` - Content brief operations
- `GET/POST/PUT/DELETE /api/articles` - Article management
- `GET/POST/PUT/DELETE /api/distributions` - Distribution tracking

## Browser Compatibility

The application works best in modern browsers that support:
- CSS Grid and Flexbox
- CSS custom properties (variables)
- ES2020+ JavaScript features
- WebGL for advanced animations

**Recommended browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Database Connection Issues

1. Verify your `DATABASE_URL` is correct in `.env`
2. Make sure your database is running and accessible
3. Check if you need to whitelist your IP address (for cloud databases)

### Build Errors

1. Clear node modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

2. Make sure you're using Node.js 18+:
```bash
node --version
```

### Development Server Issues

1. Make sure port 5000 is available
2. Check for any TypeScript errors in the console
3. Verify all environment variables are set correctly

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit with descriptive messages
5. Push to your fork and submit a pull request

## License

This project is proprietary software. All rights reserved.

---

For questions or support, please contact the development team.