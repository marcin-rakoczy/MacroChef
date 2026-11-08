---
applyTo: "**/sw.js"
---
# Service Worker Constraints

- **Scope:** Pure, vanilla, low-level browser web worker runtime context.
- **Banned Libraries:** Banned: React code, Tailwind execution classes, Babel parsing rules, Dexie structures.
- **Directives:** Only provide progressive caching algorithms, cache-first strategies for local static unpkg bundles, and lifecycle listeners (`install`, `activate`, `fetch`).