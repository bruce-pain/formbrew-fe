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

The frontend is a **Next.js 16** (App Router) application written in **TypeScript**, styled with **Tailwind CSS v4** and **shadcn/ui**, and authenticated via **next-auth**. It consumes a FastAPI backend that handles form storage, AI generation, and response collection.

---

## Key Features

- **AI-Powered Form Generation**: Describe your form in plain English and the LLM builds it — with multi-turn conversation to refine questions contextually.
- **Form CRUD & Publishing**: Create, save, edit, publish/unpublish, and delete forms. Published forms get a shareable public link for anonymous submissions.
- **Flexible Question Editor**: Text, single-select (radio), and multi-select (checkbox) questions with required toggles and drag-and-drop reordering (fully keyboard-accessible).
- **Response Analytics**: View aggregate answer summaries per question — including select distributions with counts and percentages — or browse individual responses.
- **Social Previews**: Published forms render a dynamic OpenGraph image (title, description, question count) for eye-catching link sharing.
- **Authentication**: Email/password with auto-refreshing JWT sessions, plus one-click Google Sign-In.
- **Dark/Light Theme**: Full theming via `next-themes` with system preference detection.

---

## Tech Stack

**Next.js 16** (App Router) · **React 19** · **TypeScript** · **Tailwind CSS v4** · **shadcn/ui** · **@dnd-kit** · **next-auth** (v5 beta) · **next-themes** · **sonner** · **pnpm**

---

## Project Structure

```
src/
├── app/
│   ├── (app)/          # Authenticated pages (dashboard, form editor, detail)
│   ├── (auth)/         # Login / register (redirects to dashboard if logged in)
│   ├── (public)/       # Landing page + public form view & submission
│   └── api/auth/       # NextAuth route + expired-session handler
├── components/         # UI components (landing, editor, OG cards, shadcn primitives)
├── lib/                # API clients, generated OpenAPI types, utilities
├── types/              # TypeScript module augmentation
├── auth.ts             # NextAuth configuration
└── proxy.ts            # Route protection middleware
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
