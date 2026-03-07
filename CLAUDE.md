# Chinese Driving Test Mastery

> SPA study app for mastering the Chinese driving test (Subject 1 / 科目一) question bank

## Overview
React + Vite app with 971 questions across 32 categories. Features spaced repetition (SM-2), mock test simulation (100 questions / 45 min / 90% pass), per-category practice, analytics dashboard, and optional Gemini 2.5 Pro AI explanations citing Chinese traffic law.

## Tech Stack
- React 18 + Vite 7
- Tailwind CSS v4 (via @tailwindcss/vite plugin)
- localStorage for all persistence
- Gemini 2.5 Pro API (optional, for explanations)

## Quick Reference
- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`

## Architecture Notes
- Hash-based routing (no react-router) in App.jsx
- SM-2 spaced repetition algorithm in src/lib/srs.js
- All state in localStorage via src/lib/storage.js (namespaced `drivingApp_*`)
- Dark mode via Tailwind `dark:` variant with class strategy (`@custom-variant dark` in index.css)
- Images served from data/images/ via Vite publicDir
- Traffic law text hardcoded in src/data/trafficLaw.js (61 articles from 2003 law)

## Documentation
- Feature inventory: @docs/FEATURES.md
- Change history: @docs/CHANGELOG.md

## Code Conventions
- Functional components with hooks
- No external routing or state management libraries
- Components organized by feature domain (question/, study/, test/, analytics/, settings/)
