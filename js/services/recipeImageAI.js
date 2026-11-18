// Configurable AI verification, generation and style harmonization for recipe images
window.MacroChef = window.MacroChef || {};

(function () {
  const SIGNATURE_STYLE = {
    name: 'MacroChef Signature Food Photography Style',
    prompt: [
      'Editorial commercial food photography, hyper-photorealistic, appetizing and mouth-watering.',
      'Warm natural directional morning daylight, 85mm f/2.8 lens look, shallow depth of field.',
      'Crisp fresh ingredients, realistic steam and texture highlights, clean modern ceramic tableware.',
      'Bright minimalist stone or wooden kitchen surface, subtle fresh herbs and garnish matching the ingredients.',
      'Accurate dish identity, square 1:1 composition, no text, labels, logos or watermarks.'
    ].join(' ')
  };
  const QUEUE_KEY = 'macrochef_recipe_image_ai_queue';
  const config = window.MacroChef.AI_CONFIG || {};
  const listeners = new Set();
  let processingQueue = false;

  const localizedText = (value, lang = 'pl') => {
    if (value && typeof value === 'object') return value[lang] || value.pl || value.en || '';
    return value || '';
  };
  const ingredientNames = (recipe) => (recipe.ingredients || [])
    .map((ingredient) => localizedText(ingredient.name))
    .filter(Boolean);
  const buildPrompt = (recipe) => {
    const ingredients = ingredientNames(recipe);
    return `${SIGNATURE_STYLE.prompt} Photograph: ${localizedText(recipe.name) || 'a recipe'}. ` +
      `Category: ${localizedText(recipe.category) || 'meal'}. ` +
      (recipe.description ? `Description: ${recipe.description}. ` : '') +
      (ingredients.length ? `Use and accurately represent: ${ingredients.join(', ')}. ` : '') +
      'Avoid invented dishes and omit the listed garnish if it does not belong to the recipe.';
  };
  const notify = (status) => listeners.forEach((listener) => listener(status));
  const hasClient = () => Boolean(window.MacroChef.supabaseClient);
  const online = () => navigator.onLine !== false;
  const canCallProvider = () => hasClient() && online() && config.enabled !== false;
  const isPlaceholder = (source) => !source ||
    source === window.MacroChef.recipeImages.DEFAULT_IMAGE_URL;

  const readQueue = () => {
    try {
      const value = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.warn('Could not read recipe image AI queue:', error);
      return [];
    }
  };
  const writeQueue = (queue) => {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.warn('Could not persist recipe image AI queue:', error);
    }
  };
  const enqueue = (recipe, operation, imageSource) => {
    const queue = readQueue();
    if (queue.some((item) => item.recipe.id === recipe.id && item.operation === operation &&
      item.imageSource === imageSource)) return;
    queue.push({
      recipe: { ...recipe, ingredients: (recipe.ingredients || []).map((item) => ({ ...item })) },
      operation,
      imageSource,
      attempts: 0,
      queuedAt: Date.now()
    });
    writeQueue(queue);
  };

  async function invokeProvider(operation, recipe, imageSource) {
    if (!canCallProvider()) throw new Error('AI provider unavailable');
    const client = window.MacroChef.supabaseClient;
    const invocation = client.functions.invoke(config.functionName || 'generate-recipe-image', {
      body: {
        operation,
        recipe: {
          id: recipe.id,
          name: recipe.name,
          category: recipe.category,
          description: recipe.description || '',
          ingredients: recipe.ingredients || []
        },
        imageSource: imageSource || null,
        prompt: buildPrompt(recipe),
        style: SIGNATURE_STYLE
      }
    });
    const timeout = Number(config.timeoutMs) || 120000;
    const result = await Promise.race([
      invocation,
      new Promise((resolve, reject) => setTimeout(
        () => reject(new Error('AI provider timed out')),
        timeout
      ))
    ]);
    if (result.error) throw result.error;
    return result.data || {};
  }

  async function dataUrlToBlob(dataUrl) {
    const response = await fetch(dataUrl);
    return await response.blob();
  }

  async function persistImage(result, recipe) {
    const source = result.imageUrl || result.imageDataUrl || result.dataUrl;
    if (!source) throw new Error('AI provider returned no image');
    if (!String(source).startsWith('data:') || !hasClient() || !online()) return source;
    const userResult = await window.MacroChef.supabaseClient.auth.getUser();
    if (userResult.error || !userResult.data.user) return source;
    const blob = await dataUrlToBlob(source);
    const safeId = recipe.id || window.crypto.randomUUID();
    const path = `${userResult.data.user.id}/${safeId}-${Date.now()}.webp`;
    const upload = await window.MacroChef.supabaseClient.storage
      .from(config.storageBucket || 'recipe-images')
      .upload(path, blob, { contentType: blob.type || 'image/webp', upsert: true });
    if (upload.error) throw upload.error;
    const publicUrl = window.MacroChef.supabaseClient.storage
      .from(config.storageBucket || 'recipe-images')
      .getPublicUrl(path);
    return publicUrl.data.publicUrl;
  }

  const fallback = (recipe, imageSource) => {
    if (imageSource && !isPlaceholder(imageSource)) return imageSource;
    return window.MacroChef.recipeImages.categoryImage(recipe.category);
  };

  async function verifyRecipeImage(imageSource, recipe) {
    if (isPlaceholder(imageSource)) return { valid: false, matchesRecipe: false, matchesStyle: false, reason: 'placeholder' };
    try {
      const result = await invokeProvider('verify', recipe, imageSource);
      return {
        valid: result.valid !== false,
        matchesRecipe: result.matchesRecipe !== false,
        matchesStyle: result.matchesStyle === true,
        reason: result.reason || '',
        providerAvailable: true
      };
    } catch (error) {
      console.warn('Recipe image verification unavailable:', error);
      return {
        valid: Boolean(imageSource),
        matchesRecipe: false,
        matchesStyle: false,
        reason: error.message,
        providerAvailable: false
      };
    }
  }

  async function restylizeRecipeImage(imageSource, recipe, options = {}) {
    if (!imageSource || isPlaceholder(imageSource)) return generateRecipeImage(recipe);
    try {
      const result = await invokeProvider('restylize', recipe, imageSource);
      return await persistImage(result, recipe);
    } catch (error) {
      if (options.strict) throw error;
      enqueue(recipe, 'restylize', imageSource);
      console.warn('Recipe image restyling queued:', error);
      return fallback(recipe, imageSource);
    }
  }

  async function generateRecipeImage(recipe, options = {}) {
    try {
      const result = await invokeProvider('generate', recipe, null);
      return await persistImage(result, recipe);
    } catch (error) {
      if (options.strict) throw error;
      enqueue(recipe, 'generate', null);
      console.warn('Recipe image generation queued:', error);
      return fallback(recipe);
    }
  }

  async function processRecipeImage(recipe, options = {}) {
    const originalImage = options.originalRecipe && options.originalRecipe.imageUrl;
    const imageChanged = options.force === true ||
      (options.changed !== undefined
        ? options.changed
        : (!options.originalRecipe ? true : recipe.imageUrl !== originalImage));
    if (!imageChanged && options.originalRecipe) return { ...recipe, imageUrl: originalImage };
    const report = options.onStatus || (() => {});
    const source = recipe.imageUrl;
    let verification;
    let imageUrl;
    if (source && !isPlaceholder(source)) {
      report('verifyingRecipeImage');
      verification = await verifyRecipeImage(source, recipe);
      if (verification.providerAvailable !== false &&
          (!verification.valid || !verification.matchesRecipe)) {
        report('generatingRecipeImage');
        imageUrl = await generateRecipeImage(recipe, { strict: options.strict === true });
      } else {
        report('restylizingRecipeImage');
        imageUrl = await restylizeRecipeImage(source, recipe, { strict: options.strict === true });
      }
    } else {
      report('generatingRecipeImage');
      imageUrl = await generateRecipeImage(recipe, { strict: options.strict === true });
    }
    return { ...recipe, imageUrl, imageVerification: verification || null };
  }

  async function processBatch(recipes, options = {}) {
    const results = [];
    for (let index = 0; index < recipes.length; index++) {
      notify({ current: index + 1, total: recipes.length, recipe: recipes[index] });
      if (options.onProgress) options.onProgress(index + 1, recipes.length, recipes[index]);
      results.push(await processRecipeImage(recipes[index], {
        onStatus: (status) => options.onStatus && options.onStatus(status, index + 1, recipes.length)
      }));
    }
    return results;
  }

  async function processQueue() {
    if (processingQueue || !canCallProvider()) return;
    processingQueue = true;
    const queue = readQueue();
    const remaining = [];
    try {
      for (const item of queue) {
        try {
          const processed = await processRecipeImage({
            ...item.recipe,
            imageUrl: item.imageSource || window.MacroChef.recipeImages.DEFAULT_IMAGE_URL
          }, { force: true });
          window.dispatchEvent(new CustomEvent('macrochef:recipe-image-ready', { detail: processed }));
        } catch (error) {
          remaining.push({ ...item, attempts: item.attempts + 1 });
        }
      }
      writeQueue(remaining);
    } finally {
      processingQueue = false;
    }
  }

  async function prepareFile(file) {
    if (!file || !file.type.startsWith('image/')) throw new TypeError('An image file is required');
    const maxBytes = Number(config.maxUploadBytes) || 12 * 1024 * 1024;
    if (file.size > maxBytes) throw new Error('Recipe image is too large');
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    const size = Math.min(Number(config.imageSize) || 1024, bitmap.width, bitmap.height);
    canvas.width = size;
    canvas.height = size;
    const side = Math.min(bitmap.width, bitmap.height);
    const sourceX = (bitmap.width - side) / 2;
    const sourceY = (bitmap.height - side) / 2;
    canvas.getContext('2d').drawImage(bitmap, sourceX, sourceY, side, side, 0, 0, size, size);
    bitmap.close();
    return canvas.toDataURL('image/webp', 0.86);
  }

  window.addEventListener('online', () => processQueue());
  window.MacroChef.recipeImageAI = {
    SIGNATURE_STYLE,
    buildPrompt,
    verifyRecipeImage,
    restylizeRecipeImage,
    generateRecipeImage,
    processRecipeImage,
    processBatch,
    processQueue,
    prepareFile,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
})();
