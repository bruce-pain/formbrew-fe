<div align="center">

# Formbrew

**Create, publish, and manage forms using natural language prompts powered by AI.**

**Live:** [formbrew.vercel.app](https://formbrew.vercel.app) · [API Docs](https://ai-form-builder-be.onrender.com/v1/docs)

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?logo=shadcnui&logoColor=white)](https://ui.shadcn.com)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)

[Backend API →](https://github.com/bruce-pain/formbrew-be)

</div>

---

## Overview

Formbrew is a full-stack application that lets users create forms by simply describing them in plain English. An LLM generates the questions, title, and description automatically, and users can refine the result through natural conversation. No manual drag-and-drop builders needed.

The frontend is a **Next.js 16** (App Router) application written in **TypeScript**, styled with **Tailwind CSS v4** and **shadcn/ui**, and authenticated via **next-auth** with JWT. It consumes a FastAPI backend that handles form storage, AI generation, and response collection.

---

## Key Features

- **AI-Powered Form Generation**: Describe your form in natural language; the LLM generates questions, title, and description. Supports multi-turn conversational refinement: follow-up prompts modify the existing form contextually.
- **Smart Edit Tracking**: Manual edits made between AI prompts (title changes, question modifications, additions, deletions, reorders) are detected and included in subsequent LLM requests, keeping the AI aware of user changes.
- **Form CRUD**: Create, save, edit, publish/unpublish, and delete forms from the dashboard or form detail page.
- **Multiple Question Types**: Text inputs, single-select (radio), and multi-select (checkbox) with dynamic option management and per-question required toggles.
- **Drag-and-Drop Reordering**: Questions and select options can be reordered by dragging, with full keyboard support (`@dnd-kit`).
- **Public Form Submission**: Published forms get a shareable public link for anonymous responses with client-side validation and inline required errors.
- **Social Preview Cards**: Published forms render a dynamic OpenGraph preview image (form title, description, and question count) for link sharing, alongside a site-wide social preview for the landing page.
- **Landing Page**: Marketing site with a live brew demo, feature highlights, how-it-works, showcase, FAQ, and final CTA sections.
- **Response Analytics**: View aggregate answer summaries per question — including select distributions with counts and percentages — or browse individual responses with prev/next and go-to navigation.
- **JWT Authentication**: Email/password registration and login with automatic token refresh via next-auth credentials provider; stale sessions are cleaned up and redirected to login.
- **Google Sign-In**: One-click sign in or sign up with a Google account via the standard OAuth flow; the app exchanges the Google ID token for a Formbrew session automatically.
- **Dark/Light Theme**: Full theme support via `next-themes` with CSS custom properties and system preference detection.

---

## Tech Stack

| Technology                  | Purpose                                                       |
| --------------------------- | ------------------------------------------------------------- |
| **Next.js 16** (App Router) | React framework with server components and route groups       |
| **React 19**                | UI component library                                          |
| **TypeScript**              | Type safety across the entire codebase                        |
| **Tailwind CSS v4**         | Utility-first CSS with `@theme` custom properties             |
| **shadcn/ui**               | Accessible, composable UI primitives (Radix UI under the hood)|
| **@dnd-kit**                | Drag-and-drop sorting for questions and select options       |
| **lucide-react**            | Icon set                                                   |
| **sonner**                  | Toast notifications                                          |
| **next-auth** (v5 beta)     | Authentication with JWT credentials provider and auto-refresh |
| **next-themes**             | Dark/light theme switching                                    |
| **pnpm**                    | Fast, disk-efficient package manager                          |

---

## Architecture Highlights

### Route Groups (`src/app/`)

Three logical route groups separate concerns:

| Group      | Routes                          | Layout                 | Access                              |
| ---------- | ------------------------------- | ---------------------- | ----------------------------------- |
| `(app)`    | `/dashboard`, `/forms/*`        | Header + main content  | Authenticated only                  |
| `(auth)`   | `/login`, `/register`           | Minimal (theme toggle) | Redirects to dashboard if logged in |
| `(public)` | `/` (landing), `/forms/public/[id]`, `/forms/public/[id]/og` | Simple container    | No auth required                    |

### API Client (`src/lib/api.ts`)

- **`apiFetch(path, token?)`**: Authenticated requests with an explicit `accessToken`; the server-side dashboard also uses it via the session token.
- **`publicFetch(path)`**: Unauthenticated requests for public form viewing and submission.
- A shared `ApiError` class normalizes errors; on a `401` the client signs out and redirects to login (or `/api/auth/expired` server-side).

TypeScript types are generated from the backend's OpenAPI spec into `src/lib/api.types.ts`.

### AI Edit Tracking (`src/lib/editTracker.ts`)

Before each AI request, the current form state is compared to the previous snapshot. Detected changes (title/description edits, question modifications, add/remove operations, option changes, drag-and-drop reorders) are formatted as structured text and prepended to the user's LLM prompt, providing context-aware conversational refinement. Questions that the AI just added are badged as **New** in the editor.

### JWT Token Refresh (`src/auth.ts`)

When a session token is about to expire, the next-auth JWT callback automatically refreshes it via the backend's `/api/v1/auth/token/refresh` endpoint before returning the session. This keeps users signed in transparently.

### Social Preview (OG) (`src/app/opengraph-image.tsx`, `src/app/(public)/forms/public/[id]/og/route.tsx`)

Link previews are generated server-side with `next/og`'s `ImageResponse`. A shared `OgCard` component renders both the site-wide social preview (via the `opengraph-image.tsx` file convention) and a dynamic per-form card that fetches the published form and shows its title, description, and question count (cached with `revalidate = 3600`). Palette, fonts, and truncation helpers live in `src/lib/og.ts`.

### CSS Variable Theming (`src/app/globals.css`)

All colors are defined as CSS custom properties on `:root` and `.dark`, ensuring every component is theme-aware without hardcoded color values. Tailwind v4's `@theme` directive maps these into utility classes.

---

## Project Structure

```
src/
├── app/
│   ├── (app)/                    # Authenticated pages (header + main layout)
│   │   ├── dashboard/            # Form list with create/delete flow
│   │   ├── forms/
│   │   │   ├── new/              # AI-powered form builder
│   │   │   └── [id]/             # Form detail (summary + individual response tabs)
│   │   │       └── edit/         # Form editor
│   │   └── layout.tsx            # Authenticated layout (Header + SessionProvider)
│   ├── (auth)/                   # Login / register (redirects to dashboard if logged in)
│   │   ├── login/
│   │   └── register/
│   ├── (public)/                 # Landing page + public form submission
│   │   ├── page.tsx              # Landing page
│   │   ├── forms/public/[id]/    # Public form view + submission
│   │   │   ├── layout.tsx
│   │   │   ├── og/route.tsx      # Dynamic per-form OG image route
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api/auth/                 # NextAuth API route + expired-session handler
│   │   ├── [...nextauth]/route.ts
│   │   └── expired/route.ts
│   ├── globals.css               # CSS variables + Tailwind v4 theme
│   ├── layout.tsx                # Root layout (ThemeProvider, SessionProvider, Toaster)
│   └── opengraph-image.tsx       # Site-wide social preview image
├── components/
│   ├── landing/                  # Landing page sections
│   │   ├── hero.tsx              #   Hero with live brew demo
│   │   ├── brew-demo.tsx         #   Interactive AI generation demo
│   │   ├── features.tsx          #   Feature highlights
│   │   ├── how-it-works.tsx      #   Step-by-step walkthrough
│   │   ├── showcase.tsx          #   Example forms showcase
│   │   ├── faq.tsx               #   FAQ accordion
│   │   ├── final-cta.tsx         #   Final call-to-action
│   │   ├── landing-header.tsx    #   Marketing header
│   │   └── landing-footer.tsx    #   Marketing footer
│   ├── og/
│   │   └── OgCard.tsx            # Shared OG preview card artwork
│   ├── AiPromptBar.tsx           # Chat input for AI form generation
│   ├── FormCard.tsx              # Dashboard form card
│   ├── FormEditor.tsx            # Shared create/edit form editor
│   ├── FormPreview.tsx           # Live form preview before publishing
│   ├── FormQuestionCard.tsx      # Read-only question card for public forms
│   ├── Header.tsx                # Authenticated app header
│   ├── QuestionCard.tsx          # Editable, sortable question component
│   ├── QuestionList.tsx          # Drag-and-drop question list (@dnd-kit)
│   ├── ResponseAnswers.tsx       # Renders a single response's answers
│   ├── SaveIndicator.tsx         # Save status indicator
│   ├── SelectOptionList.tsx      # Sortable options with add/remove (@dnd-kit)
│   ├── SessionProvider.tsx       # next-auth session provider wrapper
│   ├── ShareButton.tsx           # Copy public link to clipboard
│   ├── TitleCard.tsx             # Editable title/description card
│   ├── ThemeToggle.tsx           # Dark/light toggle
│   └── ui/                       # shadcn/ui primitives
├── lib/
│   ├── api.ts                    # API fetch utilities + ApiError
│   ├── api.types.ts              # Generated OpenAPI types
│   ├── editTracker.ts            # AI edit diff detection
│   ├── form.ts                   # Form API client functions
│   ├── og.ts                     # OG palette, fonts, and site URL helper
│   ├── public-form.ts            # Public form + submit API clients
│   ├── response.ts               # Responses API client
│   └── utils.ts                  # cn() class-name helper
├── types/
│   └── next-auth.d.ts            # next-auth module augmentation
├── auth.ts                       # NextAuth configuration
└── proxy.ts                      # Middleware route protection
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **pnpm**: install via `npm install -g pnpm` or [corepack](https://nodejs.org/api/corepack.html)
- (Optional) A local instance of the [Formbrew backend](https://github.com/bruce-pain/formbrew-be) — the app works with the deployed API out of the box

### Environment Variables

Create `.env.local` in the project root:

```env
AUTH_SECRET=<generate with: openssl rand -base64 32>
AUTH_GOOGLE_ID=<Google OAuth client ID>
AUTH_GOOGLE_SECRET=<Google OAuth client secret>
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` enable the "Continue with Google"
> button on the login and register pages. Create an OAuth 2.0 Web client in
> the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
> and add `http://localhost:3000/api/auth/callback/google` to its authorized
> redirect URIs (use your deployed domain in production).
>
> `NEXT_PUBLIC_SITE_URL` is used to build the base URL for social-preview
> (`og:image`) metadata. In production, set it to your deployed domain (e.g.
> `https://formbrew.vercel.app`).

### Install & Run

```bash
pnpm install
pnpm dev        # Start dev server (Turbopack) on http://localhost:3000
pnpm build      # Production build
pnpm start      # Start production server
pnpm lint       # Run ESLint
```

---

## Related Projects

| Project                                                          | Description                                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [Formbrew (frontend)](https://github.com/bruce-pain/formbrew-fe) | Next.js frontend deployed at [formbrew.vercel.app](https://formbrew.vercel.app) |
| [Formbrew API](https://github.com/bruce-pain/formbrew-be) | FastAPI backend with LLM integration, form CRUD, authentication, and response storage — deployed at [ai-form-builder-be.onrender.com](https://ai-form-builder-be.onrender.com) |
