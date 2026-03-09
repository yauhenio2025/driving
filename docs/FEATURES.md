# Feature Inventory

> Auto-maintained by Claude Code. Last updated: 2026-03-09

## Study

### SRS Study Mode
- **Status**: Active
- **Description**: Spaced repetition study sessions using SM-2 algorithm with previous question navigation
- **Entry Points**:
  - `src/pages/StudyPage.jsx:1-50` - Study page with session launcher
  - `src/components/study/StudySession.jsx:1-349` - Core study loop with auto-advance, explain, prev/next navigation
  - `src/lib/srs.js:1-60` - SM-2 algorithm implementation
  - `src/hooks/useSRS.js:1-55` - SRS state management hook
- **Dependencies**: localStorage, questions.json
- **Added**: 2026-03-07 | **Modified**: 2026-03-09

### Category Practice
- **Status**: Active
- **Description**: Practice all questions in a specific category sequentially
- **Entry Points**:
  - `src/pages/CategoryPage.jsx:1-82` - Category grid with accuracy display and drill mode (stable questionIds)
- **Dependencies**: questions.js, StudySession component
- **Added**: 2026-03-07

### Weak Areas Drill
- **Status**: Active
- **Description**: Targeted practice on lowest-performing categories
- **Entry Points**:
  - `src/pages/WeakAreasPage.jsx:1-55` - Weak areas identification and drill launcher
- **Dependencies**: stats.js, useSRS hook
- **Added**: 2026-03-07

## Testing

### Mock Test Simulation
- **Status**: Active
- **Description**: Full exam simulation (100 questions, 45 min, 90% pass threshold)
- **Entry Points**:
  - `src/components/test/TestSimulation.jsx:1-339` - Test engine with timer, navigation, question map, results, explain in review
- **Dependencies**: useTimer hook, questions.js
- **Added**: 2026-03-07

## Analytics

### Analytics Dashboard
- **Status**: Active
- **Description**: Comprehensive stats with accuracy, activity chart, SRS distribution, category breakdown
- **Entry Points**:
  - `src/components/analytics/Dashboard.jsx:1-180` - Dashboard with charts and stats
  - `src/lib/stats.js:1-75` - Statistics computation functions
- **Dependencies**: localStorage answer log, SRS cards
- **Added**: 2026-03-07

## AI

### Gemini Explanations
- **Status**: Active
- **Description**: Auto-triggered AI explanations on wrong answers with pedagogical structure: contrastive error diagnosis, law citation with safety rationale, vivid mnemonic, and self-test question
- **Entry Points**:
  - `src/lib/gemini.js:22-56` - Pedagogical prompt with 4-section structure (misconception diagnosis, rule + rationale, mnemonic, self-test)
  - `src/lib/gemini.js:58-101` - Gemini API with Google Search grounding and caching
  - `src/components/question/ExplanationPanel.jsx:1-92` - forwardRef explanation panel with save-to-favorites button
  - `src/components/study/StudySession.jsx:220-227` - Auto-trigger on wrong answers
  - `src/data/trafficLaw.js:1-137` - Structured traffic law text with category mapping
- **Dependencies**: Gemini 2.5 Pro API key, trafficLaw.js
- **Added**: 2026-03-07 | **Modified**: 2026-03-09

### Favorites
- **Status**: Active
- **Description**: Save questions with good explanations for later review
- **Entry Points**:
  - `src/pages/FavoritesPage.jsx:1-107` - Browse/expand/remove saved explanations
  - `src/components/question/ExplanationPanel.jsx:33-50` - Save/unsave toggle button
- **Dependencies**: localStorage favorites key, questions.js
- **Added**: 2026-03-07

## UI

### Question Display
- **Status**: Active
- **Description**: Reusable question card with image support, option list, and answer feedback
- **Entry Points**:
  - `src/components/question/QuestionCard.jsx:1-45` - Question text, category badge, image with enlarge
  - `src/components/question/OptionList.jsx:1-35` - Clickable options with correct/wrong highlighting
  - `src/components/question/AnswerFeedback.jsx:1-20` - Correct/wrong banner
- **Added**: 2026-03-07

### Dark Mode
- **Status**: Active
- **Description**: Toggle between light and dark themes
- **Entry Points**:
  - `src/App.jsx:42-45` - Dark mode class toggle on documentElement
  - `src/pages/SettingsPage.jsx:119-127` - Dark mode toggle button
  - `src/index.css:3` - Custom dark variant configuration
- **Added**: 2026-03-07

### Responsive Layout
- **Status**: Active
- **Description**: Desktop sidebar + mobile bottom tab navigation
- **Entry Points**:
  - `src/App.jsx:55-105` - Sidebar (desktop) and bottom nav (mobile)
- **Added**: 2026-03-07

### Keyboard Shortcuts
- **Status**: Active
- **Description**: 1-4 for MC options, R/W for T/F, Enter/Space/Right for next, Left for prev, E to explain, S to save
- **Entry Points**:
  - `src/components/study/StudySession.jsx:153-183` - Study mode shortcuts (1-4, Enter/Space/ArrowRight, ArrowLeft, E, S)
  - `src/components/test/TestSimulation.jsx:168-185` - Test mode shortcuts (1-4, arrows, F)
- **Added**: 2026-03-07 | **Modified**: 2026-03-09

## Settings

### Settings Panel
- **Status**: Active
- **Description**: API key, session size, dark mode toggle, data export/import/reset
- **Entry Points**:
  - `src/pages/SettingsPage.jsx:1-145` - Full settings page
  - `src/hooks/useSettings.js:1-25` - Settings state hook
  - `src/lib/storage.js:1-45` - localStorage abstraction with export/import
- **Added**: 2026-03-07

## Data

### Question Bank
- **Status**: Active
- **Description**: 971 questions (409 T/F, 562 MC) across 32 categories with 424 images
- **Entry Points**:
  - `src/data/questions.js:1-25` - Question indices and lookups
  - `data/questions.json` - Raw question data
  - `data/images/` - 424 question images
- **Added**: 2026-03-07
