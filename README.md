# dogmai-cohort

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5-2d3748?logo=prisma)

A full-stack cohort management platform built for dogm.ai's coding bootcamp. Admins, staff, and students each get their own dashboard for curriculum, attendance, assignments, grading, announcements, and messaging. Built with Next.js (App Router), TypeScript, Prisma on SQLite / Turso (libSQL), and Tailwind CSS.

## Overview

dogmai-cohort powers the internal operations of dogm.ai bootcamps. It supports three user roles — Admin, Staff, and Student — each with their own dashboard, workflows, and permissions.

## Features

### Admin
- Manage cohorts, modules, and curriculum (lessons, drag-and-drop ordering)
- User and enrollment management, staff assignments
- Announcements, notifications, and calendar
- Grading oversight and attendance tracking
- System settings
- Analytics and presence monitoring

### Staff
- View and grade student assignments
- Track attendance, class sessions, and cohort progress
- Cohort file sharing (UploadThing)
- Manage announcements and calendar
- Bulk operations: CSV student import, grade / attendance / student exports, batch grading
- Analytics

### Student
- Access lessons and curriculum, with per-lesson progress
- Submit assignments and track progress and submissions
- View announcements and calendar
- Direct and group messaging (reactions, pins, search, unread counts)

### Platform
- JWT auth in an HttpOnly cookie, bcrypt password hashing, CSRF token endpoint, email verification, password reset, forced password change
- Transactional emails built with React Email (welcome, verification, password reset, grade, assignment reminder, announcement, message, weekly digest)
- Command palette, light/dark theme

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Database | Prisma 5 ORM — SQLite locally, Turso (libSQL) in production via `@prisma/adapter-libsql` |
| Auth | JWT (`jsonwebtoken`), bcryptjs |
| Styling | Tailwind CSS 4, shadcn/ui (Radix UI) |
| State / data | Zustand, SWR, Zod |
| Email | Nodemailer (SMTP), React Email; Mailpit for local testing |
| File Uploads | UploadThing |
| UI extras | FullCalendar, Recharts, dnd-kit, cmdk |
| Testing | Vitest, Testing Library, jsdom |
| Linting | ESLint (`eslint-config-next`) |

## Getting Started

### Prerequisites

- Node.js 20+
- Optional: Docker (for the Mailpit local mail server)
- Optional: a [Turso](https://turso.tech) database for production

### Installation

```bash
npm install          # also runs `prisma generate` (postinstall)
```

### Environment Variables

Copy `.env.example` to `.env` and fill in the values. Key variables:

```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL="file:./prisma/dev.db"    # local SQLite
# TURSO_DATABASE_URL=                  # production (Turso); used when both are set
# TURSO_AUTH_TOKEN=
JWT_SECRET=                            # 64+ chars required in production
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
UPLOADTHING_TOKEN=
```

When `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are both set, the app connects to Turso; otherwise it falls back to the local SQLite file (`src/lib/db.ts`).

### Database Setup

The project uses `prisma db push` (there is no migration history):

```bash
npm run db:push      # create / sync the SQLite schema
npm run db:seed      # seed demo data (prisma/seed.ts)
npm run db:reset     # force-reset the schema and re-seed
npm run db:studio    # browse data in Prisma Studio
```

For Turso, with `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` set:

```bash
npx tsx prisma/push-to-turso.ts   # create tables
npx tsx prisma/seed-turso.ts      # seed demo data
```

The seed scripts create demo accounts with well-known passwords (see `tests/TEST_ACCOUNTS.md`). They are for local development only — never seed a publicly reachable deployment with them.

### Local Email

```bash
docker compose up -d mailpit     # SMTP on :1025, web UI on http://localhost:8025
npm run test:email               # send test emails (scripts/test-email.ts)
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build        # prisma generate && next build
npm start
```

## Testing

```bash
npm test             # Vitest in watch mode
npm run test:run     # single run
npm run test:coverage
npm run test:ui
npm run test:api     # API test runner against a running dev server (tests/api-test-runner.ts)
npm run test:quick   # quick smoke test (tests/quick-test.ts)
npm run lint
```

Vitest specs live in `tests/` (`api/`, `components/`, `integration/`, `lib/`, `stores/`, `utils/`).

## Project Structure

```
src/
├── app/
│   ├── admin/        # Admin dashboard: cohorts, curriculum, grading, users, settings
│   ├── staff/        # Staff dashboard: assignments, attendance, grading, bulk, analytics
│   ├── student/      # Student portal: lessons, assignments, progress, calendar
│   ├── messages/     # Direct and group messaging
│   ├── login/ signup/ profile/ settings/
│   └── api/          # 74 route handlers (auth, cohorts, lessons, submissions, bulk, …)
├── components/       # Shared UI (shadcn/ui in components/ui), layout, calendar, messages
├── contexts/         # Auth context
├── emails/           # React Email templates
├── hooks/            # SWR fetcher, presence, message notifications
├── lib/              # Auth, DB client, validation, email, uploads, CSV parsing
├── stores/           # Zustand stores
└── proxy.ts          # Next.js request proxy (security headers, CORS, route matching)

prisma/
├── schema.prisma     # 26 models
├── seed.ts           # local demo data
└── *-turso.ts        # Turso schema push / seed / connection test

docs/                 # Audit report and UX analysis / implementation guide
tests/                # Vitest specs and API test runners
```

## License

The code is released under the [MIT License](LICENSE). MIT covers the code; the DOGM.AI name identifies the project.

The Raveo variable font in `public/fonts/variable/` is third-party and is not covered by this license.
