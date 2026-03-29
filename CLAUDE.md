# CLAUDE.md — English Master

English learning app: GPT-4o sentence analysis + TTS audio + SM-2 spaced repetition review.

**Current version: v0.1** | [Changelog](docs/specs/CHANGELOG.md) | [Backlog](docs/specs/BACKLOG.md)

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
- **Components:** All client-side, hooks-only state, vanilla CSS, `fetch()` to internal API.

## Commands

```bash
npm run dev      # Dev server :3000
npm run build    # Production build
npm run lint     # ESLint
npm run test     # Vitest
```

## Env Vars

`OPENAI_API_KEY` (required) · `DATABASE_URL` (pg, optional) · `DATASTORE_PROVIDER` (optional)

## Iteration Workflow

1. **Propose** — User describes new needs
2. **Discuss** — Clarify scope, break into tasks, agree on version number (v0.2, v0.3…)
3. **Spec** — Write `docs/specs/vX.Y.md` with requirements + implementation plan
4. **Branch** — Create `feature/vX.Y-short-name`, implement
5. **Update** — Append to `docs/specs/CHANGELOG.md`
6. **Review & Merge** — PR → main

Unplanned ideas go to `docs/specs/BACKLOG.md`.
