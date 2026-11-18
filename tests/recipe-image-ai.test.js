const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const calls = [];
let providerFailure = null;
const storage = new Map();
const client = {
  functions: {
    async invoke(name, options) {
      calls.push({ name, operation: options.body.operation, body: options.body });
      if (providerFailure) return { data: null, error: new Error(providerFailure) };
      if (options.body.operation === 'verify') {
        const wrongDish = options.body.imageSource === 'https://source.test/wrong.jpg';
        return {
          data: {
            valid: !wrongDish,
            matchesRecipe: !wrongDish,
            matchesStyle: false
          }
        };
      }
      return { data: { imageUrl: `${options.body.operation}://result.webp` } };
    }
  }
};
const window = {
  MacroChef: {
    AI_CONFIG: { enabled: true, functionName: 'generate-recipe-image', timeoutMs: 1000 },
    recipeImages: {
      DEFAULT_IMAGE_URL: 'images/no-recipe-image.svg',
      categoryImage: () => 'https://fallback.test/category.jpg'
    },
    supabaseClient: client
  },
  crypto: { randomUUID: () => 'uuid' },
  location: { href: 'https://macrochef.test/' },
  addEventListener() {},
  dispatchEvent() {}
};
const context = {
  window,
  navigator: { onLine: true },
  localStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value)
  },
  URL,
  fetch,
  Blob,
  setTimeout,
  clearTimeout,
  console,
  CustomEvent: class CustomEvent {
    constructor(type, options) {
      this.type = type;
      this.detail = options.detail;
    }
  }
};
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', 'js', 'services', 'recipeImageAI.js'), 'utf8'),
  context
);

const ai = window.MacroChef.recipeImageAI;
const recipe = {
  id: 'recipe-1',
  name: { pl: 'Kurczak z ryżem', en: 'Chicken and rice' },
  category: { pl: 'Obiad', en: 'Lunch' },
  ingredients: [{ name: { pl: 'Kurczak', en: 'Chicken' } }, { name: { pl: 'Ryż', en: 'Rice' } }]
};

(async () => {
  calls.length = 0;
  const importedWithImage = await ai.processRecipeImage({ ...recipe, imageUrl: 'https://source.test/dish.jpg' });
  assert.deepEqual(calls.map((call) => call.operation), ['verify', 'restylize']);
  assert.equal(importedWithImage.imageUrl, 'restylize://result.webp');

  calls.length = 0;
  const mismatch = await ai.verifyRecipeImage('https://source.test/wrong.jpg', recipe);
  assert.equal(mismatch.matchesStyle, false);
  calls.length = 0;
  const repaired = await ai.processRecipeImage({ ...recipe, imageUrl: 'https://source.test/wrong.jpg' });
  assert.deepEqual(calls.map((call) => call.operation), ['verify', 'generate']);
  assert.equal(repaired.imageUrl, 'generate://result.webp');

  calls.length = 0;
  const importedWithoutImage = await ai.processRecipeImage({ ...recipe, imageUrl: '' });
  assert.deepEqual(calls.map((call) => call.operation), ['generate']);
  assert.equal(importedWithoutImage.imageUrl, 'generate://result.webp');
  const generationPrompt = calls[0].body.prompt;
  assert.match(generationPrompt, /Kurczak z ryżem/);
  assert.match(generationPrompt, /Kurczak, Ryż/);
  assert.match(generationPrompt, /85mm f\/2\.8/);

  calls.length = 0;
  const editedWithNewImage = await ai.processRecipeImage(
    { ...recipe, imageUrl: 'https://upload.test/new.jpg' },
    { originalRecipe: { ...recipe, imageUrl: 'https://old.test/image.jpg' } }
  );
  assert.deepEqual(calls.map((call) => call.operation), ['verify', 'restylize']);
  assert.equal(editedWithNewImage.imageUrl, 'restylize://result.webp');

  calls.length = 0;
  const editedWithoutNewImage = await ai.processRecipeImage(
    { ...recipe, imageUrl: 'https://old.test/image.jpg' },
    { originalRecipe: { ...recipe, imageUrl: 'https://old.test/image.jpg' } }
  );
  assert.equal(calls.length, 0);
  assert.equal(editedWithoutNewImage.imageUrl, 'https://old.test/image.jpg');

  providerFailure = 'Edge Function rejected request';
  await assert.rejects(
    ai.generateRecipeImage(recipe, { strict: true }),
    /Edge Function rejected request/
  );
  providerFailure = null;

  console.log('PASS: AI recipe image import, generation, edit restyling, and preservation rules');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
