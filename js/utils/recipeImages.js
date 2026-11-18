// Shared recipe image URL normalization and resilient fallback handling
window.MacroChef = window.MacroChef || {};

(function () {
  const DEFAULT_IMAGE_URL = 'images/no-recipe-image.svg';
  const CATEGORY_IMAGES = {
    breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=900&h=900&q=85',
    lunch: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&h=900&q=85',
    dinner: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&h=900&q=85',
    snack: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=900&h=900&q=85',
    fallback: 'https://images.unsplash.com/photo-1543362906-acfc16c67564?auto=format&fit=crop&w=900&h=900&q=85'
  };

  const normalizeCategory = (category) => {
    const value = category && typeof category === 'object'
      ? (category.en || category.pl || '')
      : (category || '');
    return String(value).trim().toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ł/g, 'l');
  };

  const isUsableUrl = (value) => {
    if (typeof value !== 'string' || !value.trim()) return false;
    const url = value.trim();
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../') || url.startsWith('images/')) return true;
    if (!/^https?:\/\//i.test(url) && !/^file:\/\//i.test(url)) return false;
    try {
      const parsed = new URL(url, window.location.href);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'file:';
    } catch (error) {
      return false;
    }
  };

  const normalizeUrl = (value) => isUsableUrl(value) ? value.trim() : DEFAULT_IMAGE_URL;
  const categoryImage = (category) => CATEGORY_IMAGES[normalizeCategory(category)] || CATEGORY_IMAGES.fallback;
  const getUrl = (recipe) => normalizeUrl(recipe && (recipe.imageUrl || recipe.ImageUrl || recipe.image_url));
  const handleError = (event) => {
    const image = event.currentTarget;
    if (image.dataset.fallbackApplied === 'true') return;
    image.dataset.fallbackApplied = 'true';
    image.src = DEFAULT_IMAGE_URL;
  };

  window.MacroChef.recipeImages = {
    DEFAULT_IMAGE_URL,
    CATEGORY_IMAGES,
    categoryImage,
    getUrl,
    handleError,
    isUsableUrl,
    normalizeUrl
  };
})();
