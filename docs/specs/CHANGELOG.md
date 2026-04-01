# Changelog

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
