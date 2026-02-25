# Technical Documentation: The Bible Net

## 1. Project Overview
**The Bible Net** is a modern, high-performance web platform designed for reading, searching, and studying the Bible in multiple languages. It leverages a modern full-stack architecture to provide a seamless user experience across devices, with a focus on speed, scalability, and localization.

---

## 2. Tech Stack
The application is built using the following core technologies:

| Category | Technology |
| :--- | :--- |
| **Framework** | Next.js 14+ (App Router) |
| **Language** | TypeScript |
| **Database** | MongoDB (via Mongoose) |
| **Caching** | Redis (via ioredis) |
| **Authentication** | NextAuth.js (v5 Beta) |
| **Localization** | next-intl |
| **Styling** | TailwindCSS & Framer Motion |
| **API Docs** | Swagger / OpenAPI 3.0 |
| **Storage** | Cloudinary (File Uploads) |
| **Hosting** | Vercel (Optimized for Analytics & Speed Insights) |

---

## 3. Architecture & Project Structure
The project follows a modular architecture with a clear separation of concerns.

### Directory Structure
```text
/src
  ├── app           # Next.js App Router (Routes, API, Pages)
  ├── components    # Shared React components
  ├── i18n          # Localization configuration
  ├── lib           # Third-party library initializations (DB, Redis, Auth)
  ├── models        # Mongoose data models
  ├── services      # Business logic / Service layer
  ├── types         # TypeScript interface definitions
  └── utils         # Helper functions
/scripts            # Data import and utility scripts
/messages           # Translation JSON files (en, hi, te, etc.)
```

### core Design Patterns
- **Service Layer**: Business logic is encapsulated in static classes (e.g., `UserService`) to keep API routes clean and testable.
- **Singleton Database Connection**: A cached Mongoose connection ensures efficient database resource usage in serverless environments.
- **Instrumentation**: The `instrumentation.ts` file handles server-side startup tasks like database initialization and collection verification.

---

## 4. Data Models (Schema)

### Bible Data
- **BibleVersion**: Stores metadata about different versions (KJV, NIV, Hindi IRV, etc.).
- **Book**: Represents 66+ books of the Bible, linked to a specific version.
- **Chapter**: Groups verses within a book.
- **Verse**: The core unit of text, indexed for fast retrieval (Version + Book + Chapter + Number).

### User Data
- **User**: Core profile information, password (hashed), role-based access control (User/Admin).
- **Mandatory Signup Fields**: `name`, `email`, `password`.
- **Optional Signup Fields**: `country`, `preferredLanguage`, `preferredBibleVersion`.
- **Verification Flags**: `emailVerified` tracks the status of user email.
- **OTP**: A transient model with TTL (Time-To-Live) index for managing 6-digit verification codes.
- **Accounts**: Supports OAuth links (**Google**, **Facebook**, **X/Twitter**) via NextAuth.
- **Preferences**: Stores user-specific settings like theme (dark/light), font size, default language, and preferred bible version.

---

## 5. Authentication & Security
### Middleware Protection
The `middleware.ts` file acts as a gatekeeper:
1. **Authentication**: Redirects unauthenticated users to `/auth/signin` for protected routes (e.g., `/api/user/*`, dashboard).
2. **Localization**: Automatically detects and enforces the user's preferred locale from their session or browser headers.
3. **Public Routes**: Explicitly allows routes like `/api/health`, `/api/docs`, and landing pages.

### OTP Verification (Revised)
For credentials-based signup:
1. **Registration**: User provides Name, Email, Password (Mandatory) and Country, Language, Bible Version (Optional).
2. **OTP Generation**: A 6-digit code is generated and sent to the email.
3. **Verification**: User must call `/api/auth/verify` with the code to activate their account.

### Social Providers
The application supports the following OAuth providers:
- **Google**: Primary social login.
- **Facebook**: Integrated for wider reach.
- **X (Twitter)**: Added for community engagement.

### Encryption
- **Passwords**: Hashed using `bcryptjs` with a salt factor of 12.
- **Tokens**: JWT-based session management managed by NextAuth.

---

## 6. API & Integration
### Documentation
Interactive API docs are available at `/api-docs` (powered by Swagger UI). The documentation is dynamically generated from JSDoc comments in the API route files using `swagger-jsdoc`.

### Key Endpoints
- `/api/bible`: Bible content retrieval.
- `/api/auth/*`: Authentication handlers (sign-in, sign-out, session).
- `/api/upload`: Generic file upload endpoint integrated with Cloudinary.
- `/api/health`: System status and database connectivity check.

---

## 7. Caching Strategy
- **Redis**: Used for high-frequency data like Bible verses to minimize MongoDB load.
- **Next.js Cache**: Leverages the built-in fetch cache for static or infrequently changing content.

---

## 8. Internationalization (i18n)
The app uses `next-intl` for a comprehensive translation system:
- **Messages**: Located in `/messages/{locale}.json`.
- **Locale Detection**: Based on (1) User preference in DB, (2) Cookies, or (3) Browser headers.
- **Client/Server**: Supports both Server Component translation and Client-side hooks (`useTranslations`).

---

## 9. Development & Deployment
### Prerequisites
- Node.js 18+
- MongoDB Instance (Local or Atlas)
- Redis Instance (Optional)
- Cloudinary Account (For uploads)

### Initialization
1.  **Environment**: Create `.env.local` with `MONGODB_URI`, `NEXTAUTH_SECRET`, etc.
2.  **Packages**: `npm install`
3.  **Data Import**: Run `npx tsx scripts/import_bible.ts` to seed the database with Bible JSON data.
4.  **Start**: `npm run dev`

### Deployment
Optimized for deployment on **Vercel**. Ensure all environment variables are synced in the Vercel dashboard. The project includes `@vercel/analytics` and `@vercel/speed-insights` for production monitoring.
