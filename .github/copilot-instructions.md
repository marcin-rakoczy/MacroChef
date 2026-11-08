# MacroChef Project Profile & Ground Rules

## Big Picture
- **App Name:** MacroChef
- **Functionality:** Progressive Web Application (PWA) for fitness meal prepping, caloric/macro control, batch cooking, and zero-waste shopping list generation.
- **Offline Mode:** Must work 100% offline via Service Workers and client-side storage.

## Architectural Constraints (Strictly Enforced)
- **Runtime:** Managed client-side. NO modern JavaScript bundlers, compilers, or tooling allowed (No Vite, No Webpack, No Next.js).
- **Core Engine:** Single HTML context with dynamic client-side CDNs via `<script>` tags.
- **Framework:** React 18 & ReactDOM 18 exposed as globals (`window.React`, `window.ReactDOM`).
- **Live JSX Compilation:** Handled live inside the browser context using `@babel/standalone` (`window.Babel`).
- **Database:** IndexedDB wrapped natively via `Dexie.js` (v3.2.4) exposed as a global instance (`window.Dexie`).
- **Styling & UI:** Tailwind CSS loaded dynamically from standard production script elements. Lucide Icons via dynamic unpkg scripts (`window.lucide`).

## Strict Token & Efficiency Rules
1. **Code Snippets Only:** Do not wrap your response in an explanation, summary, setup manual, or execution guide unless explicitly requested. Provide only copy-pasteable, drop-in snippets.
2. **Zero Modular Code:** Absolute ban on modular syntax: do not use `import React from 'react'`, `import Dexie from 'dexie'`, or `export default`. Everything must bind to global browser spaces.
3. **No Redundant Repetitions:** If rewriting code, do not output an entire file unless instructed. Use comment placeholders like `// ... existing code ...` to slice tokens out of unchanged sections.
4. **No Dev Dependencies:** Banned: Suggesting `npm install`, `package.json` updates, or build-step configurations.