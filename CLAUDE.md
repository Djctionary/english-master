# CLAUDE.md — English Master

English learning app: GPT-4o sentence analysis + TTS audio + SM-2 spaced repetition review.

**Current version: v0.5** | [Changelog](docs/specs/CHANGELOG.md) | [Backlog](docs/specs/BACKLOG.md)

## Tech Stack

Next.js 15 (App Router) · React 19 · TypeScript 5 (strict) · SQLite / PostgreSQL · OpenAI GPT-4o · Vitest · ESLint 9

## Structure

```
app/api/         — analyze, sentences, review, audio endpoints
app/learn/       — learning page
app/review/      — review page
components/      — all "use client" (LearnWorkspace, SentenceLibrary, DetailView, AudioPlayer, etc.)
lib/             — db.ts, sentence-store.ts, review.ts, openai.ts, types.ts
__tests__/       — api/, lib/, properties/ (fast-check)
data/            — sentences.db + audio/
docs/specs/      — CHANGELOG.md, BACKLOG.md, version specs
```

## Key Concepts

- **SM-2 Review:** 8 stages (8h → 1d → 3d → 7d → 14d → 30d → 60d → 120d). Full +1, partial −1, missed → reset.  Logic in `lib/review.ts`.
- **DB:** `sentences` + `sentence_review_states` tables. Provider: `DATASTORE_PROVIDER` → `DATABASE_URL` (pg) → SQLite. Auto-migrations in `lib/db.ts`.
- **Components:** All client-side, hooks-only state, CSS custom properties (design tokens in `globals.css`), `fetch()` to internal API.
- **Design System:** "Calm Education" style — blue primary (`#2563EB`), Inter font, 8px spacing scale. All colors/sizes use CSS variables (`var(--color-*)`, `var(--text-*)`, `var(--space-*)`). See `docs/specs/v0.4.md` for full token reference.
- **Theming:** Light/dark mode via `data-theme` attribute on `<html>`. Dark tokens defined in `[data-theme="dark"]` in `globals.css`. `ThemeToggle` component in nav. Preference stored in `localStorage("theme")`, defaults to system `prefers-color-scheme`.

## Commands

```bash
npm run dev      # Dev server :3000
npm run build    # Production build
npm run lint     # ESLint
npm run test     # Vitest
```

## Env Vars

`OPENAI_API_KEY` (required) · `ELEVENLABS_API_KEY` (required, TTS) · `DATABASE_URL` (pg, optional) · `DATASTORE_PROVIDER` (optional) · `ELEVENLABS_VOICE_ID` (optional)

## Iteration Workflow

1. **Propose** — User describes new needs
2. **Discuss** — Clarify scope, break into tasks, agree on version number (v0.2, v0.3…)
3. **Spec** — Write `docs/specs/vX.Y.md` with requirements + implementation plan
4. **Branch** — Create `feature/vX.Y-short-name`, implement
5. **Update** — Append to `docs/specs/CHANGELOG.md`
6. **Review & Merge** — PR → main

Unplanned ideas go to `docs/specs/BACKLOG.md`.
