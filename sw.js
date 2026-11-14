// MacroChef PWA Service Worker
const CACHE_NAME = 'macrochef-v1.0.30';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/data/appVersion.js',
  './js/data/lidlProducts.js',
  './js/data/starterRecipes.js',
  './js/data/defaultPlan.js',
  './js/i18n/translations.js',
  './js/i18n/days.js',
  './js/i18n/context.js',
  './js/utils/helpers.js',
  './js/utils/recipeCsv.js',
  './js/utils/productCatalogCsv.js',
  './src/core/nutrition/calculations.js',
  './js/utils/shoppingAggregator.js',
  './js/supabaseClient.js',
  './js/auth.js',
  './js/permissions.js',
  './js/db.js',
  './js/session/repositoryScope.js',
  './js/sync/AppSyncManager.js',
  './js/hooks/useRepositoryQuery.js',
  './js/components/Icon.js',
  './js/components/AdBanner.js',
  './js/components/AuthModal.js',
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
  './js/components/SessionApp.js',
  './js/main.js'
];

const CDN_ASSETS = [
  { url: 'https://cdn.tailwindcss.com/', mode: 'no-cors' },
  { url: 'https://unpkg.com/react@18/umd/react.production.min.js', mode: 'cors' },
  { url: 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js', mode: 'cors' },
  { url: 'https://unpkg.com/@babel/standalone/babel.min.js', mode: 'no-cors' },
  { url: 'https://unpkg.com/dexie@3.2.4/dist/dexie.js', mode: 'no-cors' },
  { url: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/dist/umd/supabase.min.js', mode: 'cors' },
  { url: 'https://unpkg.com/lucide@latest', mode: 'no-cors' }
];

const STATIC_URLS = new Set(STATIC_ASSETS.map((asset) => new URL(asset, self.registration.scope).href));
const CDN_URLS = new Set(CDN_ASSETS.map((asset) => asset.url));
const isSupabaseApi = (url) => {
  const host = new URL(url).hostname;
  return host === 'supabase.co' || host.endsWith('.supabase.co');
};
const canCache = (response) => response.ok && response.type === 'basic' &&
  !/\b(no-store|private)\b/i.test(response.headers.get('Cache-Control') || '') &&
  response.headers.get('Vary') !== '*';
const canCacheCdn = (response) => response.type === 'opaque' ||
  (response.ok && response.type === 'cors' &&
    !/\b(no-store|private)\b/i.test(response.headers.get('Cache-Control') || '') &&
    response.headers.get('Vary') !== '*');

// Install Event - Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all([
        ...STATIC_ASSETS.map(async (asset) => {
          const response = await fetch(asset);
          if (!canCache(response)) throw new Error(`Cannot cache static asset: ${asset}`);
          await cache.put(asset, response);
        }),
        ...CDN_ASSETS.map(async ({ url, mode }) => {
          const response = await fetch(url, { mode });
          if (!canCacheCdn(response)) throw new Error(`Cannot cache CDN asset: ${url}`);
          await cache.put(url, response);
        })
      ]))
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[MacroChef PWA] Offline installation failed:', error);
        throw error;
      })
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
  const isCdn = CDN_URLS.has(request.url);
  // Network-Only: Supabase API and authenticated requests are never intercepted or cached.
  if (isSupabaseApi(request.url) || request.headers.has('Authorization')) return;
  if (request.method !== 'GET' || (!STATIC_URLS.has(request.url) && !isCdn) ||
      request.headers.has('Authorization') ||
      /\bno-store\b/i.test(request.headers.get('Cache-Control') || '')) return;

  let refresh = Promise.resolve();
  const response = caches.open(CACHE_NAME).catch((error) => {
    console.error('[MacroChef PWA] Cache unavailable:', error);
    return null;
  }).then(async (cache) => {
    if (!cache) return fetch(request);
    let cached;
    try {
      cached = await cache.match(request);
    } catch (error) {
      console.error('[MacroChef PWA] Cache read failed:', error);
    }
    const network = fetch(request).then(async (fresh) => {
      if (isCdn ? canCacheCdn(fresh) : canCache(fresh)) {
        try {
          await cache.put(request, fresh.clone());
        } catch (error) {
          console.error('[MacroChef PWA] Cache update failed:', error);
        }
      }
      else if (fresh.ok) {
        try {
          await cache.delete(request);
        } catch (error) {
          console.error('[MacroChef PWA] Cache removal failed:', error);
        }
      }
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
