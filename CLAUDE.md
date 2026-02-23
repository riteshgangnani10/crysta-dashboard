# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Crysta IVF Dashboard — a Next.js 16 analytics dashboard for an IVF chatbot. It displays user leads, chat histories, and analytics sourced from a Supabase (PostgreSQL) backend with real-time subscriptions.

## Commands

- `npm run dev` — Start dev server (port 3000)
- `npm run build` — Production build
- `npm run start` — Run production server
- `npm run lint` — Run ESLint

No test framework is configured.

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router) with React 19, TypeScript 5
- **Database**: Supabase (PostgreSQL) — direct client queries, no ORM
- **Styling**: Tailwind CSS 4 with CSS custom properties for theming
- **UI**: Radix UI primitives, Headless UI, Heroicons, Lucide React
- **Charts**: Recharts
- **Auth**: Simple client-side auth via `SimpleAuth` class in `src/lib/auth.ts` (demo/hardcoded credentials). NextAuth with Supabase adapter is wired but optional for production.

### Path Alias
`@/*` maps to `./src/*` (configured in tsconfig.json).

### Routing & Layout
All pages live under `src/app/`. The root page (`/`) is the login screen. Protected pages are under `src/app/dashboard/` with a shared layout that includes the sidebar (`src/components/layout/Sidebar.tsx`). Pages are: overview, users, chats, analytics, settings.

### Data Flow
- **No API routes** — pages call Supabase directly via helpers in `src/lib/supabase.ts`.
- Expensive queries use an in-memory cache with 5-minute TTL.
- Server-side pagination (1000-record batches) for large datasets.
- Real-time updates via Supabase Realtime channels, with 30-second polling fallback.

### Key Modules
| Path | Purpose |
|---|---|
| `src/lib/supabase.ts` | Supabase client init, all DB query functions, caching |
| `src/lib/auth.ts` | SimpleAuth class, session stored in localStorage |
| `src/lib/analytics.ts` | Stats calculations, aggregation logic |
| `src/lib/dataTransformers.ts` | DB row → display type mappers |
| `src/lib/utils.ts` | `cn()` helper (clsx + tailwind-merge) |
| `src/contexts/AuthContext.tsx` | Auth state provider wrapping dashboard |
| `src/hooks/useRealtime.ts` | Supabase real-time subscription hooks |

### Database Tables
- **`users`** — Lead records (phone, name, city, lead_status, appointment info)
- **`n8n_chat_histories`** — Chat messages with `session_id` and JSON `message` field

### Component Conventions
- UI primitives in `src/components/ui/` use `class-variance-authority` for variants (e.g., Button: primary/secondary/outline/ghost/danger; Card: default/gradient/glass).
- Feature components grouped by domain: `dashboard/`, `users/`, `chats/`, `auth/`, `layout/`.
- Most page components are client components (`'use client'`).
- Search inputs use 300ms debounce.

### Environment Variables
Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-side only)
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — NextAuth config (if using production auth)
