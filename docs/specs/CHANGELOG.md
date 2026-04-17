# Changelog

## v1.2-alpha — Audio Persistence Fix + TTS Upgrade (17/04/2026)

Critical fix: audio was being regenerated via ElevenLabs on nearly every playback
on Vercel because MP3s lived on the ephemeral `/tmp` filesystem. Audio is now
stored as a BLOB/BYTEA in the database and survives cold starts.

- **Audio stored in database:** new `audio_data` column (BLOB on SQLite, BYTEA on
  Postgres). Binary persists alongside the sentence record, no filesystem dependency
- **`generateAudio()` is now pure:** returns `{ filename, data: Buffer }`; the
  caller decides how to persist. No more `/tmp` writes
- **`/api/audio/[filename]` serves from the DB:** direct BLOB streaming. For legacy
  rows without a binary, regenerates once via ElevenLabs and writes back — so each
  sentence costs one TTS call total, forever
- **TTS model upgrade:** `eleven_turbo_v2_5` → **`eleven_multilingual_v2`**
- **Default voice:** Sarah → **`DXFkLCBUTmvXpp2QwZjA`**
- **New env vars:** `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL_ID` for overrides
- **HTTP caching:** audio responses set `Cache-Control: public, max-age=31536000,
  immutable` since filenames are content-addressed (SHA-256 of the sentence)
- **Removed:** dead `getSentenceByAudioFilename` lookups; the `/tmp` fallback path

---

## v1.1-alpha — UI Refinement (13/04/2026)

Frontend-only visual refresh — no backend changes.

- **Multilingual background:** "Sentence is all you need" in 20 languages scrolls as animated background rows on the landing page, creating cultural texture and depth
- **Landing page simplified:** removed comparison table, tighter layout with stronger visual hierarchy, staggered entrance animations
- **Auth modal branded:** gradient header bar with app name and tagline, segmented-control tab switcher replacing underline tabs
- **User avatar:** circle avatar with gradient and first-letter initial replaces "Hi, {username}" text in nav
- **Page headers unified:** consistent `.page-header` layout for Learn and Review pages with vertical dividers separating user area, nav links, and theme toggle
- **Step cards:** gradient number badges replacing flat blue circles
- **CTA card:** subtle gradient background for the alpha call-to-action
- **New CSS:** `fadeInUp`, `scrollLeft`, `scrollRight` keyframe animations; `.user-avatar`, `.page-header`, `.auth-modal-header` component classes

---

## v1.0-alpha — User Management + Landing Page (10/04/2026)

Multi-user authentication, per-user data isolation, and a public landing page.

- **User auth:** username/password registration and login, bcrypt hashing, JWT in httpOnly cookie (7-day expiry)
- **Per-user data:** `users` table, `user_id` column on sentences and review states — each user sees only their own data
- **Data migration:** existing sentences assigned to initial user `vergil`
- **100-user cap:** registration closes at 100 users, remaining spots shown on landing page
- **Route protection:** Next.js middleware redirects unauthenticated users; API returns 401
- **Landing page:** hero ("Sentence is all you need"), advantage comparison table, 4-step how-it-works flow, alpha badge
- **Auth modal:** floating login/register dialog with tab switching
- **Username display:** "Hi, {username}" + logout button in learn/review nav
- **Encouragement:** toast message after 10 reviews in a session, personalized session complete message
- **New files:** `lib/auth.ts`, `lib/request-user.ts`, `middleware.ts`, `components/AuthModal.tsx`, `components/UserNav.tsx`, `app/api/auth/route.ts`

---

## v0.5 — Light/Dark Theme Switch (10/04/2026)

Added dark mode with system-preference detection and manual toggle.

- **Dark theme tokens:** full dark palette for all `--color-*` and `--shadow-*` variables via `[data-theme="dark"]`
- **ThemeToggle component:** sun/moon icon button in the page header nav
- **System preference:** defaults to `prefers-color-scheme`, manual choice persists to `localStorage`
- **No flash:** blocking `<script>` in `<head>` applies theme before first paint
- **Hardcoded colors removed:** replaced remaining hex values in `CorrectionComparison` and `ConfirmDialog` with CSS variables
- **New tokens:** `--color-overlay`, `--color-correction-heading`, `--color-correction-added`, `--color-correction-removed`
- **Mobile review responsive fix:** stats bar switches to 2x2 grid on small screens; result buttons use short labels ("Got it" / "Partial" / "Missed") below 480px

---

## v0.4 — UI/UX Design Overhaul (01/04/2026)

Unified design system across the entire app — "Calm Education" style.

- **Design system:** CSS custom properties for colors, typography, spacing, radius, shadows
- **Inter font:** Loaded via `next/font/google` for crisp, professional typography
- **Blue primary palette:** `#2563EB` brand blue, semantic green/amber/red for review states
- **Consistent components:** `.btn-primary`, `.btn-secondary`, `.ui-button`, `.card`, `.input-base`, `.section-label` CSS classes
- **All 9 components refactored:** replaced 60+ hardcoded hex values with CSS variables
- **Bug fix:** Long sentences in history no longer overflow — `min-width: 0` on flex item enables proper text truncation
- **Removed:** Old brown/beige button theme, inconsistent inline colors, multiple text color shades
- **Spacing scale:** 8px-based system (xs/sm/md/lg/xl/2xl/3xl)
- **Typography scale:** display/heading/subheading/body/small/caption/tiny with consistent line heights

---

## v0.3 — Review Page Overhaul (01/04/2026)

Rebuilt the review experience with better UX and useful content.

- Auto-play audio when navigating to next card
- Limit audio replay to 3 times per card
- After choosing a result, show compact breakdown: paraphrase, vocabulary, sentence skeleton
- Replace stat blocks with: Total, Due, Reviewed (session), Mastered
- Session complete screen with encouragement message and stats
- Remove useless "listening anchors" (pronunciation anchor, key chunk, listening tip)
- Modern, minimal UI: cleaner cards, unified stat bar, refined typography
- "Next" button inline with "Replay" in card header for faster flow
- Gracefully handle old data with empty/verbose analysis fields

---

## v0.2 — Learn Page Cleanup + TTS & Model Upgrade (29/03/2026)

Streamlined analysis output and upgraded infrastructure.

- Remove "Simply:" simplified sentence from analysis
- Remove word difficulty reasoning ("why this word was extracted")
- Remove entire "Grammar & Phrases" section
- Remove individual word/component explanations on click
- Color-coded sentence now display-only (non-interactive)
- Replace OpenAI TTS → **ElevenLabs Turbo v2.5** (faster, more natural)
- Upgrade analysis model: GPT-4o-mini → **GPT-4.1-mini**

---

## v0.1 — Foundation (29/03/2026)

Core learning loop established.

- Sentence analysis via OpenAI GPT-4o (grammar breakdown, correction, explanation)
- TTS audio generation and playback
- Searchable sentence library with pagination and tagging
- Spaced repetition review (SM-2, 8 stages)
- Color-coded grammar visualization
- SQLite local / PostgreSQL production storage
- Next.js 15 App Router, React 19, TypeScript 5, Vitest test suite
