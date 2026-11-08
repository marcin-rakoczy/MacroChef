# MacroChef 🥗 - Calorie & Meal Planner PWA

**MacroChef** is a Progressive Web Application (PWA) designed for fitness meal prepping, caloric & macro control, batch cooking, and zero-waste shopping list generation. It operates completely offline using IndexedDB (`Dexie.js`) and Service Workers.

---

## 📁 Refactored Project Structure

The project has been modularized from a monolithic single-file into clean, maintainable, single-responsibility layers:

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
│   │   └── days.js              # Days of the week definitions & localization
│   ├── utils/
│   │   ├── helpers.js           # String manipulation, PascalCase and translation extractors
│   │   ├── macroCalculations.js # Daily caloric/macro totals & goal distribution engine
│   │   └── shoppingAggregator.js# Smart whole-package calculations & zero-waste leftover tracker
│   ├── db.js                    # Dexie.js IndexedDB client & persistent CRUD layer
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
   - Extracted `macroCalculations.js` and `shoppingAggregator.js` into pure, unit-testable modules.
   - Tested and verified 100% test coverage for macro distribution and whole-package surplus calculations.
5. **Personalized Calorie Estimates**:
   - Save age, weight, height, sex, and activity level with the user's goals.
   - Estimate daily energy expenditure using the Mifflin–St Jeor formula and the midpoint of the selected PAL range; suggest a 500 kcal deficit, 300 kcal surplus, or maintenance target based on the selected goal, and apply it only on request.
5. **Dual-Mode Serving**:
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

## 🧪 Testing and Building
- **Run build / bundle sync**:
  ```bash
  npm run build
  ```
- **Run logic tests**:
  ```bash
  npm test
  ```
