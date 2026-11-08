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
1. **Code Snippets Only:** Do not wrap your response in an explanation, summary, setup manual, or execution guide unless explicitly requested. Provide only copy-pasteable, drop-in snippets.
2. **Zero Modular Code:** Absolute ban on modular syntax: do not use `import React from 'react'`, `import Dexie from 'dexie'`, or `export default`. Everything must bind to global browser spaces.
3. **No Redundant Repetitions:** If rewriting code, do not output an entire file unless instructed. Use comment placeholders like `// ... existing code ...` to slice tokens out of unchanged sections.
4. **No Dev Dependencies:** Banned: Suggesting `npm install`, `package.json` updates, testing frameworks requiring Node.js, or build-step configurations.
