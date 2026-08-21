# The Bible Net

The Bible Net is a modern Bible reading and study platform built with Next.js. It helps users read scripture in multiple languages, save favourite verses, take notes, explore devotionals, track reading progress, and engage with a Christian community through prayers, journals, highlights, and sharing features.

## Overview

This project is designed for a rich devotional experience with:

- Multi-version and multi-language Bible reading
- Verse search and navigation
- Daily devotionals and Bible reflections
- Highlights, notes, saved verses, and bookmarks
- Reading plans and offline reading support
- Community journaling, prayer wall, and comments
- Authentication, profile management, and admin workflows
- API documentation and data services for content and engagement

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- MongoDB + Mongoose
- Redis
- NextAuth.js
- next-intl for localization
- Cloudinary for media uploads
- Swagger UI for API docs
- Vercel-ready deployment setup

## Key Features

### Bible Experience
- Read Bible content across versions and translations
- Search verses and navigate chapters efficiently
- Track reading progress across books and plans
- Browse daily verse and devotional content

### Study & Reflection
- Save verses and content collections
- Add notes and highlights to scripture
- Write journals and prayer entries
- Follow reading plans and devotional routines

### Community & Engagement
- Like, comment, and share Bible content
- Explore community prayers and devotional interactions
- User profiles and personalized reading preferences

### Offline-First Features
- Cached reading support for offline use
- Downloadable Bible content sections
- Sync-ready architecture for resilient browsing

## Project Structure

```text
.
├── assets/                  # Bible JSON data and project assets
├── messages/                # Localization files (en, hi, te, etc.)
├── public/                  # Static public files and manifest
├── scripts/                 # Import, migration, and utility scripts
├── src/
│   ├── app/                 # Next.js routes, pages, and API handlers
│   ├── components/          # Reusable UI components
│   ├── context/             # React context providers
│   ├── hooks/               # Custom hooks
│   ├── i18n/                # Internationalization config
│   ├── lib/                 # Database, auth, Redis, offline, search utilities
│   ├── models/              # Mongoose models
│   ├── repositories/        # Data access layer
│   ├── services/            # Business logic
│   ├── stores/              # Client state stores
│   ├── types/               # Shared TypeScript types
│   └── utils/               # Helper utilities
├── README.md
├── TECHNICAL_DOCUMENTATION.md
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── .env.local.example      # if present in your local setup
```

## Prerequisites

Before running this project, make sure you have:

- Node.js 18+
- npm, yarn, pnpm, or bun
- MongoDB instance
- Redis instance (optional but recommended for caching)
- Cloudinary account for upload-based media features
- Email SMTP credentials for auth and notifications

## Environment Setup

Create a `.env.local` file in the project root with the required values:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/bible-app
NEXTAUTH_SECRET=your-super-secret-key
NEXTAUTH_URL=http://localhost:3000

REDIS_URL=redis://localhost:6379

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
SMTP_HOST=smtp.example.com
SMTP_PORT=587

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

> Keep your environment variables private and do not commit `.env.local` to source control.

## Installation

```bash
npm install
```

## Running the App

Start the development server:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Useful Scripts

```bash
npm run dev                 # start Next.js dev server
npm run build               # production build
npm run start               # run production build
npm run lint                # run ESLint checks
npm run import:bible        # import Bible data into MongoDB
npm run import:bible:dry    # dry-run Bible import
npm run migrate:telugu-books # migrate Telugu book naming data
```

## Importing Bible Data

This application uses local Bible JSON content. After your database is configured, import the included data with:

```bash
npx tsx --tsconfig tsconfig.scripts.json scripts/import_bible.ts
```

## Documentation

- Technical details: [TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md)
- App routes and APIs are exposed through the app structure and Swagger-generated docs under the API routes

## Deployment

The app is structured for deployment on Vercel and other Node-compatible hosting platforms. Ensure that all required environment variables are configured in your deployment environment.

## Contributing

Contributions are welcome. If you want to improve the app:

1. Create a feature branch
2. Implement your changes
3. Run lint/build checks
4. Open a pull request with a clear summary

## License

This project does not currently include a custom license file. Please confirm licensing requirements with the repository owner before commercial or public distribution.

## Notes

This project is actively built around a reading-first, community-driven Bible experience and may evolve based on feature additions, data imports, and deployment requirements.

