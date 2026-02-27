# Implementation Plan: Sentence Learning

## Overview

Implement optimizations to the existing sentence learning app: add deep structure analysis, update vocabulary threshold to CET-6 level, make the UI compact with inline details, simplify correction comparison to whole-sentence only, fix ColorCodedSentence text duplication bug, add inline tag badge, implement two-column analysis layout, and add concise vocabulary with example sentences. All previously completed tasks (1-22) are marked done. New tasks (23-30) cover the UI/UX optimization changes.

## Tasks

- [x] 1. Project setup and core types
  - [x] 1.1 Initialize Next.js project with TypeScript and install dependencies
    - Create Next.js 15 App Router project
    - Install: `better-sqlite3`, `@types/better-sqlite3`, `openai`
    - Create `.env.local` with `OPENAI_API_KEY` placeholder
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [x] 1.2 Define core TypeScript interfaces and types (`lib/types.ts`)
    - Define `AnalysisResult`, `GrammarComponent`, `VocabularyItem`, `Clause`, `SentenceRecord` interfaces
    - Define JSON schema for OpenAI Structured Outputs
    - _Requirements: 3.1, 3.2_

- [x] 2. Database layer (`lib/db.ts`)
  - [x] 2.1 Implement SQLite database module
    - `initDatabase()` — create sentences table
    - `findSentenceByText(sentence)` — duplicate detection
    - `insertSentence(record)` — store new records
    - `getAllSentences()` — return records in reverse chronological order
    - `getSentenceById(id)` — single record retrieval
    - _Requirements: 8.1, 8.2, 8.3, 10.2, 10.3_

- [x] 3. OpenAI service layer (`lib/openai.ts`)
  - [x] 3.1 Implement sentence analysis service
    - `analyzeSentence(sentence)` using OpenAI Chat Completions API with structured outputs
    - Embed the multi-layer analysis prompt (clause → phrase → word)
    - Use `response_format: { type: "json_schema" }` with schema from types
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 3.2 Implement audio generation service
    - `generateAudio(sentence)` using OpenAI TTS API (`tts-1`, `alloy` voice, MP3)
    - SHA-256 hash-based filename generation
    - Save to `data/audio/`, reuse existing files
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 4. API routes
  - [x] 4.1 Implement POST /api/analyze
    - Validate input (reject blank/whitespace-only)
    - Check DB for existing sentence (return cached if found)
    - Call analyzeSentence + generateAudio
    - Handle TTS failure gracefully (null audioFilename)
    - Store and return SentenceRecord
    - _Requirements: 1.1, 1.2, 3.1, 5.1, 5.4, 8.1, 8.3, 10.1_
  - [x] 4.2 Implement GET /api/sentences
    - Return all records in reverse chronological order
    - _Requirements: 8.2, 10.2_
  - [x] 4.3 Implement GET /api/sentences/[id]
    - Validate ID, return 404 for non-existent, return full SentenceRecord
    - _Requirements: 10.3_
  - [x] 4.4 Implement GET /api/audio/[filename]
    - Validate filename, return 404 for non-existent, stream MP3 with correct Content-Type
    - _Requirements: 10.4_

- [x] 5. Checkpoint - Backend verification
  - Ensure all backend code compiles and API routes are wired correctly, ask the user if questions arise.

- [x] 6. Frontend components
  - [x] 6.1 Implement SentenceInput component
    - Text input + submit button, client-side validation, loading state, error display with retry
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 6.2 Implement ColorCodedSentence component
    - Render sentence with color-coded spans per grammar role, clickable to expand details
    - _Requirements: 6.1, 6.2_
  - [x] 6.3 Implement DetailView component
    - Expandable panel for component details, vocabulary list, clauses, grammar notes, paraphrase
    - _Requirements: 6.2, 6.3, 6.4_
  - [x] 6.4 Implement AudioPlayer component
    - Play/pause with HTML5 audio, only render when audioFilename is non-null
    - _Requirements: 6.5_
  - [x] 6.5 Implement SentenceLibrary component
    - Fetch and display sentence list (reverse chronological), click to load full analysis, empty state
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 7. Page assembly and integration
  - [x] 7.1 Assemble main page (`app/page.tsx`)
    - Wire SentenceInput → AnalysisDisplay (ColorCodedSentence + DetailView + AudioPlayer)
    - Wire SentenceLibrary with click-to-review flow
    - Manage state: current analysis, selected library item, loading, error
    - _Requirements: 1.1, 6.1, 9.1, 9.2_
  - [x] 7.2 Add global styles and layout
    - Clean, readable layout with proper spacing
    - Color mapping CSS for grammar components
    - Responsive design basics
    - _Requirements: 6.1_

- [x] 8. Final checkpoint
  - Ensure the app compiles and runs correctly, ask the user if questions arise.

- [x] 9. Update types for grammar correction and rich vocabulary (`lib/types.ts`)
  - [x] 9.1 Update AnalysisResult and related types
    - Add `Correction` interface with `original`, `corrected`, `reason` fields
    - Add `originalSentence`, `correctedSentence`, `corrections` fields to `AnalysisResult`
    - Add `difficultyReason` field to `VocabularyItem`
    - Remove `sentenceType` field from `AnalysisResult`
    - Add `correctedSentence` field to `SentenceRecord`
    - Update `analysisResultSchema` JSON schema to match new structure
    - _Requirements: 2.3, 3.2, 4.2_
  - [ ]* 9.2 Write property test for AnalysisResult structural completeness
    - **Property 1: AnalysisResult Structural Completeness**
    - Generate random valid AnalysisResult objects and verify all required fields are present with correct types
    - **Validates: Requirements 2.3, 3.1, 3.2, 4.2**

- [x] 10. Update database layer for corrected sentence storage (`lib/db.ts`)
  - [x] 10.1 Add corrected_sentence column and update DB functions
    - Add migration: `ALTER TABLE sentences ADD COLUMN corrected_sentence TEXT` with default fallback to `sentence` value
    - Update `insertSentence` to store `correctedSentence`
    - Update `rowToSentenceRecord` to read `corrected_sentence` column
    - _Requirements: 2.6, 8.1_
  - [ ]* 10.2 Write property test for sentence record round-trip with corrections
    - **Property 6: Sentence Record Round-Trip with Corrections**
    - **Validates: Requirements 2.6, 8.1**
  - [x] 10.3 Update existing DB tests for new correctedSentence field
    - Update test fixtures and assertions in `__tests__/lib/db.test.ts` to include `correctedSentence`
    - _Requirements: 2.6_

- [x] 11. Update OpenAI service for correction + rich vocabulary (`lib/openai.ts`)
  - [x] 11.1 Update GPT prompt and analyzeSentence function
    - Replace system prompt with correction + multi-layer analysis prompt
    - Update validation logic for new fields
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 3.1, 4.1_
  - [x] 11.2 Update audio generation to use corrected sentence
    - _Requirements: 5.1_
  - [ ]* 11.3 Write property test for correction consistency
    - **Property 5: Correction Consistency**
    - **Validates: Requirements 2.4**
  - [ ]* 11.4 Write property test for audio filename based on corrected sentence
    - **Property 13: Audio Filename Based on Corrected Sentence**
    - **Validates: Requirements 5.1, 5.3**
  - [x] 11.5 Update existing OpenAI and analyze API tests
    - _Requirements: 2.3, 3.1, 3.2_

- [x] 12. Checkpoint - Backend updates verification
  - Ensure all backend changes compile, existing tests are updated and pass, ask the user if questions arise.

- [x] 13. Update frontend components for corrections and rich vocabulary
  - [x] 13.1 Create CorrectionComparison component (`components/CorrectionComparison.tsx`)
    - Display side-by-side comparison of original vs. corrected sentence
    - Only render when corrections array is non-empty
    - _Requirements: 6.6_
  - [ ]* 13.2 Write property test for CorrectionComparison display
    - **Property 12: Whole-Sentence Correction Display**
    - **Validates: Requirements 6.6**
  - [x] 13.3 Update ColorCodedSentence component
    - Accept `vocabularyWords` prop, add difficulty highlighting
    - _Requirements: 4.3, 6.1_
  - [ ]* 13.4 Write property test for difficult word visual highlighting
    - **Property 11: Difficult Word Visual Highlighting**
    - **Validates: Requirements 4.3**
  - [x] 13.5 Update DetailView component
    - Update vocabulary section with expanded cards
    - _Requirements: 4.4, 6.3, 6.4_
  - [ ]* 13.6 Write property test for DetailView display completeness
    - **Property 10: DetailView Display Completeness**
    - **Validates: Requirements 4.4, 6.3, 6.4, 7.5**
  - [x] 13.7 Update existing component tests
    - _Requirements: 4.3, 4.4, 6.3, 6.6_

- [x] 14. Wire updated components into main page (`app/page.tsx`)
  - [x] 14.1 Integrate CorrectionComparison and updated components
    - _Requirements: 6.1, 6.2, 6.6_

- [x] 15. Final checkpoint - Full integration verification
  - Ensure all changes compile, all updated tests pass, and the app runs correctly with the new correction + rich vocabulary features. Ask the user if questions arise.

- [x] 16. Add StructureAnalysis type and update AnalysisResult (`lib/types.ts`)
  - [x] 16.1 Add StructureAnalysis interface and update AnalysisResult
    - Add `StructureAnalysis` interface with `clauseConnections`, `tenseLogic`, `phraseExplanations` string fields
    - Add `structureAnalysis: StructureAnalysis` field to `AnalysisResult` interface
    - Update `analysisResultSchema` JSON schema to include `structureAnalysis` object with the three required string fields
    - Add `structureAnalysis` to the `required` array in the schema
    - _Requirements: 3.2, 7.1, 7.2, 7.3_

- [x] 17. Update GPT prompt for CET-6 vocabulary and deep structure (`lib/openai.ts`)
  - [x] 17.1 Update ANALYSIS_SYSTEM_PROMPT
    - Change vocabulary target from "B2+ level, academic words, TOEFL-level" to "above CET-6 level (~5500 common words)"
    - Change learner description from "TOEFL-level English learner (score ~80)" to "English learner at CET-6 vocabulary level (~5500 words, roughly CEFR B2, TOEFL score ~80)"
    - Add Layer 4 — Deep Structure Analysis section to the prompt with clauseConnections, tenseLogic, phraseExplanations instructions
    - All output must remain in English
    - _Requirements: 4.1, 7.1, 7.2, 7.3, 7.4_
  - [x] 17.2 Update analyzeSentence validation for structureAnalysis
    - Add validation that `parsed.structureAnalysis` exists and has non-empty `clauseConnections`, `tenseLogic`, `phraseExplanations`
    - _Requirements: 3.1, 7.1, 7.2, 7.3_
  - [ ]* 17.3 Update existing OpenAI tests for structureAnalysis
    - Update mock responses in `__tests__/lib/openai.test.ts` and `__tests__/api/analyze.test.ts` to include `structureAnalysis` field
    - _Requirements: 3.1, 7.1_

- [x] 18. Checkpoint - Backend structure analysis verification
  - Ensure types compile, prompt is updated, validation works. Ask the user if questions arise.

- [x] 19. Remove individual correction cards from CorrectionComparison (`components/CorrectionComparison.tsx`)
  - [x] 19.1 Update CorrectionComparison to whole-sentence only
    - Remove the individual correction cards section (the loop rendering `correction-card` divs)
    - Keep only the side-by-side whole-sentence comparison (original vs corrected with highlights)
    - _Requirements: 6.6_
  - [ ]* 19.2 Update CorrectionComparison tests
    - Update `__tests__/components/CorrectionComparison.test.tsx` to verify no individual correction cards are rendered
    - Verify whole-sentence comparison still renders correctly
    - _Requirements: 6.6_

- [x] 20. Redesign DetailView for compact inline display (`components/DetailView.tsx`)
  - [x] 20.1 Make DetailView compact with inline component details
    - Redesign layout to be compact — reduce padding, margins, font sizes
    - When a grammar component is selected, show its details in a small inline highlighted block (not a large panel)
    - Make vocabulary section use compact rows instead of large cards
    - Add structure analysis section displaying clauseConnections, tenseLogic, phraseExplanations
    - Make all sections tight to fit within one viewport
    - _Requirements: 6.2, 6.3, 6.4, 6.7, 7.5_
  - [ ]* 20.2 Update DetailView tests
    - Update `__tests__/components/DetailView.test.tsx` to verify structure analysis section renders
    - Verify compact layout renders vocabulary and all sections
    - _Requirements: 6.3, 6.4, 7.5_

- [x] 21. Update main page for compact layout (`app/page.tsx`)
  - [x] 21.1 Adjust page layout for compact one-viewport display
    - Reduce spacing between sections (correction comparison, color-coded sentence, detail view)
    - Ensure all analysis content fits compactly
    - Pass `structureAnalysis` data through to DetailView
    - _Requirements: 6.7_
  - [ ]* 21.2 Update page tests
    - Update `__tests__/components/Page.test.tsx` mock data to include `structureAnalysis`
    - _Requirements: 6.4, 7.5_

- [x] 22. Checkpoint - Full optimization verification
  - Ensure all changes compile, all tests pass, the app displays compact analysis with structure analysis, whole-sentence correction comparison, and CET-6 level vocabulary targeting. Ask the user if questions arise.

- [x] 23. Add `exampleSentence` to VocabularyItem and update GPT prompt
  - [x] 23.1 Update VocabularyItem type and JSON schema (`lib/types.ts`)
    - Add `exampleSentence: string` field to `VocabularyItem` interface
    - Add `exampleSentence` to `analysisResultSchema` vocabulary item properties and required array
    - _Requirements: 14.1_
  - [x] 23.2 Update GPT prompt for concise definitions and example sentences (`lib/openai.ts`)
    - Change vocabulary definition instruction from "DETAILED definition (2-3 sentences)" to "CONCISE definition (one clear sentence)"
    - Add instruction to generate one example sentence per vocabulary word, simple enough for CET-6 level learners
    - Add `exampleSentence` to the validation logic in `analyzeSentence`
    - _Requirements: 14.2, 14.3_
  - [ ]* 23.3 Update existing tests for exampleSentence field
    - Update mock AnalysisResult fixtures in test files to include `exampleSentence`
    - _Requirements: 14.1_

- [x] 24. Fix ColorCodedSentence text duplication bug (`components/ColorCodedSentence.tsx`)
  - [x] 24.1 Refactor ColorCodedSentence to use index-based rendering
    - Add `correctedSentence: string` prop to `ColorCodedSentenceProps`
    - Sort components by `startIndex`, iterate through `correctedSentence` using `startIndex`/`endIndex` to slice colored spans
    - Fill gaps between components (characters not covered by any component) with unstyled `<span>` elements
    - Remove the old approach of concatenating `comp.text` with spaces
    - _Requirements: 12.1, 12.2, 12.3_
  - [x] 24.2 Update all call sites to pass `correctedSentence` prop
    - Update `app/page.tsx` to pass `correctedSentence={currentAnalysis.analysis.correctedSentence}` to ColorCodedSentence
    - _Requirements: 12.1_
  - [ ]* 24.3 Write property test for ColorCodedSentence rendering round-trip
    - **Property 15: ColorCodedSentence Rendering Round-Trip**
    - Generate random correctedSentence strings and valid GrammarComponent arrays, verify rendered text content equals the full correctedSentence
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4**

- [x] 25. Checkpoint - Bug fix verification
  - Ensure ColorCodedSentence renders correctly without text duplication, all tests pass. Ask the user if questions arise.

- [x] 26. Create InlineTagBadge component and replace SentenceTagEditor in analysis display
  - [x] 26.1 Create InlineTagBadge component (`components/InlineTagBadge.tsx`)
    - When tag exists: render a small pill-shaped badge (e.g., `🏷 Game: Arknights`) with click handler to toggle popover
    - When no tag: render a small `+ Tag` button with click handler to toggle popover
    - Popover contains: type input, name input, existing tag dropdown, save/remove buttons
    - Use compact, unobtrusive styling (small font, muted colors, rounded pill shape)
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - [x] 26.2 Replace SentenceTagEditor with InlineTagBadge in page layout (`app/page.tsx`)
    - Remove the separate SentenceTagEditor section from the analysis display
    - Place InlineTagBadge inline next to the ColorCodedSentence (in the sentence header area)
    - Pass tag data, existing tags, and save handler to InlineTagBadge
    - _Requirements: 11.1_
  - [ ]* 26.3 Write unit tests for InlineTagBadge
    - Test badge renders with tag text when tag exists
    - Test "+" button renders when no tag
    - Test popover opens on badge click
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 27. Redesign DetailView with two-column layout (`components/DetailView.tsx`)
  - [x] 27.1 Implement two-column responsive layout in DetailView
    - Left column: selected component detail, clauses, structure analysis, grammar notes, paraphrase
    - Right column: vocabulary cards with compact card format (word, pronunciation badge, POS, concise definition, example sentence in italic, difficulty reason)
    - Use CSS flexbox/grid with responsive breakpoint at 768px (stack vertically on mobile)
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  - [x] 27.2 Update vocabulary display to compact cards with example sentences
    - Each vocabulary card shows: word (bold), phonetic (muted), POS badge, concise definition, example sentence (italic, distinct color), difficulty reason
    - Handle missing `exampleSentence` gracefully for older records
    - _Requirements: 14.4, 14.5_
  - [ ]* 27.3 Update DetailView tests
    - Verify two-column layout structure renders
    - Verify vocabulary cards display exampleSentence
    - _Requirements: 13.2, 14.4_

- [x] 28. Update main page layout for modern minimalist design (`app/page.tsx`)
  - [x] 28.1 Refine page layout and styling
    - Apply modern minimalist design: clean typography, generous whitespace, subtle colors
    - Ensure sentence header area contains: color-coded sentence + inline tag badge + audio player
    - Two-column analysis section below the sentence header
    - _Requirements: 13.1, 13.4_
  - [ ]* 28.2 Update page tests
    - Update mock data to include `exampleSentence` in vocabulary items
    - Verify InlineTagBadge is rendered instead of SentenceTagEditor
    - _Requirements: 14.1, 11.1_

- [x] 29. Checkpoint - Full UI/UX optimization verification
  - Ensure all changes compile, all tests pass, the app displays: index-based color-coded sentence without duplication, inline tag badge, two-column layout with vocabulary cards showing example sentences. Ask the user if questions arise.

- [x] 30. Final checkpoint - Complete integration
  - Ensure all tests pass, the app runs correctly with all UI/UX optimizations applied. Ask the user if questions arise.

## Notes

- Tasks 1-22 are previously completed and marked as done
- Tasks 23-30 implement the UI/UX optimization changes: ColorCodedSentence bug fix, inline tag badge, two-column layout, concise vocabulary with example sentences
- Tasks marked with `*` are optional and can be skipped for faster implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- The `exampleSentence` field is added to the VocabularyItem JSON schema — existing records without it will be handled gracefully in the frontend
