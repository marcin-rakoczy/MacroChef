# MacroChef 🥗 - Calorie & Meal Planner PWA

**MacroChef** is a Progressive Web Application (PWA) designed for fitness meal prepping, caloric & macro control, batch cooking, and zero-waste shopping list generation. It operates completely offline using IndexedDB (`Dexie.js`) and Service Workers, with personalized macro calculation based on fitness goals and individual profiles.

## 🛠️ Technology Stack

| Category | Technologies | Purpose |
|----------|-------------|---------|
| **Runtime** | Client-side Browser (ES6+) | No backend required - 100% offline-capable |
| **UI Framework** | React 18 (via CDN) | Component-based UI with hooks |
| **JSX Compilation** | @babel/standalone | Live in-browser JSX compilation |
| **Styling** | Tailwind CSS + Dark Mode | Responsive, utility-first CSS framework |
| **Icons** | Lucide Icons | Lightweight vector icon library |
| **Database** | IndexedDB (Dexie.js v3.2.4) | Client-side persistent storage |
| **Offline Support** | Service Workers | Stale-While-Revalidate caching strategy |
| **PWA Features** | Web App Manifest | Installable on mobile & desktop |
| **Build Tool** | Node.js + Custom Bundler | Zero-dependency bundler for single-file distribution |
| **Development** | npm scripts | Local dev server, bundling, testing |
| **Internationalization** | Custom i18n System | Bilingual (English & Polish) UI |

### Frontend Stack Details

**React 18 - Global Namespace**
```javascript
// Loaded from CDN, exposed globally
window.React = React
window.ReactDOM = ReactDOM
```

**Babel Standalone**
```javascript
// Live JSX compilation in the browser
@babel/standalone transforms JSX to JS at runtime
```

**Tailwind CSS**
```html
<!-- Loaded from CDN for dynamic styling -->
<script src="https://cdn.tailwindcss.com"></script>
```

**Lucide Icons**
```javascript
// SVG icons library loaded from CDN
window.lucide = lucide
```

**Dexie.js - IndexedDB Wrapper**
```javascript
// Simplified IndexedDB API with promise-based transactions
window.Dexie = Dexie
```

---

## ✨ Core Features

### 1. Goal-Based Personalized Macro Calculation
MacroChef provides scientifically-grounded, personalized daily nutritional recommendations based on user profiles and fitness objectives:

**Four Fitness Goals with Auto-Calculated Macros**:

| Goal | Calorie Adjustment | Protein | Fats | Carbs | Use Case |
|------|------------------|---------|------|-------|----------|
| **Fat Loss** | CPM - 500 kcal | 2.0 g/kg | 30% | Remainder | Weight reduction with muscle preservation |
| **Maintenance** | No adjustment | 1.7 g/kg | 30% | ~45% | Body weight stability & health |
| **Muscle Gain** | CPM + 300 kcal | 1.8 g/kg | 22% | ~54% | Hypertrophy & strength building |
| **Healthy Habits** | CPM (reference) | Manual | Manual | Manual | Health monitoring & micronutrient focus |

**CPM Calculation**:
- Uses **Mifflin–St Jeor formula** for Basal Metabolic Rate (BMR)
- Multiplies by **5-level Physical Activity (PAL)** scale:
  1. Sedentary (PAL: 1.2–1.3)
  2. Low (PAL: 1.4–1.5)
  3. Moderate (PAL: 1.6–1.7)
  4. High (PAL: 1.8–1.9)
  5. Very High / Competitive (PAL: 2.0–2.4)

**Math Consistency**:
- All macros calculated to sum exactly to daily calorie goal (±2 kcal rounding tolerance)
- Atwater constants applied: Protein 4 kcal/g, Carbs 4 kcal/g, Fats 9 kcal/g
- Automatic carb adjustment to maintain exact calorie match

**Example - 50-year-old male, 105kg, low activity**:
- CPM: ~2799 kcal
- Weight Loss (−500 kcal): 210g P(37%), 192g C(33%), 77g F(30%) = 2301 kcal ✓
- Muscle Gain (+300 kcal): 189g P(24%), 415g C(54%), 76g F(22%) = 3100 kcal ✓

### 2. Weekly Meal Planner
- 7-day grid with breakfast, lunch, dinner, snack slots
- Daily macro progress tracking
- Batch cooking optimization across multiple days
- Recipe assignment and meal management

### 3. Recipe Library
- Pre-loaded Mediterranean, Asian, and plant-based recipes
- Macro breakdown per serving (protein, carbs, fats, calories)
- Customizable batch serving sizes
- Full ingredient lists with package sizing

### 4. Batch Cooking Assistant
- Step-by-step interactive cooking guide
- Consolidated ingredient list for entire batch
- Portion control and yield calculations
- Multiple meal preparations from single cooking session

### 5. Zero-Waste Shopping List
- Consolidates weekly meal ingredients
- Whole-package smart rounding (e.g., "buy 2 kg chicken" for 1.8 kg need)
- Highlights surplus amounts for meal planning next week
- Reduces food waste & optimizes budget

### 6. Full Offline Support
- Service Worker with Stale-While-Revalidate strategy
- IndexedDB for persistent user data
- Works 100% offline after first load
- Installable on mobile (iOS/Android) and desktop

### 7. Bilingual UI
- English & Polish translations
- All labels, descriptions, and goal explanations in both languages
- Language toggle in header

---

## 🏗️ Architecture & Design Principles

### No Build Tooling Required
MacroChef deliberately avoids modern JavaScript bundlers (Webpack, Vite, Next.js) to maintain:
- **Minimal complexity**: Plain HTML + CDN scripts
- **Full offline control**: Service Worker caching without build-time optimizations
- **Direct browser API access**: No transpilation, no module resolution
- **Fast startup**: No build process, instant development

### Modular File Structure
Files are organized by responsibility but served as a single Babel-compiled bundle:
```
js/
├── data/          # Static datasets (recipes, meal plans, products)
├── i18n/          # Bilingual dictionaries and React context
├── utils/         # Shopping aggregation and helpers
├── components/    # React components (UI presentation)
├── db.js          # ICalorieRepository contract and Dexie implementation
├── hooks/         # React external-store hooks for live repository queries
├── app.js         # Root component orchestrator
└── main.js        # DOM mount & Service Worker init
src/core/nutrition/ # Pure client-side nutrition calculations
```

### Global Namespace Pattern
All modules attach to `window.MacroChef` namespace:
```javascript
window.MacroChef = {
  TRANSLATIONS: { ... },
  components: { ... },
  macroCalculations: { ... },
  shoppingAggregator: { ... },
  repositories: new DexieCalorieRepository(),
  useRepositoryQuery: function () { ... }
}
```

This allows cross-module communication without import/export syntax while running pure JSX in the browser.

### Nutrition and localization
`src/core/nutrition/calculations.js` exposes stateless Mifflin–St Jeor maintenance estimates, recommended calorie targets, macro distribution and daily totals through `window.MacroChef.macroCalculations`. The UI supplies profile and plan data without modifying the inputs.

`I18nProvider` supplies the current language, dictionary and localized day names through `useI18n`; the provider memoizes its context value by language and persists the selection in localStorage. The dictionaries, provider and nutrition script are included in the service worker's local asset cache for offline use.

### Repository Pattern and React 18 Queries
`ICalorieRepository` defines the data-access contract and `DexieCalorieRepository` implements it. React components call this interface rather than Dexie, keeping IndexedDB details out of the view layer. `useRepositoryQuery` adapts Dexie's `liveQuery` observable to `useSyncExternalStore`, providing stable snapshots and subscriptions compatible with React 18 Concurrent Rendering.

All persisted recipes, products, planner entries and goals use non-incrementing, randomly generated string IDs. Planner entries retain an indexed `dayKey` for display and lookup. Database versions 3 and 4 migrate existing records and update planner recipe references without modifying the bundled starter data.

Repository CRUD operations use an offline mutation decorator. When `navigator.onLine` is `false`, each successful local change and its `OutboxQueue` entry are committed in the same IndexedDB transaction. An entry contains `{ id, table, action, payload, timestamp }`: `create` carries the new record, `delete` carries `{ id }`, and `update` carries either `{ id, value }` for a replacement or `{ id, changes }` for a partial Dexie update. Undefined values in `changes` remove properties and must be preserved by any future consumer. Initial data population and schema migrations are not journaled; direct table writes bypass the decorator. Connectivity is only the browser's online hint, not proof that a server is reachable. IndexedDB failures still reject the operation and roll back both the data and queue entry.

The queue is a local journal, not a synchronization system: there is currently no remote transport, replay, acknowledgement, conflict resolution or automatic cleanup, and online changes are not journaled. Dexie Cloud is not installed or configured. Before enabling it, define migration and ownership of existing records, handle duplicate seeded data and singleton records across devices, exclude `OutboxQueue` using Dexie Cloud's `unsyncedTables`, and avoid replaying journal entries alongside Dexie Cloud's own synchronization.

The browser regression checks at `tests/db.test.html` exercise schema migration, offline CRUD journaling, online writes, and transaction rollback using disposable databases.

### Account scope and future synchronization
The current app remains a guest app using `MacroChefDB`; no authentication or account switching is implemented. `createScopedRepository({ issuer, tenantId, userId })` prepares a separate database and shopping-list storage key for a future authenticated session. Identifiers must come from the verified authentication provider, not user input. The deterministic SHA-256 suffix avoids storing identifiers literally in the database name but is not secret: predictable identifiers can be guessed. Account databases do not seed starter data automatically, and existing guest data is never migrated, claimed, or deleted automatically.

Separate databases prevent accidental mixing, not access by other scripts on the same origin. They do not authenticate users, encrypt data, protect an unlocked session from XSS, or replace server-side tenant authorization. Before using this factory for real accounts, implement session verification and expiry, explicit guest-data migration, account lifecycle and logout policies, and server-side authorization. On account changes, abort synchronization and outstanding requests, unsubscribe live queries, unmount or reset React state, close the previous database, and reject late results from the previous session before opening the next one. Use the returned shopping key only within that lifecycle. The factory itself does not perform those steps.

`AppSyncManager` defines the future `start(scope)`, `requestSync()`, `getStatus()`, `subscribe(listener)`, and `stop()` contract; its methods deliberately throw until an adapter is implemented. An adapter must coalesce sync requests, expose errors/conflicts, cancel work on session changes, and never block local writes on network access. Prefer Dexie Cloud's own sync and authorization mechanisms rather than replaying `OutboxQueue`; exclude that journal from cloud sync. Plan synced schema migrations and initialization separately in accordance with Dexie Cloud's rules. Background Sync is optional and browser-dependent, so resume from the foreground as well; do not persist tokens in the queue.

The service worker caches only the explicit static asset allowlist, not arbitrary GETs, query-string URLs, or requests with an Authorization header. Static assets must always be public and identical for all accounts; private API endpoints must remain outside that list and send `Cache-Control: no-store`. The worker rejects private/no-store responses when populating its cache, but an already cached public response may be served once while a changed response is revalidated. An old pre-update worker can still serve its old cache until the new worker activates. This is not a substitute for server cache headers or access control.

### State Management
- **React Hooks**: Centralized state in `app.js` with context passed to components
- **IndexedDB**: Persistent storage for recipes, meal plans, user profiles
- **Local Variables**: Computed values (macros, shopping lists) recalculated on render

### Caching Strategy (Service Worker)
```javascript
// Stale-While-Revalidate: serve cached, then fetch update
const cached = await caches.match(request);
return cached || fetch(request);
```
Ensures instant offline load while fetching fresh assets in background.

### Math Precision (Macro Calculations)
1. **Input**: User weight (kg), goal, daily calories
2. **Step 1**: Calculate protein (g/kg ratio)
3. **Step 2**: Calculate fats (% of calories)
4. **Step 3**: Calculate carbs (remainder to match calorie goal)
5. **Validation**: `sum(P*4 + C*4 + F*9) = goal ± 2 kcal`
6. **Adjustment**: If needed, increase carbs to force exact match

---

## 💾 Data Persistence & User Profile

### IndexedDB Schema (Dexie.js)
```javascript
{
  recipes: 'id',           // User-created & imported recipes
  planner: 'dayKey',       // Weekly meal plan assignments
  goals: 'id',             // User profile & fitness goals
  products: 'id, name, category' // Ingredient database (Lidl sourced)
}
```

### User Profile Fields
- **Age** (18–120 years)
- **Weight** (kg)
- **Height** (cm)
- **Sex** (Female / Male)
- **Physical Activity Level** (PAL: 1.25, 1.45, 1.65, 1.85, 2.2)
- **Fitness Goal** (Weight Loss, Maintenance, Muscle Gain, Healthy Habits)
- **Daily Calorie Target** (user-set or CPM-based recommendation)

### Calculated & Stored Values
- **BMR** (Mifflin–St Jeor formula result)
- **CPM** (BMR × PAL)
- **Daily Macro Targets** (protein, carbs, fats in grams)
- **Macro Percentages** (% of daily calorie total)

All data syncs to browser IndexedDB on every change, persisting across sessions and enabling 100% offline functionality.

---

## 📱 Progressive Web App (PWA) Features

### Installation
- **Mobile (iOS/Android)**: "Add to Home Screen" installs native-like app
- **Desktop (Windows/Mac/Linux)**: "Install" button via Chrome/Edge browser menu
- **Desktop (Alternative)**: Double-click `macrochef_calorie_meal_planner_pwa.html` to run offline

### Manifest
[manifest.json](/P:/Github/MacroChef/MacroChef/manifest.json) includes:
- App name, short name, description
- Scalable SVG icon + PNG fallbacks (192×192, 512×512)
- Display mode: `standalone` (hides browser UI)
- Theme color: Emerald green (#10b981)

### Offline Capability
- Service Worker (`sw.js`) caches all assets on first visit
- Returns cached version immediately, fetches update in background
- Fully functional without internet connection after initial load

### Icons
- **SVG** ([icon.svg](/P:/Github/MacroChef/MacroChef/icons/icon.svg)): Scalable, retina-perfect
- **PNG 192×192** ([icon-192.png](/P:/Github/MacroChef/MacroChef/icons/icon-192.png)): Android launcher
- **PNG 512×512** ([icon-512.png](/P:/Github/MacroChef/MacroChef/icons/icon-512.png)): Splash screen

---

## 🎨 UI/UX Design

### Styling Framework
- **Tailwind CSS**: Utility-first, responsive design
- **Dark Mode**: System preference detection + manual toggle
- **Components**: Pre-built responsive cards, modals, grids, tabs

### Responsive Breakpoints
```
Mobile:   < 640px  (sm)
Tablet:   640px – 1024px  (md)
Desktop:  > 1024px (lg)
```

### Color Scheme
- **Primary**: Emerald green (#10b981) - health, nutrition, growth
- **Macros**: Green (Protein), Teal (Carbs), Amber (Fats)
- **Alerts**: Red (errors), Yellow (warnings), Blue (info)
- **Dark Mode**: Slate backgrounds with high contrast text

---

## 📁 Refactored Project Structure

```
MacroChef/
├── index.html                   # Main modular PWA entry point
├── manifest.json                # PWA Web App Manifest
├── sw.js                        # Service Worker for offline caching & background sync
├── build.js                     # Zero-dependency build & bundler utility
├── package.json                 # Project configuration & npm scripts
├── css/
│   └── app.css                  # Custom styling, dark mode scrollbars & transitions
├── icons/
│   ├── icon.svg                 # Scalable vector application logo
│   ├── icon-192.png             # Standard 192x192 PWA launcher icon
│   └── icon-512.png             # High-res 512x512 PWA splash icon
├── js/
│   ├── data/
│   │   ├── starterRecipes.js    # Bilingual recipe library (Mediterranean chicken, oats, curry, etc.)
│   │   └── defaultPlan.js       # Default weekly schedule & user nutritional goals
│   ├── i18n/
│   │   ├── translations.js      # English & Polish bilingual UI dictionary
│   │   ├── days.js              # Days of the week definitions & localization
│   │   └── context.js           # Memoized React localization context
│   ├── utils/
│   │   ├── helpers.js           # String manipulation, PascalCase and translation extractors
│   │   └── shoppingAggregator.js# Smart whole-package calculations & zero-waste leftover tracker
│   ├── db.js                    # Dexie.js repositories for persistent data
│   ├── components/
│   │   ├── Icon.js              # Safe Lucide Icon component (prevents React DOM reconciliation conflicts)
│   │   ├── Header.js            # Sticky header with logo, DB offline badge, language & theme toggles
│   │   ├── Navigation.js        # Desktop navigation tabs & mobile bottom navigation bar
│   │   ├── MealPlanner.js       # 7-day schedule grid with meal slots & daily macro progress
│   │   ├── RecipeLibrary.js     # Recipe catalog cards with macro breakdown & actions
│   │   ├── BatchCooking.js      # Interactive step-by-step cooking assistant & full batch ingredients
│   │   ├── ShoppingList.js      # Consolidated whole-package shopping list with zero-waste metrics
│   │   ├── MacroTracker.js      # Calorie and macro goals, user profile, and PAL-based CPM estimate
│   │   └── RecipeModal.js       # Add / Edit recipe dialog with dynamic ingredients & step rows
│   ├── app.js                   # Root React orchestrator managing state & tabs
│   └── main.js                  # DOM mounting & Service Worker registration
├── src/core/nutrition/
│   └── calculations.js          # Pure nutrition calculations
├── dist/
│   └── index.html               # Pre-bundled standalone version
└── macrochef_calorie_meal_planner_pwa.html # Synchronized standalone file for double-click offline execution
```

---

## 🚀 Key Improvements & Refactoring Highlights

1. **Separation of Concerns**:
   - Decoupled data datasets, UI dictionaries, database operations, business calculations, and React presentation components into individual files.
2. **Fixed React & Lucide Icon Conflicts**:
   - Resolved the well-known bug where `lucide.createIcons()` directly mutating DOM nodes broke React's virtual DOM reconciliation, causing disappearing icons or input focus glitches. Replaced with an isolated `Icon` component.
3. **True PWA Offline Readiness**:
   - Created `manifest.json`, scalable SVG + PNG icons, and a custom Service Worker (`sw.js`) utilizing Stale-While-Revalidate caching for instant offline loads and installability on mobile and desktop.
4. **Isolated Business Calculations**:
   - Extracted nutrition calculations and `shoppingAggregator.js` into unit-testable modules.
   - Tested and verified 100% test coverage for macro distribution and whole-package surplus calculations.
---

## 🏗️ Architecture & Design Principles

### No Build Tooling Required
MacroChef deliberately avoids modern JavaScript bundlers (Webpack, Vite, Next.js) to maintain:
- **Minimal complexity**: Plain HTML + CDN scripts
- **Full offline control**: Service Worker caching without build-time optimizations
- **Direct browser API access**: No transpilation, no module resolution
- **Fast startup**: No build process, instant development

### Modular File Structure
Files are organized by responsibility but served as a single Babel-compiled bundle:
```
js/
├── data/          # Static datasets (recipes, meal plans, products)
├── i18n/          # Bilingual dictionaries and React context
├── utils/         # Shopping aggregation and helpers
├── components/    # React components (UI presentation)
├── db.js          # ICalorieRepository contract and Dexie implementation
├── hooks/         # React external-store hooks for live repository queries
├── app.js         # Root component orchestrator
└── main.js        # DOM mount & Service Worker init
src/core/nutrition/ # Pure client-side nutrition calculations
```

### Global Namespace Pattern
All modules attach to `window.MacroChef` namespace:
```javascript
window.MacroChef = {
  TRANSLATIONS: { ... },
  components: { ... },
  macroCalculations: { ... },
  shoppingAggregator: { ... },
  repositories: new DexieCalorieRepository(),
  useRepositoryQuery: function () { ... }
}
```

This allows cross-module communication without import/export syntax while running pure JSX in the browser.

### State Management
- **React Hooks**: Centralized state in `app.js` with context passed to components
- **IndexedDB**: Persistent storage for recipes, meal plans, user profiles
- **Local Variables**: Computed values (macros, shopping lists) recalculated on render

### Caching Strategy (Service Worker)
```javascript
// Stale-While-Revalidate: serve cached, then fetch update
const cached = await caches.match(request);
return cached || fetch(request);
```
Ensures instant offline load while fetching fresh assets in background.

### Math Precision (Macro Calculations)
1. **Input**: User weight (kg), goal, daily calories
2. **Step 1**: Calculate protein (g/kg ratio)
3. **Step 2**: Calculate fats (% of calories)
4. **Step 3**: Calculate carbs (remainder to match calorie goal)
5. **Validation**: `sum(P*4 + C*4 + F*9) = goal ± 2 kcal`
6. **Adjustment**: If needed, increase carbs to force exact match
   - **Modular Development Mode**: Serve [index.html](file:///c:/Repo/Training/MacroChef/index.html) with any web server (`npx serve`, VS Code Live Server, Python `http.server`, etc.).
   - **Zero-Server Standalone Mode**: Run `node build.js` to create or update the self-contained single-file bundle [macrochef_calorie_meal_planner_pwa.html](file:///c:/Repo/Training/MacroChef/macrochef_calorie_meal_planner_pwa.html) or `dist/index.html` for direct local opening (`file://`).

---

## 🛠️ How to Run

### Option 1: Using Any Local Web Server (Recommended for PWA)
```bash
# Using Node.js
npx serve .

# Or using Python
python -m http.server 8000
```
Open `http://localhost:3000` (or `http://localhost:8000`) in your browser.

### Option 2: Standalone Double-Click (Offline)
You can directly open [macrochef_calorie_meal_planner_pwa.html](file:///c:/Repo/Training/MacroChef/macrochef_calorie_meal_planner_pwa.html) or `dist/index.html` in any web browser without running a server.

---

---

## 🧪 Testing and Building

### Build & Bundle
```bash
# Creates single-file bundles (dist/index.html & macrochef_calorie_meal_planner_pwa.html)
npm run build
```

### Development Server
```bash
# Starts local dev server with hot reload
npm start
```

### Testing
```bash
# Run nutrition calculation checks
node tests/nutrition.test.js
node tests/sw.test.js
```
With the development server running, open `tests/i18n.test.html` for the React localization checks and `tests/db.test.html` for the database checks.

### Macro Calculation Validation
The macro calculation system has been validated against Atwater constants:
- **Weight Loss Goal** (2299 kcal): 210g P + 77g F + 192g C = 2301 kcal ✓
- **Maintenance Goal** (2799 kcal): 179g P + 93g F + 312g C = 2801 kcal ✓
- **Muscle Gain Goal** (3099 kcal): 189g P + 76g F + 415g C = 3100 kcal ✓
- All within ±2 kcal rounding tolerance

---

## 🔗 Browser Compatibility

| Browser | Desktop | Mobile (iOS/Android) |
|---------|---------|---------------------|
| Chrome  | ✅ Full support | ✅ PWA installable |
| Firefox | ✅ Full support | ✅ PWA support |
| Safari  | ✅ Full support | ✅ Limited PWA |
| Edge    | ✅ Full support | ✅ PWA installable |

**Minimum Requirements**:
- ES6+ JavaScript support
- IndexedDB API
- Service Workers
- CSS Grid & Flexbox
- Modern React (18+)

---

## 📚 Key Technologies Explained

### Why No Backend?
MacroChef is a **client-side first** application:
- Users' personal data (goals, meals, recipes) stays on their device
- Zero privacy concerns - no data sent to servers
- Full functionality offline
- Instant load times
- No server maintenance required

### Why Babel Standalone?
Allows live JSX compilation in the browser without build tools:
```javascript
// Input (JSX)
<button className="px-4 py-2">Click me</button>

// Babel transforms to:
React.createElement('button', { className: 'px-4 py-2' }, 'Click me')
```

### Why Dexie.js Instead of Raw IndexedDB?
Dexie.js simplifies IndexedDB API:
```javascript
// Raw IndexedDB (verbose)
const db = indexedDB.open('MacroChef');
db.onsuccess = (event) => {
  const store = event.target.result.transaction(['recipes']).objectStore('recipes');
  store.get(id);
};

// Dexie (clean)
const db = new Dexie('MacroChef');
await db.recipes.get(id);
```

### Why Tailwind CSS?
- Utility-first approach = faster prototyping
- Responsive design built-in
- Dark mode support out of the box
- Small bundle size via CDN
- No custom CSS parsing needed

### Why Service Workers?
```
┌─────────────────────┐
│  First Load         │
│  ├─ Fetch all       │
│  ├─ Cache assets    │ → 2-3 seconds
│  └─ Store IndexedDB │
└─────────────────────┘
         ⬇
┌─────────────────────┐
│  Subsequent Loads   │
│  ├─ Serve cached ✓  │ → 100ms (instant)
│  └─ Fetch update    │
│      in background  │
└─────────────────────┘
```

---

## 🎓 Nutritional Science Behind MacroChef

### Mifflin–St Jeor Formula (BMR Calculation)
The industry-standard formula for estimating Basal Metabolic Rate:

**For Men**: `BMR = 10W + 6.25H − 5A + 5`
**For Women**: `BMR = 10W + 6.25H − 5A − 161`

Where:
- **W** = Weight (kg)
- **H** = Height (cm)
- **A** = Age (years)

### Harris–Benedict Activity Factors (PAL)
Physical Activity Level multipliers based on lifestyle:

| Level | PAL Range | Daily Activity |
|-------|-----------|-----------------|
| Sedentary | 1.2–1.3 | Desk job, minimal movement |
| Low | 1.4–1.5 | Seated work + light daily activity |
| Moderate | 1.6–1.7 | Standing/walking job or moderate exercise |
| High | 1.8–1.9 | Demanding job or intense daily training |
| Very High | 2.0–2.4 | Very heavy work or competitive sport |

### Atwater Constants
Energy values (kcal per gram):
- **Protein**: 4 kcal/g
- **Carbohydrates**: 4 kcal/g
- **Fats**: 9 kcal/g
- **Fiber**: ~2 kcal/g (not typically counted)

### Macro Ranges (Evidence-Based)
Based on International Society of Sports Nutrition (ISSN) guidelines:

| Goal | Protein | Fats | Carbs |
|------|---------|------|-------|
| Fat Loss | 1.8–2.2 g/kg | 20–30% | Fill remainder |
| Maintenance | 1.2–1.6 g/kg | 25–35% | 45–65% |
| Muscle Gain | 1.6–2.0 g/kg | 20–30% | 50–55% |

---

## 📝 Notes & Future Roadmap

### Current Limitations
- Recipe database limited to pre-loaded examples (extensible via UI)
- Shopping list sourced from Lidl (local EU/international availability varies)
- Macro calculations don't account for individual metabolic differences

### Planned Features
- [ ] Barcode scanning for instant nutrient lookup
- [ ] Integration with fitness trackers (Apple Health, Google Fit)
- [ ] AI-powered meal suggestions based on goals
- [ ] Recipe scaling and yield adjustments
- [ ] Nutritional data export (PDF, CSV)
- [ ] Social meal plan sharing
- [ ] Voice input for quick logging

### Known Issues
- Safari: Limited PWA installation (iOS < 16.4)
- Dark mode: Some legacy browsers fallback to light theme
- Mobile: Bottom navigation may overlap content on small screens

---

## 📖 Documentation & Resources

- **[IMPLEMENTATION_REPORT.md](/P:/Github/MacroChef/MacroChef/IMPLEMENTATION_REPORT.md)** - Detailed technical implementation
- **[Dexie.js Documentation](https://dexie.org/)** - IndexedDB wrapper docs
- **[Babel Standalone](https://babeljs.io/docs/en/babel-standalone)** - JSX compiler in browser
- **[Tailwind CSS](https://tailwindcss.com/)** - CSS framework docs
- **[Lucide Icons](https://lucide.dev/)** - Icon library reference
- **[Web App Manifest Spec](https://www.w3.org/TR/appmanifest/)** - PWA standards
- **[Service Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)** - Offline support

---

## 📄 License & Attribution

**MacroChef** is an open-source fitness application built with modern web technologies and nutritional science principles.

Developed with ❤️ for fitness enthusiasts, meal prep planners, and zero-waste advocates.

**Technologies**: React 18 • Babel • Tailwind CSS • Lucide Icons • Dexie.js • Service Workers • IndexedDB
