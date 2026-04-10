# Changelog

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
