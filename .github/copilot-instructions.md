# MacroChef Project Profile & Ground Rules

## Big Picture
- **App Name:** MacroChef
- **Functionality:** Progressive Web Application (PWA) for fitness meal prepping, caloric/macro control, batch cooking, and zero-waste shopping list generation.
- **Offline Mode:** Must work 100% offline via Service Workers and client-side storage.

## Architectural Constraints (Strictly Enforced)
- **Runtime:** Managed 100% client-side. NO modern JavaScript bundlers, compilers, or build tooling allowed (No Vite, No Webpack, No Next.js, No Ahead-Of-Time build steps).
- **Core Engine:** Single HTML context with dynamic client-side CDNs via `<script>` tags.
- **Framework:** React 18 & ReactDOM 18 exposed as globals (`window.React`, `window.ReactDOM`).
- **Live JSX Compilation:** BANNED from being removed. Compilation MUST be handled live inside the browser context using `@babel/standalone` (`window.Babel`). Never rewrite JSX into raw `React.createElement` or attempt code stripping.
- **Database:** IndexedDB wrapped natively via `Dexie.js` (v3.2.4) exposed as a global instance (`window.db` / `window.Dexie`).
- **Styling & UI:** Tailwind CSS loaded dynamically from standard production script elements. Lucide Icons via dynamic unpkg scripts (`window.lucide`).

## Local-First & Cloud-Ready Programming Rules (Multi-Tenant Agentic Guardrails)
1. **Data Access Layer (DAL):** Absolute ban on direct database calls (`window.db.table`) inside React UI components. All database interactions must be abstracted into global factory functions attached to `window.MacroChef.Repositories`.
2. **Deterministic React 18 Reaktivness (CDN Friendly):** To stream data from Dexie without state tearing, write custom hooks using `window.React.useState` and `window.React.useEffect` combined with `window.Dexie.liveQuery().subscribe()`. Never attempt to import external reactive stores.
3. **Deterministic UUID Generation:** Every table in Dexie must use a text-based string as its primary key. For new records, generate IDs exclusively using the native browser method `window.crypto.randomUUID()`. Do not use auto-increment or external UUID libraries.
4. **Local Multi-Tenancy Security:** All tables must include a `userId` index. Every read, write, and delete repository operation must automatically inject the active user filter: `.where('userId').equals(window.MacroChef.CurrentUserId)`.
5. **Pure Core Logic:** Dietetic algorithms (Mifflin-St Jeor, macronutrient distribution) and i18n translation systems must be written as pure, stateless browser functions attached to `window.MacroChef.Utils`. They must be fully decoupled from React lifecycles to allow isolated offline testing.

## Strict Token & Efficiency Rules
1. **Concise Actionable Output:** For routine code edits, provide concise, copy-pasteable drop-in snippets without filler prose. When explicitly asked for a verification report, audit summary, or SQL migration checklist, output a structured summary of changed files, renamed columns, and test results.
2. **Zero Modular Code:** Absolute ban on modular syntax: do not use `import React from 'react'`, `import Dexie from 'dexie'`, or `export default`. Everything must bind to global browser spaces.
3. **No Redundant Repetitions:** If rewriting code, do not output an entire file unless instructed. Use comment placeholders like `// ... existing code ...` to slice tokens out of unchanged sections.
4. **No New Dev Dependencies:** Banned: Suggesting `npm install` or adding new packages to `package.json`. You ARE permitted and expected to run existing zero-dependency repository scripts (`node build.js`, `npm run build`, `node tests/nutrition.test.js`, `node tests/sw.test.js`).

## Code, Comments & Database Language Standards (Strictly Enforced)
1. **English-Only Identifiers & Database Schema:**
   - ALL code identifiers—including variables, constants, functions, methods, classes, parameters, object keys, CSS classes, file names, **and database table/column names (Supabase PostgreSQL & IndexedDB/Dexie.js)**—MUST be written strictly in **English** (`snake_case` for SQL columns, `camelCase` for JS/IndexedDB).
   - **Legacy Refactoring & Schema Migration Rule:** Whenever you inspect, touch, or refactor existing code or SQL schemas, if you encounter any variable, function, parameter, or database column named in Polish or any non-English language (e.g., `name_pl`, `category_pl`, `batchSteps_pl`, `nazwa`, `skladnik1Nazwa`), **rename it to clear, idiomatic English** across the SQL schema, `js/db.js`, UI components, tests, and CSV importers—and generate an idempotent `ALTER TABLE ... RENAME COLUMN` migration script in `docs/sql/`.
   - *Sole Exception:* User-facing UI translation strings/dictionaries inside `js/i18n/translations.js` (the localized text values displayed to the end user) remain bilingual, though their object keys MUST be in English.
2. **English-Only Code & SQL Comments:**
   - ALL inline comments (`//`, `--`), block comments (`/* */`), and JSDoc/docstrings (`/** */`) across JavaScript, HTML, CSS, and SQL files MUST be written strictly in **English**.
   - **Translation Rule:** Whenever you read, edit, or refactor any file, if you find existing comments written in Polish (or any other non-English language), **translate them accurately into natural technical English** while preserving their original meaning.
