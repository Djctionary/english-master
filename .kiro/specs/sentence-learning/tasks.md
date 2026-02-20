# Implementation Plan: Sentence Learning

## Overview

Implement a Next.js full-stack application for English sentence analysis and learning. Incremental approach: project setup → backend services → API routes → frontend components → integration.

## Tasks

- [x] 1. Project setup and core types
  - [x] 1.1 Initialize Next.js project with TypeScript and install dependencies
    - Create Next.js 15 App Router project
    - Install: `better-sqlite3`, `@types/better-sqlite3`, `openai`
    - Create `.env.local` with `OPENAI_API_KEY` placeholder
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
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
    - _Requirements: 7.1, 7.2, 7.3, 9.2, 9.3_

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
    - _Requirements: 1.1, 1.2, 3.1, 5.1, 5.4, 7.1, 7.3, 9.1_
  - [x] 4.2 Implement GET /api/sentences
    - Return all records in reverse chronological order
    - _Requirements: 7.2, 9.2_
  - [x] 4.3 Implement GET /api/sentences/[id]
    - Validate ID, return 404 for non-existent, return full SentenceRecord
    - _Requirements: 9.3_
  - [x] 4.4 Implement GET /api/audio/[filename]
    - Validate filename, return 404 for non-existent, stream MP3 with correct Content-Type
    - _Requirements: 9.4_

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
    - Expandable panel for component details, vocabulary list (IPA, POS, definition, usage note), sentence type, clauses, grammar notes, paraphrase
    - _Requirements: 6.2, 6.3, 6.4_
  - [x] 6.4 Implement AudioPlayer component
    - Play/pause with HTML5 audio, only render when audioFilename is non-null
    - _Requirements: 6.5_
  - [x] 6.5 Implement SentenceLibrary component
    - Fetch and display sentence list (reverse chronological), click to load full analysis, empty state
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 7. Page assembly and integration
  - [x] 7.1 Assemble main page (`app/page.tsx`)
    - Wire SentenceInput → AnalysisDisplay (ColorCodedSentence + DetailView + AudioPlayer)
    - Wire SentenceLibrary with click-to-review flow
    - Manage state: current analysis, selected library item, loading, error
    - _Requirements: 1.1, 6.1, 8.1, 8.2_
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
    - Update `analysisResultSchema` JSON schema to match new structure (remove sentenceType, add correction fields, add difficultyReason)
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
    - Update `getAllSentences` and `getSentenceById` to include `corrected_sentence`
    - _Requirements: 2.6, 7.1_
  - [ ]* 10.2 Write property test for sentence record round-trip with corrections
    - **Property 6: Sentence Record Round-Trip with Corrections**
    - **Validates: Requirements 2.6, 7.1**
  - [x] 10.3 Update existing DB tests for new correctedSentence field
    - Update test fixtures and assertions in `__tests__/lib/db.test.ts` to include `correctedSentence`
    - _Requirements: 2.6_

- [x] 11. Update OpenAI service for correction + rich vocabulary (`lib/openai.ts`)
  - [x] 11.1 Update GPT prompt and analyzeSentence function
    - Replace system prompt with new prompt that includes Step 0 (grammar correction) and updated Layer 3 (rich vocabulary with difficultyReason)
    - Remove sentenceType from prompt and validation
    - Update validation logic to check for new fields (`originalSentence`, `correctedSentence`, `corrections`)
    - The function now accepts the original sentence and returns AnalysisResult with correction fields populated
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 3.1, 4.1_
  - [x] 11.2 Update audio generation to use corrected sentence
    - Modify POST /api/analyze flow to pass `correctedSentence` to `generateAudio` instead of the original sentence
    - _Requirements: 5.1_
  - [ ]* 11.3 Write property test for correction consistency
    - **Property 5: Correction Consistency**
    - **Validates: Requirements 2.4**
  - [ ]* 11.4 Write property test for audio filename based on corrected sentence
    - **Property 13: Audio Filename Based on Corrected Sentence**
    - **Validates: Requirements 5.1, 5.3**
  - [x] 11.5 Update existing OpenAI and analyze API tests
    - Update mock responses and assertions in `__tests__/lib/openai.test.ts` and `__tests__/api/analyze.test.ts` to use new AnalysisResult structure (no sentenceType, with corrections, with difficultyReason)
    - Update `__tests__/api/sentences.test.ts` and `__tests__/api/sentences-id.test.ts` for correctedSentence field
    - _Requirements: 2.3, 3.1, 3.2_

- [x] 12. Checkpoint - Backend updates verification
  - Ensure all backend changes compile, existing tests are updated and pass, ask the user if questions arise.

- [x] 13. Update frontend components for corrections and rich vocabulary
  - [x] 13.1 Create CorrectionComparison component (`components/CorrectionComparison.tsx`)
    - Display side-by-side comparison of original vs. corrected sentence
    - Only render when corrections array is non-empty
    - Show each correction with original text, corrected text, and reason
    - Highlight the differences visually
    - _Requirements: 6.6_
  - [ ]* 13.2 Write property test for CorrectionComparison display
    - **Property 12: Correction Comparison Display**
    - **Validates: Requirements 6.6**
  - [x] 13.3 Update ColorCodedSentence component
    - Accept a `vocabularyWords` prop (list of difficult words from vocabulary analysis)
    - Add dashed underline + subtle yellow background (#FEF9C3) to grammar components whose text contains a vocabulary word
    - Render the corrected sentence (components already use correctedSentence indices)
    - _Requirements: 4.3, 6.1_
  - [ ]* 13.4 Write property test for difficult word visual highlighting
    - **Property 11: Difficult Word Visual Highlighting**
    - **Validates: Requirements 4.3**
  - [x] 13.5 Update DetailView component
    - Remove sentence type display section
    - Update vocabulary section to show expanded cards with: IPA pronunciation, part of speech, detailed definition, usage note, and difficulty reason
    - _Requirements: 4.4, 6.3, 6.4_
  - [ ]* 13.6 Write property test for DetailView display completeness
    - **Property 10: DetailView Display Completeness**
    - **Validates: Requirements 4.4, 6.3, 6.4**
  - [x] 13.7 Update existing component tests
    - Update `__tests__/components/DetailView.test.tsx` to remove sentenceType assertions, add difficultyReason assertions
    - Update `__tests__/components/ColorCodedSentence.test.tsx` for vocabularyWords prop
    - Update `__tests__/components/Page.test.tsx` for correctedSentence and corrections in mock data
    - Update `__tests__/components/SentenceLibrary.test.tsx` for correctedSentence field
    - _Requirements: 4.3, 4.4, 6.3, 6.6_

- [x] 14. Wire updated components into main page (`app/page.tsx`)
  - [x] 14.1 Integrate CorrectionComparison and updated components
    - Add CorrectionComparison component between SentenceInput and ColorCodedSentence (only when corrections exist)
    - Pass `vocabularyWords` from analysis to ColorCodedSentence for difficulty highlighting
    - Update state types to use new SentenceRecord with correctedSentence
    - Remove any sentenceType references
    - _Requirements: 6.1, 6.2, 6.6_

- [x] 15. Final checkpoint - Full integration verification
  - Ensure all changes compile, all updated tests pass, and the app runs correctly with the new correction + rich vocabulary features. Ask the user if questions arise.
