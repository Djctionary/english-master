# Requirements Document

## Introduction

"Learn English from Sentences" is a single-user MVP website. The core feature: users input an English sentence, and the system performs grammar auto-correction, multi-layer linguistic analysis (clause structure, phrase-level grammar chunking, key vocabulary with rich explanations, deep structural analysis), and generates sentence audio via OpenAI API. Results are displayed with color-coded components, clickable sentence parts showing inline details, and a whole-sentence correction comparison. Analyzed sentences are saved to a local database, forming a chronological sentence library for review.

The target user scored 80 on TOEFL with a vocabulary level around CET-4 (~3500 words, roughly CEFR A2-B1). The user is weak at pronunciation, listening, and complex/hard words. The analysis is tailored to explain any word above CET-4 level with rich, detailed explanations and to provide deep structural breakdowns of how complex sentences are constructed.

The entire application is English-only — all UI text, analysis output, labels, prompts, and explanations are in English.

## Glossary

- **Sentence_Analyzer**: Backend service component that calls OpenAI GPT API to perform grammar correction, multi-layer linguistic analysis, and deep structural analysis on English sentences
- **Audio_Generator**: Backend service component that calls OpenAI TTS API to generate audio for English sentences
- **Sentence_Library**: SQLite database storing analyzed sentences with their analysis results and audio
- **Analysis_Result**: Structured JSON data returned by Sentence_Analyzer, containing grammar corrections, clause breakdown, phrase-level grammar components, key vocabulary with rich explanations, deep structure analysis, grammar notes, and a paraphrase
- **Color_Coded_View**: Frontend display component that highlights sentence chunks with different colors based on grammatical function, with special visual emphasis on difficult words. Clicking any part shows inline details below
- **Detail_View**: Frontend inline detail view that shows contextual information directly below the color-coded sentence when a part is clicked, keeping everything compact within one viewport
- **Sentence_Record**: A complete sentence record in the database, containing the original sentence, corrected sentence, Analysis_Result, and audio file path
- **Correction**: A single spelling or grammar fix applied to the original sentence, containing the original text, corrected text, and reason for the change
- **Structure_Analysis**: Deep sentence structure analysis including clause connection analysis, tense logic explanation, and phrase/idiom usage explanation, written in accessible language for CET-4 level learners
- **Inline_Tag_Badge**: A small chip/badge displayed inline next to the sentence text showing the context tag, with click-to-edit functionality via a compact popover
- **Two_Column_Layout**: A responsive layout where sentence structure analysis appears on the left and vocabulary cards appear on the right, collapsing to a single column on narrow viewports

## Requirements

### Requirement 1: Sentence Input and Submission

**User Story:** As an English learner, I want to input an English sentence and submit it for analysis, so that I can deeply study its grammar and vocabulary.

#### Acceptance Criteria

1. WHEN a user enters an English sentence in the input area and clicks the submit button, THE Sentence_Analyzer SHALL receive the sentence and begin the analysis process
2. WHEN a user submits blank content (empty string or whitespace only), THE Sentence_Analyzer SHALL reject the submission and display an input validation error to the user
3. WHILE Sentence_Analyzer is processing the sentence analysis, THE frontend SHALL display a loading state indicator
4. IF Sentence_Analyzer fails to call the OpenAI API, THEN THE frontend SHALL display a clear error message and allow the user to retry

### Requirement 2: Grammar Auto-Correction

**User Story:** As an English learner, I want the system to automatically detect and fix spelling and grammar errors in my sentence before analysis, so that I can learn from a corrected version while seeing what I got wrong.

#### Acceptance Criteria

1. WHEN a valid English sentence is submitted, THE Sentence_Analyzer SHALL first check the sentence for spelling and grammar errors before performing analysis
2. WHEN spelling or grammar errors are found, THE Sentence_Analyzer SHALL produce a minimally corrected version that fixes only errors without changing the user's word choices or sentence structure
3. THE Analysis_Result SHALL contain the original sentence, the corrected sentence, and a list of corrections where each correction includes the original text, the corrected text, and a brief reason for the change
4. WHEN no errors are found, THE Sentence_Analyzer SHALL set the corrected sentence equal to the original sentence and return an empty corrections list
5. THE Sentence_Analyzer SHALL perform the full multi-layer analysis on the corrected version of the sentence
6. THE Sentence_Library SHALL store both the original sentence and the corrected sentence in each Sentence_Record

### Requirement 3: Multi-Layer Sentence Analysis

**User Story:** As an English learner, I want the system to automatically analyze the sentence's clause structure, phrase-level grammar, key vocabulary, and deep structure, so that I can systematically understand the sentence from macro to micro level.

#### Acceptance Criteria

1. WHEN a valid English sentence is submitted, THE Sentence_Analyzer SHALL call the OpenAI GPT API and return an Analysis_Result containing clause breakdown, phrase-level grammar components, key vocabulary with rich explanations, deep structure analysis, grammar notes, and a paraphrase
2. THE Analysis_Result SHALL contain the following fields: clause list with type and role, grammar components with text span and character indices and grammatical function and description, vocabulary items with IPA phonetic transcription and part of speech and detailed definition and usage note and difficulty reason, deep structure analysis with clause connection analysis and tense logic and phrase usage explanations, grammar notes list, and a paraphrase of the overall meaning
3. WHEN the OpenAI GPT API returns data that does not conform to the expected JSON schema, THE Sentence_Analyzer SHALL return a parse error and prompt the user to retry
4. THE Sentence_Analyzer SHALL use prompt engineering with OpenAI Structured Outputs to ensure the GPT API returns consistent structured JSON format

### Requirement 4: CET-4 Level Vocabulary Explanations

**User Story:** As an English learner at CET-4 vocabulary level (~3500 words), I want each word above CET-4 level to have a full, rich explanation, so that I can deeply understand and remember these words.

#### Acceptance Criteria

1. THE Sentence_Analyzer SHALL focus vocabulary extraction on words above CET-4 level (~3500 common words), including academic words, uncommon words, and words commonly confused by English learners
2. WHEN vocabulary items are returned, each item SHALL include: IPA pronunciation guide, part of speech, a detailed multi-sentence definition, a contextual usage note explaining how the word functions in this specific sentence, and a difficulty reason explaining why this word is hard or important for English learners
3. THE Color_Coded_View SHALL visually distinguish difficult vocabulary words with a special highlight style (underline or background highlight) that makes them stand out from regular grammar color coding
4. THE Detail_View SHALL display each vocabulary item in a compact inline format showing all fields (pronunciation, part of speech, detailed definition, usage note, difficulty reason)

### Requirement 5: Sentence Audio Generation

**User Story:** As an English learner, I want to hear the standard pronunciation of the sentence, so that I can improve my listening and speaking skills.

#### Acceptance Criteria

1. WHEN a valid English sentence is submitted, THE Audio_Generator SHALL call the OpenAI TTS API to generate an audio file for the corrected version of the sentence
2. THE Audio_Generator SHALL persist the generated audio file to the local filesystem
3. WHEN an audio file already exists for the same corrected sentence, THE Audio_Generator SHALL reuse the existing audio instead of regenerating
4. IF the OpenAI TTS API call fails, THEN THE Audio_Generator SHALL return an error message, and the sentence analysis result SHALL still display normally (audio is optional)

### Requirement 6: Compact Analysis Result Display

**User Story:** As an English learner, I want the analysis results displayed compactly within one page, with clickable sentence parts showing inline details, so that I can quickly understand the sentence structure and focus on difficult words.

#### Acceptance Criteria

1. WHEN Analysis_Result is returned successfully, THE Color_Coded_View SHALL highlight each grammar component in the corrected sentence with a distinct color based on its grammatical function
2. WHEN a user clicks on a grammar component, THE Detail_View SHALL show detailed information about that component inline below the color-coded sentence (part of speech, function description), not in a separate expanded panel
3. THE Detail_View SHALL display the key vocabulary list in compact inline format, with each word showing IPA phonetic transcription, part of speech, detailed definition, usage note, and difficulty reason
4. THE Detail_View SHALL display the clause breakdown, deep structure analysis, grammar notes, and the paraphrase
5. WHEN an audio file is available, THE frontend SHALL display an audio play button that plays the sentence audio when clicked
6. WHEN corrections were made to the original sentence, THE frontend SHALL display only a whole-sentence side-by-side comparison showing the original sentence and the corrected sentence with differences highlighted, without individual correction cards
7. THE frontend SHALL keep all analysis content (correction comparison, color-coded sentence, vocabulary, structure analysis, grammar notes) within one viewport height, maintaining a compact layout

### Requirement 7: Deep Sentence Structure Analysis

**User Story:** As a CET-4 level English learner, I want to deeply understand how complex sentences are constructed — how clauses connect, why certain tenses are chosen, how phrases are used — so that I can truly understand the logic of long and complex sentences.

#### Acceptance Criteria

1. WHEN analyzing a sentence with multiple clauses, THE Sentence_Analyzer SHALL provide clause connection analysis explaining the relationship between clauses (coordination, subordination) and why they connect that way
2. WHEN analyzing tense usage in a sentence, THE Sentence_Analyzer SHALL explain the logic and reasoning behind tense choices in accessible language, explaining why this tense is used rather than another
3. WHEN a sentence contains phrases, idioms, or fixed collocations, THE Sentence_Analyzer SHALL identify and explain these usages
4. THE Structure_Analysis SHALL use simple, accessible language suitable for CET-4 level learners, breaking down complex concepts into easy-to-understand explanations
5. THE Detail_View SHALL clearly display the deep structure analysis in the analysis results, helping users understand how sentence parts fit together

### Requirement 8: Save Sentence to Library

**User Story:** As an English learner, I want analyzed sentences to be saved to a sentence library, so that I can review them later.

#### Acceptance Criteria

1. WHEN sentence analysis is complete, THE system SHALL automatically save the Sentence_Record (original sentence, corrected sentence, Analysis_Result, audio file path, save timestamp) to the Sentence_Library
2. THE Sentence_Library SHALL store and retrieve Sentence_Records in reverse chronological order
3. WHEN a user submits a sentence that already exists in the Sentence_Library (matched by original sentence text), THE system SHALL return the existing Analysis_Result and audio directly instead of making duplicate API calls

### Requirement 9: Sentence Library Browsing and Review

**User Story:** As an English learner, I want to browse all my saved sentences and review any sentence's analysis and audio at any time.

#### Acceptance Criteria

1. THE frontend SHALL display a sentence library list in reverse chronological order, with each entry showing the original sentence and save timestamp
2. WHEN a user clicks on a record in the sentence library, THE frontend SHALL display the full Analysis_Result, correction comparison, and Color_Coded_View for that sentence
3. WHEN a user clicks the play button on a sentence detail page, THE frontend SHALL play the audio file for that sentence
4. WHEN the Sentence_Library is empty, THE frontend SHALL display an empty state message guiding the user to input their first sentence

### Requirement 10: API Route Design

**User Story:** As a developer, I want the backend to provide clear API endpoints, so that the frontend can reliably interact with the backend.

#### Acceptance Criteria

1. THE backend SHALL provide a POST /api/analyze endpoint that accepts an English sentence and returns the Analysis_Result (including corrections and deep structure analysis) and audio file path
2. THE backend SHALL provide a GET /api/sentences endpoint that returns a list of all Sentence_Records in the Sentence_Library (in reverse chronological order)
3. THE backend SHALL provide a GET /api/sentences/[id] endpoint that returns the complete data for a specified Sentence_Record
4. THE backend SHALL provide a GET /api/audio/[filename] endpoint that returns the specified audio file stream
5. WHEN any API endpoint receives an invalid request, THE backend SHALL return an appropriate HTTP status code and structured error message

### Requirement 11: Inline Context Tag Display

**User Story:** As an English learner, I want the context tag to appear as a small inline badge next to the original sentence, so that it does not take up a separate section and does not interfere with the important sentence structure and vocabulary content.

#### Acceptance Criteria

1. WHEN a sentence has a context tag, THE frontend SHALL display the tag as a small inline badge/chip next to the original sentence text, not as a separate editor section
2. WHEN a user clicks the inline tag badge, THE frontend SHALL open a compact popover or inline editor for editing the tag
3. WHEN a sentence has no context tag, THE frontend SHALL display a small "+" or "Add tag" button inline next to the sentence text
4. THE inline tag display SHALL use a compact, unobtrusive visual style that does not compete with the sentence structure and vocabulary sections for visual attention

### Requirement 12: ColorCodedSentence Bug Fix — Eliminate Text Duplication

**User Story:** As an English learner, I want the color-coded sentence to render correctly without duplicated text, so that I can read the sentence structure clearly.

#### Acceptance Criteria

1. THE ColorCodedSentence component SHALL accept the `correctedSentence` string as a prop and use `startIndex`/`endIndex` from each GrammarComponent to slice and color-code the actual sentence text
2. WHEN GrammarComponents have overlapping or non-contiguous text spans, THE ColorCodedSentence component SHALL fill gaps between components with unstyled text from the `correctedSentence` string
3. THE ColorCodedSentence component SHALL NOT concatenate `comp.text` fields with spaces to reconstruct the sentence display
4. FOR ALL valid correctedSentence strings and GrammarComponent arrays, rendering the ColorCodedSentence SHALL produce text content equal to the full correctedSentence string (round-trip property)

### Requirement 13: Two-Column Analysis Layout

**User Story:** As an English learner, I want the color-coded sentence structure and key vocabulary explanations to be visible together on the same viewport, so that I can study both simultaneously without scrolling.

#### Acceptance Criteria

1. THE frontend SHALL display the analysis section using a layout where the sentence structure (color-coded sentence, clause breakdown, structure analysis) and vocabulary explanations are visible simultaneously
2. WHEN the viewport width is sufficient (desktop), THE frontend SHALL use a two-column layout with sentence structure on the left and vocabulary cards on the right
3. WHEN the viewport width is narrow (mobile), THE frontend SHALL stack the sections vertically with sentence structure on top and vocabulary below
4. THE layout SHALL prioritize the color-coded sentence and vocabulary sections as the most prominent visual elements

### Requirement 14: Concise Vocabulary with Example Sentences

**User Story:** As an English learner, I want each vocabulary word to have a shorter definition but include one example sentence, so that I can quickly understand the word and see it used in context.

#### Acceptance Criteria

1. THE VocabularyItem type SHALL include an `exampleSentence` field containing one example sentence that best demonstrates the word's meaning
2. THE Sentence_Analyzer GPT prompt SHALL instruct the model to generate concise one-sentence definitions instead of multi-sentence definitions for each vocabulary word
3. THE Sentence_Analyzer GPT prompt SHALL instruct the model to generate one example sentence per vocabulary word that is simple enough for CET-4 level learners
4. THE frontend SHALL display each vocabulary item as a compact card showing the word, pronunciation, part of speech, concise definition, example sentence, and difficulty reason
5. THE example sentence in each vocabulary card SHALL be visually distinct (e.g., italic or different color) from the definition text

## Future Improvements

The following features are planned for future iterations but are not part of the current implementation scope:

1. **Word-level audio pronunciation** — Tap individual difficult words to hear them pronounced via TTS
2. **CEFR difficulty level tags** — Mark each vocabulary word with B2/C1/C2 level
3. **Spaced repetition word bank** — Collect difficult words across all sentences into a reviewable word bank with spaced repetition scheduling
4. **Pronunciation recording and comparison** — Let users record themselves saying words/sentences and compare to TTS
