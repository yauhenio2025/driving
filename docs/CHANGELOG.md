# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- R/W keyboard shortcuts for Right/Wrong on true/false questions in study mode ([src/components/study/StudySession.jsx](src/components/study/StudySession.jsx))
- PostgreSQL backend server with Express: kv_store and diagrams tables, full CRUD API, bulk migrate/export endpoints, SPA fallback ([server/db.js](server/db.js), [server/index.js](server/index.js))
- `npm start` script to launch the production server ([package.json](package.json))

### Fixed
- **CRITICAL: Favorites silently failing to save due to localStorage quota.** Base64 diagram images (~500KB-1MB each) were embedded in favorites, quickly exceeding the 5MB localStorage limit. Moved diagram storage to IndexedDB (hundreds of MB capacity). Favorites now store only metadata; diagrams are loaded from IndexedDB on demand. ([src/lib/diagramStore.js](src/lib/diagramStore.js), [src/lib/gemini.js](src/lib/gemini.js), [src/components/question/ExplanationPanel.jsx](src/components/question/ExplanationPanel.jsx), [src/components/study/StudySession.jsx](src/components/study/StudySession.jsx))
- Added try/catch to explanation cache write in Gemini API to prevent quota errors from breaking the flow ([src/lib/gemini.js](src/lib/gemini.js))
- Reset All Progress now also clears IndexedDB diagram store ([src/lib/storage.js](src/lib/storage.js))

### Changed
- Enabled high thinking level on Nano Banana 2 diagram generation for better prompt adherence and output quality ([src/lib/gemini.js](src/lib/gemini.js))
- Favorites page now shows diagrams from IndexedDB in expanded view ([src/pages/FavoritesPage.jsx](src/pages/FavoritesPage.jsx))
- Gallery page loads diagrams from IndexedDB instead of favorites data ([src/pages/GalleryPage.jsx](src/pages/GalleryPage.jsx))
- Diagram Gallery page: visual grid of saved AI-generated diagrams with full question context (wrong answer, correct answer, explanation) and detail drill-down ([src/pages/GalleryPage.jsx](src/pages/GalleryPage.jsx), [src/App.jsx](src/App.jsx))
- Saving favorites now includes diagram data alongside text explanation ([src/components/question/ExplanationPanel.jsx](src/components/question/ExplanationPanel.jsx), [src/components/study/StudySession.jsx](src/components/study/StudySession.jsx))

### Changed
- Auto-advance countdown reduced from 5s to 3s; Space bar now pauses the timer to linger, Right arrow/Enter advance immediately ([src/components/study/StudySession.jsx](src/components/study/StudySession.jsx))

### Fixed
- **CRITICAL: 419 out of 562 MC questions had wrong correct answers.** Scraper assumed scramble value 0 = correct answer, but scramble values are just display-order shuffling. Re-verified all MC questions against the live site. ([data/questions.json](data/questions.json), [scripts/fix-answers.py](scripts/fix-answers.py))
- Auto-advance countdown bug: CategoryPage recreated questionIds array on every render, causing StudySession to remount and reset state. Fixed by storing shuffled IDs in useState ([src/pages/CategoryPage.jsx](src/pages/CategoryPage.jsx))
- Restored React StrictMode ([src/main.jsx](src/main.jsx))

### Changed
- Revamped explanation prompt with research-backed pedagogical structure: contrastive error diagnosis, safety rationale, vivid mnemonics, and self-test questions ([src/lib/gemini.js](src/lib/gemini.js))
- Explanations now auto-trigger immediately on wrong answers instead of requiring manual "Explain (E)" click ([src/components/study/StudySession.jsx](src/components/study/StudySession.jsx))
- Auto-advance countdown only starts on correct answers; wrong answers pause for reading the explanation ([src/components/study/StudySession.jsx](src/components/study/StudySession.jsx))
- Navigating back to a wrong answer re-shows the cached explanation automatically ([src/components/study/StudySession.jsx](src/components/study/StudySession.jsx))
- Added Nano Banana 2 (Gemini 3.1 Flash Image) visual aid generation — generates educational diagrams (sign comparisons, road scenarios, infographics) informed by the text explanation via sequential pipeline ([src/lib/gemini.js](src/lib/gemini.js), [src/components/question/ExplanationPanel.jsx](src/components/question/ExplanationPanel.jsx))

### Added
- Previous question navigation: Left arrow key or Prev button to go back and review answered questions in their answered state, with "Back to Current" to return to the frontier ([src/components/study/StudySession.jsx](src/components/study/StudySession.jsx))
- Right arrow key as additional shortcut for advancing to next question ([src/components/study/StudySession.jsx](src/components/study/StudySession.jsx))
- 3-second auto-advance countdown after correct answer; Space to pause, Right/Enter to advance ([src/components/study/StudySession.jsx](src/components/study/StudySession.jsx))
- "Explain (E)" button on wrong answers with Gemini AI + Google Search grounding ([src/components/study/StudySession.jsx](src/components/study/StudySession.jsx), [src/components/question/ExplanationPanel.jsx](src/components/question/ExplanationPanel.jsx))
- On-demand explanation triggering via forwardRef + useImperativeHandle ([src/components/question/ExplanationPanel.jsx](src/components/question/ExplanationPanel.jsx))
- Google Search grounding in Gemini API calls for regulation lookups ([src/lib/gemini.js](src/lib/gemini.js))
- Explain button in test results review ([src/components/test/TestSimulation.jsx](src/components/test/TestSimulation.jsx))
- Numbered option labels (1/2/3/4) instead of A/B/C/D ([src/components/question/OptionList.jsx](src/components/question/OptionList.jsx))
- Favorites feature: save questions with good explanations, browse/review/remove them ([src/pages/FavoritesPage.jsx](src/pages/FavoritesPage.jsx), [src/components/question/ExplanationPanel.jsx](src/components/question/ExplanationPanel.jsx))

## [2026-03-07]

### Added
- Project scaffolding with React 18 + Vite 7 + Tailwind CSS v4
- 971-question bank with 32 categories and 424 images ([data/questions.json](data/questions.json))
- SM-2 spaced repetition algorithm ([src/lib/srs.js](src/lib/srs.js))
- SRS-driven study sessions with progress tracking ([src/components/study/StudySession.jsx](src/components/study/StudySession.jsx))
- Category practice mode with per-category accuracy display ([src/pages/CategoryPage.jsx](src/pages/CategoryPage.jsx))
- Mock test simulation: 100 questions, 45-min timer, 90% pass threshold, question map ([src/components/test/TestSimulation.jsx](src/components/test/TestSimulation.jsx))
- Analytics dashboard: accuracy stats, 30-day activity chart, SRS card distribution, category breakdown, weak areas, test history ([src/components/analytics/Dashboard.jsx](src/components/analytics/Dashboard.jsx))
- Weak areas drill targeting lowest-performing categories ([src/pages/WeakAreasPage.jsx](src/pages/WeakAreasPage.jsx))
- Gemini 2.5 Pro AI explanations with Chinese traffic law citations ([src/lib/gemini.js](src/lib/gemini.js))
- Chinese Road Traffic Safety Law (2003) - 61 articles with category-to-chapter mapping ([src/data/trafficLaw.js](src/data/trafficLaw.js))
- Dark mode with Tailwind class strategy
- Responsive layout: desktop sidebar + mobile bottom tabs
- Keyboard shortcuts: 1-4 for options, R/W for T/F, Enter/Space for next, F to flag
- Settings: API key, session size, new cards per session, dark mode, data export/import/reset
- localStorage persistence for all user state (SRS cards, answer log, test results, settings)
