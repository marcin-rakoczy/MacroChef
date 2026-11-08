// MacroChef PWA Service Worker
const CACHE_NAME = 'macrochef-v8';

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
  './js/session/repositoryScope.js',
  './js/sync/AppSyncManager.js',
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

const STATIC_URLS = new Set(STATIC_ASSETS.map((asset) => new URL(asset, self.registration.scope).href));
const canCache = (response) => response.ok && response.type === 'basic' &&
  !/\b(no-store|private)\b/i.test(response.headers.get('Cache-Control') || '') &&
  response.headers.get('Vary') !== '*';

// Install Event - Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(STATIC_ASSETS.map(async (asset) => {
        const response = await fetch(asset);
        if (!canCache(response)) throw new Error(`Cannot cache static asset: ${asset}`);
        await cache.put(asset, response);
      })))
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
            .filter((key) => key.startsWith('macrochef-v') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-While-Revalidate Strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || !STATIC_URLS.has(request.url) ||
      request.headers.has('Authorization') ||
      /\bno-store\b/i.test(request.headers.get('Cache-Control') || '')) return;

  let refresh = Promise.resolve();
  const response = caches.open(CACHE_NAME).then(async (cache) => {
    const cached = await cache.match(request);
    const network = fetch(request).then(async (fresh) => {
      if (canCache(fresh)) await cache.put(request, fresh.clone());
      else if (fresh.ok) await cache.delete(request);
      return fresh;
    });
    if (cached) {
      refresh = network.catch((error) => {
        console.warn('[MacroChef PWA] Static asset refresh failed:', error);
      });
      return cached;
    }
    return network;
  });
  event.respondWith(response);
  event.waitUntil(response.then(() => refresh).catch((error) => {
    console.warn('[MacroChef PWA] Static asset request failed:', error);
  }));
});
