# Changelog

## v1.4.4-alpha — Reviewed-Per-Day Chart (23/06/2026)

Refined the Review page's learning-activity chart and stat labels.

- **Review stat labels clarified:** "Due" → **"Due Today"**, "Reviewed" → **"Reviewed Today"** so the strip reads as a daily snapshot
- **Top chart panel now tracks reviews, not the due backlog:** the panel retitled to **"Sentences reviewed each day"** and now plots the actual number of reviews submitted per day instead of the point-in-time due count
  - New `review_counts` table (SQLite + Postgres), incremented inside `submitSentenceReview` keyed on the review's UTC day
  - `getReviewCounts()` replaces `getDueSnapshots()`; `/api/progress` reads the review log and no longer writes a due snapshot on each visit
  - `ProgressPoint.due` → `reviewed`; `buildProgressData` folds the review log into the per-day series (days before logging began default to 0)
  - Tooltip ("Reviewed that day") and legend ("Reviewed each day") updated to match
- **"Reviewed Today" survives a page refresh:** the stat was session-only state (reset to 0 on every load). The review queue now returns a persisted `reviewedToday` (from `review_counts`), and the stat shows that baseline plus the live in-session delta
- **Home page version badge bumped to V1.4.4 Alpha**

---

## v1.4.3-alpha — Tag List Sync + Dropdown Fix (16/06/2026)

Fixed two tag-related issues in the Learn workspace.

- **Tag pickers now reflect the whole library:** both the tag filter and the tag editor's "Choose from existing tags" were built from the *currently loaded page* of sentences (paginated + filtered), so the available tags changed depending on what was on screen — e.g. filtering to `Paper:*` hid `Game:Endfield`. They now source from a new **`GET /api/tags`** endpoint returning the user's distinct tags across the entire library.
  - New `getDistinctTags(userId)` in both backends (SQLite & Postgres) + `/api/tags` route
  - `LearnWorkspace` holds an `allTags` state (fetched on mount, refetched after a tag save or sentence delete); both the filter options and the editor list derive from it, so they stay in sync
- **Tag filter dropdown no longer clipped:** the "All tags" menu was `position: absolute` inside the library card, which uses `overflow: hidden`, so it got cut off / overlapped the sentence rows when the list was short. It now renders through a **React portal** to `document.body` (`position: fixed`, anchored to the button via `getBoundingClientRect`, repositioned on scroll/resize), with `max-height` + scroll for long tag lists

---

## v1.4.2-alpha — Merge Progress into Review (16/06/2026)

Folded the learning-activity chart into the Review page and removed the
standalone Progress page, so reviewing and tracking now live together.

- **Chart moved into Review:** the two-panel learning-activity chart now renders as a "Recent learning activity" card below the review card on `/review`, fed by `GET /api/progress` (which still logs today's due count on each visit)
- **`/progress` page deleted:** route removed, dropped from `middleware.ts` protected pages/matcher (the `/api/progress` endpoint stays), and the **Progress** nav link removed from the Learn and Review headers
- **Review stat bar unchanged:** Total · Due · Reviewed · Mastered stays exactly as-is
- **Cleanup:** removed the now-unused `.stat-strip` CSS (the deleted page's only consumer)

---

## v1.4.1-alpha — Progress Chart Redesign (15/06/2026)

Rebuilt the Progress chart from first principles after the combined dual-axis
plot proved hard to read — particularly on mobile and when daily counts (~5–10)
are dwarfed by the cumulative total (~200).

- **Two stacked panels, one shared time axis** (small multiples, replacing the dual-axis combo). Past 30 days through today — no forecast, which also eliminates the old today/tomorrow bar overlap:
  - **Sentences due each day** — daily bars, its own vertical scale
  - **Sentences added each day** — daily bars, its own vertical scale, so the small daily counts (~5–10) are never crushed by the large due backlog (~200)
- **Due history is logged, not forecast:** SM-2 only stores each sentence's *current* due date, so past due counts can't be reconstructed. Instead, every visit to `/progress` records today's due count to a new `due_snapshots` table; the chart reads that log. Days before logging began show 0 and the history fills in over time. Today's bar always reflects the live count.
- **"Due to review" retired as a chart series:** the live backlog is surfaced as a **"Due for review"** stat instead
- **Mobile-responsive:** SVGs render at the measured container width via `ResizeObserver`, so text stays crisp and bar width / x-label density adapt instead of being scaled down from a fixed viewBox. The stat strip is 4-up on wide screens and collapses to a 2×2 grid when narrow
- **Data layer:** new `DueSnapshot` type + `due_snapshots` table (SQLite & Postgres) with `recordDueSnapshot`/`getDueSnapshots`; `ProgressPoint` is now `{ date, added, cumulative, due, isToday }`; `ProgressData.overdueCount` → `dueCount`; `buildProgressData` takes the due log and drops the forecast

---

## v1.4.0-alpha — Learning Progress Visualization (12/06/2026)

A new **Progress** page that visualizes your recent learning activity in a single
combined chart, plus a stat strip summarizing your library at a glance.

- **New `/progress` page:** linked from the Learn and Review nav, route-protected via middleware
- **Combined chart (one plot, three series):** a hand-rolled, theme-aware SVG combo chart — no charting dependency
  - **Cumulative learned** — area + line on the left axis, total sentences over time
  - **Learned that day** — daily bars on the right axis, new sentences added each day
  - **Due to review** — daily bars; overdue sentences collapse onto today (the "learn ASAP" backlog), upcoming due dates form a short forecast
  - X axis spans the last 30 days plus a 14-day forecast, with a dashed "today" divider and a hover tooltip per day
- **Stat strip:** Total · Added today · Due now · Mastered
- **`GET /api/progress`:** user-scoped, returns the daily series; works on both SQLite and Postgres
- **Honest by design:** day-by-day *historical* due counts aren't reconstructable (we store each sentence's current due date, not its history), so the due series is overdue-collapsed-to-today plus a forward forecast
- **New files:** `app/progress/page.tsx`, `app/api/progress/route.ts`, `components/ProgressChart.tsx`, `lib/progress.ts`

---

## v1.3.0-alpha — TTS Voice Selection (05/05/2026)

Per-user TTS voice preference, selectable from the user settings panel.

- **Voice selection UI:** click the avatar in the nav to open a settings panel with two voice options — Female · American and Male · American
- **Per-user preference:** voice choice stored in `users.tts_voice_id` column (DB migration runs automatically on first boot)
- **New audio only:** existing sentence audio is unaffected; new analyses use the selected voice
- **Voice-aware filename:** audio filename is now SHA-256 of `sentence:voiceId`, so different voices cache independently and never overwrite each other
- **Hardcoded voices:** `ELEVENLABS_VOICE_ID` and `ELEVENLABS_MODEL_ID` env vars removed — voice IDs and model are now constants in code
- **API:** `PATCH /api/auth` `{ voiceId }` to update preference; `GET /api/auth` now returns `tts_voice_id`

---

## v1.2.1-alpha — iOS Audio Fix + Review Tag Display (24/04/2026)

Bug fixes and a small review UX improvement.

- **iOS audio fix:** removed `audio.load()` call from the card-change effect — it was clearing the iOS audio unlock token, causing silent replay failures. Auto-play now preserves the gesture context acquired on navigation
- **iOS replay fix:** `handleReplay` is now a synchronous function using `.then/.catch` instead of `async/await`, and no longer calls `audio.pause()` before `play()`. Both changes prevent the "play() resolves but produces no sound" bug on mobile Safari
- **Audio element:** added `playsInline` and `preload="auto"` attributes for more reliable inline playback on iOS
- **Tag badge on review cards:** sentences with a tag (e.g. "Game: Arknights") now show a small pill badge on the review card — in the blind-listen state below the replay counter, and in the revealed state next to the "Revealed" label

---

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
