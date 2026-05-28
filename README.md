# Job Tracker — AI-Powered Job Application Assistant

> Full-stack web application that centralizes your job search and uses Claude AI to generate tailored CVs, cover letters, and ATS compatibility reports in seconds.

---

## Overview

Job Tracker combines a traditional application management system with a generative AI layer built on the Anthropic Claude API. Instead of manually tailoring your resume for every position, the app reads your uploaded PDF CV, analyzes a job offer (via URL or pasted text), and produces a personalized document package — CV profile, cover letter, and application email — in parallel. A built-in ATS analyzer scores your compatibility against the offer and gives you actionable recommendations to improve it.

---

## Key Features

### Application Management
- **Kanban-style tracker** — manage applications across statuses: Aplicado, En proceso, Entrevista, Oferta, Rechazado
- **Detail view** — per-application notes, reminders, salary range, job URL, and status timeline
- **Dashboard** — real-time metrics (total applications, last 30 days, interviews, response rate) with bar and pie charts powered by Recharts
- **Automated reminders** — set follow-up reminders at 3 and 7 days with one click after applying

### AI Apply Wizard (3 steps)

**Step 1 — Extract job offer**
Paste a URL or raw text; Claude strips it down to structured JSON: position, company, tech stack, requirements, responsibilities, modality, contract type, and years of experience.

**Step 2 — Select your CV**
Upload a PDF (auto-parsed on upload), pick an existing parsed CV from a card grid, or trigger parsing on an unanalyzed file. Choose tone (formal / semiformal / dinámico), language (ES / EN), remote preference, and immediate availability.

**Step 3 — Get your document package**
Four Claude calls run in parallel via `Promise.allSettled`:
- Personalized CV profile (summary + action-verb bullets + matching skills)
- Cover letter (3-paragraph structure, first person, tone-matched)
- Application email (subject + body, max 150 words, JSON-structured)
- Full ATS compatibility report

### ATS Compatibility Analyzer

Weighted scoring across 5 categories:

| Category | Weight | What it measures |
|---|---|---|
| Tech Stack | 35% | Matched vs. missing technologies with explicit arrays |
| Experience | 25% | Required years vs. candidate years |
| Role Alignment | 20% | Seniority fit and responsibility overlap |
| Education | 10% | Degree and field relevance |
| Soft Skills | 10% | Inferred from responsibilities and achievements |

- **Animated score circle** — SVG with cubic ease-out animation from 0 to final score; re-animates from old → new score after regeneration
- **Per-category bars** with click-to-expand details showing matched/missing items
- **Keyword gap analysis** — found vs. missing ATS keywords
- **Prioritized recommendations** — up to 6 cards ranked Alta / Media / Baja with concrete implementation examples
- **Strengths highlight** — 3-4 candidate strengths specific to this role

### Interactive Skill Confirmation Flow

For each missing ATS keyword, the user selects their actual proficiency level:

```
┌─────────────────────────────────────────────────────┐
│ Kubernetes                            +6 pts est.   │
│ ○ No lo conozco  ○ Básico  ● Intermedio  ○ Avanzado │
└─────────────────────────────────────────────────────┘
```

- Live summary: skills to add with their level, skills omitted
- Estimated score delta calculated from AI recommendation impacts
- **"Regenerar CV con mis skills confirmados"** — sends confirmed skills to Claude with honest proficiency context; score circle animates from old → new with before/after delta display
- Tooltip on every level button: "Solo agrega niveles que puedas demostrar en una entrevista técnica"
- Button disabled (with tooltip) until at least one skill is confirmed beyond "No lo conozco"

### CV Generator (Harvard Format)
- **Parse CV** — upload PDF; Claude reads it via document block API and returns structured JSON (experience, education, skills, certifications, projects); saved as JSONB
- **Generate Harvard CV** — full CV adapted to a specific job offer with action verbs, quantified bullets (max 4 per role), skills ranked by offer relevance
- **Export** — download as PDF (`@react-pdf/renderer`, A4, Helvetica) or copy as plain text
- **Harvard Cover Letter** — structured `{ subject, salutation, body, closing, signature }` with PDF export
- **Tabs**: Mis CVs · Generar CV · CVs Generados
- **"Optimizar CV automáticamente"** — feeds all high/medium-priority recommendations back to Claude in a single call

### Job Search
- AI-simulated job search across LinkedIn, Indeed, InfoJobs, Computrabajo, and Glassdoor
- Returns modality, salary range, description, and platform for each result

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 16 (App Router), React 19 | Server Components + Route Handlers for clean AI/auth separation |
| Language | TypeScript 5 (strict) | End-to-end type safety including Supabase schema |
| Styling | Tailwind CSS 4 | Utility-first, no runtime CSS |
| AI | Anthropic Claude API (`claude-haiku-4-5`) | Fast, cost-efficient structured output; native document block for PDFs |
| Backend / Auth | Supabase (`@supabase/ssr`) | PostgreSQL + RLS + Storage + SSR-safe auth cookies |
| Server State | TanStack Query v5 | Declarative caching, optimistic updates, query invalidation |
| Client State | Zustand v5 | Minimal global UI state |
| Forms | React Hook Form v7 + Zod v4 | Type-safe validation without re-renders |
| PDF Generation | `@react-pdf/renderer` v4 | Harvard-format PDF in browser, SSR-bypassed via lazy import |
| Charts | Recharts v3 | Bar + pie charts for application analytics |
| Toasts | Sonner v2 | Non-blocking notifications |
| Icons | Lucide React | Consistent, tree-shakeable icon set |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Next.js App Router                     │
│                                                         │
│  Server Components          Route Handlers              │
│  ┌──────────────────┐       ┌─────────────────────┐    │
│  │ dashboard/page   │       │ /api/ai/extract      │    │
│  │ (Supabase server │       │ /api/ai/generate-all │    │
│  │  cookie auth)    │       │ /api/ai/generate-cv  │    │
│  └──────────────────┘       │ /api/ai/parse-cv     │    │
│                             │ /api/ai/generate-    │    │
│  Client Components          │   cover-letter       │    │
│  ┌──────────────────┐       │ /api/ai/search       │    │
│  │ Apply Wizard     │       └──────────┬──────────┘    │
│  │ MatchReport      │                  │                 │
│  │ CvPreview        │         server-side only          │
│  │ TanStack Query   │                  ▼                 │
│  └──────────────────┘       ┌──────────────────────┐   │
│                             │  Anthropic Claude API │   │
│                             │  ANTHROPIC_API_KEY    │   │
│                             │  (env only, no NEXT_  │   │
│                             │   PUBLIC_ prefix)     │   │
└─────────────────────────────└──────────────────────┘   │
                                         │
              ┌──────────────────────────┘
              ▼
┌─────────────────────────────────────────────────────────┐
│                       Supabase                           │
│                                                         │
│  PostgreSQL + RLS         Auth          Storage         │
│  ├── applications         └── SSR       └── cvs/        │
│  ├── notes                    cookies       {uid}/*.pdf  │
│  ├── reminders                                          │
│  ├── cv_files (+ jsonb)                                 │
│  └── generated_cvs (+ jsonb)                            │
└─────────────────────────────────────────────────────────┘
```

### Key Design Decisions

**All AI calls are server-side.** `ANTHROPIC_API_KEY` lives only in `process.env` (no `NEXT_PUBLIC_` prefix). Route Handlers authenticate the user via Supabase SSR cookies before calling Claude — the API key never reaches the browser.

**Parallel generation with `Promise.allSettled`.** The main `/api/ai/generate-all` endpoint runs 4 Claude calls simultaneously. A single failure does not block the rest — the frontend receives `null` for failed sections and renders gracefully.

**PDF generation is lazily imported client-side.** `@react-pdf/renderer` is incompatible with SSR. Download handlers use dynamic `import()` inside click callbacks, keeping the library out of the server bundle. `next.config.ts` lists it under `serverExternalPackages`.

**JSON extraction with regex fallback.** All Claude prompts request JSON-only responses via a system message. Every parser runs `text.match(/\{[\s\S]*\}/)` as a fallback in case Claude includes surrounding text despite the instruction.

**TanStack Query for all mutations.** Uploads, parses, generates, and deletes go through `useMutation` hooks in `src/hooks/`. On success, targeted `queryClient.invalidateQueries()` calls keep the UI consistent without manual state management.

---

## AI Integration Details

### Claude API Usage Pattern

All routes use a singleton client:

```typescript
// src/lib/anthropic.ts
import Anthropic from '@anthropic-ai/sdk';
export const client = new Anthropic(); // reads ANTHROPIC_API_KEY automatically
```

Model: `claude-haiku-4-5` — chosen for speed and cost efficiency on structured-output tasks. Max tokens: 2000 (3000 for full CV generation).

### CV PDF Parsing (`/api/ai/parse-cv`)

Downloads the PDF from Supabase Storage, base64-encodes it in memory, and sends it to Claude via the document content block:

```typescript
messages: [{
  role: 'user',
  content: [
    {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64Data }
    },
    { type: 'text', text: PARSE_PROMPT }
  ]
}]
```

Returns a `ParsedCvContent` object (name, experience with responsibilities/achievements, education, skills, certifications, projects). Saved as JSONB to `cv_files.extracted_content`.

### ATS Analysis Prompt Design

The `generateMatchAnalysis` function sends the full parsed CV JSON alongside the job offer and instructs Claude to behave like a professional ATS evaluator:

- Explicit weight per category enforced in the prompt schema
- `level` derived from `overall_score` threshold (≥70 Alto, 40-69 Medio, <40 Bajo)
- Recommendations limited to 6, ordered by priority
- `impact` field gives a concrete point estimate per recommendation (used client-side to animate the score delta after skill confirmation)

### Confirmed Skills Injection

When a user selects proficiency levels for missing skills, the route appends to the Harvard CV prompt:

```
El candidato confirma conocer estas tecnologías adicionales:
- Kubernetes: nivel intermedio
- Terraform: nivel básico

Agrégalas naturalmente en la sección de habilidades técnicas y menciónalas
donde sea relevante en la experiencia. Ser honesto con el nivel indicado.
```

Claude receives the level context and adapts bullets accordingly — no overclaiming.

---

## Database Schema

```sql
create table applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  position      text not null,
  company       text not null,
  url           text,
  status        text not null,  -- Aplicado | En proceso | Entrevista | Oferta | Rechazado
  applied_at    date not null,
  salary_range  text,
  location      text,
  description   text
);

create table notes (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid references applications(id) on delete cascade,
  content         text not null,
  created_at      timestamptz default now()
);

create table reminders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users not null,
  application_id  uuid references applications(id) on delete set null,
  title           text not null,
  description     text,
  due_at          timestamptz not null,
  done            boolean default false
);

create table cv_files (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users not null,
  name              text not null,
  path              text not null,        -- Supabase Storage path: {uid}/{timestamp}-{filename}
  size              bigint,
  is_parsed         boolean default false,
  extracted_content jsonb,                -- ParsedCvContent JSON
  created_at        timestamptz default now()
);

create table generated_cvs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  cv_file_id  uuid references cv_files(id) on delete set null,
  position    text,
  company     text,
  type        text,   -- 'cv' | 'cover_letter'
  language    text,   -- 'es' | 'en'
  content     jsonb,  -- GeneratedCvData | CoverLetterData
  created_at  timestamptz default now()
);

-- RLS on every table
alter table applications   enable row level security;
alter table notes          enable row level security;
alter table reminders      enable row level security;
alter table cv_files       enable row level security;
alter table generated_cvs  enable row level security;

create policy "Users manage own data" on applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- (same policy pattern for all tables)
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase project (free tier)
- Anthropic API key

### Environment Variables

Create `.env.local` at the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Anthropic — server-side only, never exposed to the client
ANTHROPIC_API_KEY=sk-ant-...
```

### Database Setup

1. Run the SQL schema above in the Supabase SQL editor.
2. Create the storage bucket:

```sql
insert into storage.buckets (id, name, public) values ('cvs', 'cvs', false);

create policy "Users upload own CVs" on storage.objects
  for insert with check (auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users read own CVs" on storage.objects
  for select using (auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users delete own CVs" on storage.objects
  for delete using (auth.uid()::text = (storage.foldername(name))[1]);
```

### Install and Run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up with email — Supabase Auth handles session management via SSR cookies (HTTP-only, no localStorage exposure).

### Build for Production

```bash
pnpm build
pnpm start
```

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/               # Email auth page
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + QueryClientProvider
│   │   ├── dashboard/              # Metrics + charts (Server Component)
│   │   ├── applications/           # Tracker list + [id] detail view
│   │   ├── apply/                  # 3-step AI wizard
│   │   │   ├── _step1.tsx          # Job extraction (URL or text)
│   │   │   ├── _step2.tsx          # CV selection, tone, language
│   │   │   ├── _step3.tsx          # Results + MatchReport + Harvard CV
│   │   │   └── page.tsx            # Wizard orchestrator
│   │   ├── cv/                     # CV manager (3 tabs)
│   │   ├── search/                 # AI job search
│   │   └── reminders/              # Reminder manager
│   └── api/ai/
│       ├── extract/                # Job offer → ExtractedJob JSON
│       ├── generate-all/           # CV profile + letter + email + ATS (parallel)
│       ├── generate-cv/            # Harvard CV (supports confirmed_skills)
│       ├── generate-cover-letter/  # Harvard cover letter
│       ├── parse-cv/               # PDF → ParsedCvContent (document block API)
│       └── search/                 # AI job search simulation
│
├── components/
│   ├── cv/
│   │   ├── CvPdfDocument.tsx       # @react-pdf/renderer Harvard CV (A4, Helvetica)
│   │   ├── CoverLetterPdfDocument.tsx
│   │   ├── CvPreview.tsx           # HTML preview + lazy PDF download + text copy
│   │   └── CoverLetterPreview.tsx
│   ├── features/
│   │   ├── apply/MatchReport.tsx   # ATS report + animated circle + skill confirmation
│   │   └── charts/                 # Recharts bar + pie
│   └── ui/                         # Button, Card, Modal, Badge, Input, Select…
│
├── hooks/
│   ├── use-applications.ts         # CRUD mutations + queries
│   ├── use-cv-files.ts             # Upload (returns {id, path}) / delete
│   ├── use-cv-generator.ts         # useParseCv / useGenerateCv / useGenerateCoverLetter
│   ├── use-reminders.ts
│   └── use-notes.ts
│
├── lib/
│   ├── anthropic.ts                # Singleton Anthropic client
│   ├── constants.ts                # AI_MODEL, status colors, pie colors
│   └── supabase/                   # server.ts / client.ts / middleware.ts
│
└── types/
    ├── database.ts                 # Supabase table types + Database schema
    └── index.ts                    # ExtractedJob, MatchAnalysis, GenerateAllResult…
```

---

## Security

| Concern | Implementation |
|---|---|
| API key exposure | `ANTHROPIC_API_KEY` only in `process.env`, no `NEXT_PUBLIC_` prefix; never sent to client |
| Data isolation | Supabase RLS: `auth.uid() = user_id` on all tables, enforced at DB level |
| File access | Storage policies scope access to `{user_id}/*` prefix only |
| Auth surface | SSR cookies (HTTP-only) via `@supabase/ssr` — no JWT in localStorage |
| Prompt injection | User text treated as data, never as instructions; system message enforces JSON-only output |
| CORS | Next.js Route Handlers are same-origin; no external API exposure |

---

## What This Project Demonstrates

| Skill Area | Specifics |
|---|---|
| **Next.js App Router** | Server Components, Client Components, Route Handlers, middleware, nested layouts, dynamic routes |
| **TypeScript** | Discriminated unions, generic types, `satisfies`, full type coverage from DB schema to UI props |
| **Claude API** | Document blocks (PDF parsing), JSON mode, parallel calls with `Promise.allSettled`, prompt engineering for structured output |
| **Supabase** | SSR auth (cookie-based), Row Level Security, Storage with scoped policies, JSONB columns |
| **Complex UI state** | Multi-step wizard, animated SVG (requestAnimationFrame + cubic ease-out), accordion, modals, real-time derived state |
| **Performance** | Parallel AI calls, lazy PDF imports, TanStack Query cache invalidation |
| **Security** | Server-only secrets, RLS, scoped storage, no injection surface |
| **PDF generation** | `@react-pdf/renderer` with SSR bypass strategy and client-side lazy loading |

---

## Roadmap

- [ ] Real-time job scraping — actual web scraping instead of AI knowledge simulation
- [ ] LinkedIn OAuth — auto-fill profile from LinkedIn data
- [ ] Interview prep — generate likely interview questions per role with model answers
- [ ] Salary negotiation coach — AI advice based on offer, location, and candidate experience
- [ ] Application analytics — weekly trends, best platforms, response rate by role type
- [ ] Multi-language CV — generate ES and EN versions simultaneously
- [ ] Browser extension — extract job offers directly from job boards with one click
- [ ] Re-run ATS analysis after skill confirmation — full Claude re-evaluation instead of client-side delta estimation
