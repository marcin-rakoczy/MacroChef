applyTo: "**/sw.js"
---
# Service Worker Constraints

- **Scope:** Pure, vanilla, low-level browser web worker runtime context (`self`).
- **Banned Libraries:** Banned: React code, Tailwind execution classes, Babel parsing rules, Dexie structures.
- **Directives:** Only provide progressive caching algorithms, cache-first strategies for local static unpkg bundles, and lifecycle listeners (`install`, `activate`, `fetch`).

# Offline Architecture & Integrity Rules
1. **Vanilla ES6 Execution Only:** The service worker file (`sw.js`) must be authored in pure, vanilla JavaScript executable directly by the browser. It must contain no JSX syntax and must never be processed by `@babel/standalone`.
2. **Dynamic HTML & Caching Scope:** The service worker must intercept and cache the single-file production HTML. It must treat the embedded script blocks containing JSX as standard text/html data payload, without modifying or attempting to compile the embedded layout syntax.
3. **Stale-While-Revalidate Implementation:** Enforce a strict Stale-While-Revalidate caching strategy for CDN assets (React, Dexie, Tailwind, Lucide unpkg scripts) to ensure instantaneous application startup even when entirely disconnected.
4. **Background & Crash Resiliency:** Include defensive lifecycle listeners that handle unexpected cache storage corruption (`QuotaExceededError`) without breaking the core global script execution.
