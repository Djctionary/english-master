# Backlog

Ideas and known issues — not yet scheduled for any version.

---

## Improvements

- [x] Light/Dark Theme Switch — done in v0.5
- [x] User management + landing page — done in v1.0-alpha
- [x] Multilingual background art on landing page ("Learn English from Sentences" in many languages)
- [ ] Email validation + password recovery
- [ ] Lifetime member system implementation
- [x] Show the Tag which user created when review, as a hint — done in v1.2.1-alpha
- [x] TTS voice selection (Female/Male American) in user settings — done in v1.3.0-alpha
- [x] Mobile settings panel fix (createPortal, touch-safe) — done in v1.3.0-alpha

## Future Plan

- [ ] Voice input + image recognition for sentence capture
- [ ] Conversational AI mode — capture and analyze each sentence in real-time
- [ ] Payment / subscription system

## Known Issues (High Priority)

- [x] **Migrate to Neon Postgres** — completed. `lib/sentence-store.ts` implements a full SQLite/Postgres dual-provider abstraction. All API routes import from `sentence-store`, never directly from `lib/db`. `DATASTORE_PROVIDER` env var is implemented and working. `DATABASE_URL` points to Neon; confirmed live on Vercel. Audio BLOBs also stored in DB (BYTEA) since v1.2-alpha — no ephemeral filesystem dependency.

## Bugs

- [x] History list: long sentences overflow and overlay the delete button — fixed in v0.4 (min-width: 0 + text-overflow: ellipsis)

## Open Questions

- Review optimization: leverage tags, highlight key words, show sentence explanation, remove noise
- UI polish and faster data loading
- Keep CLAUDE.md in sync when architecture changes
