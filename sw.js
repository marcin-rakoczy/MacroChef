// MacroChef PWA Service Worker
const CACHE_NAME = 'macrochef-v6';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './icons/icon.svg',
  './js/data/lidlProducts.js',
  './js/data/starterRecipes.js',
  './js/data/defaultPlan.js',
  './js/i18n/translations.js',
  './js/i18n/days.js',
  './js/i18n/context.js',
  './js/utils/helpers.js',
  './src/core/nutrition/calculations.js',
  './js/utils/shoppingAggregator.js',
  './js/db.js',
  './js/hooks/useRepositoryQuery.js',
  './js/components/Icon.js',
  './js/components/Header.js',
  './js/components/Navigation.js',
  './js/components/RecipePickerModal.js',
  './js/components/MealPlanner.js',
  './js/components/RecipeLibrary.js',
  './js/components/BatchCooking.js',
  './js/components/ShoppingList.js',
  './js/components/MacroTracker.js',
  './js/components/RecipeModal.js',
  './js/app.js',
  './js/main.js'
];

// Install Event - Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-While-Revalidate Strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip chrome-extension and unsupported schemes
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
