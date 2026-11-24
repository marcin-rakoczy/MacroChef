window.MacroChef = window.MacroChef || {};

window.MacroChef.permissions = {
  canManageRecipes(role) {
    return role === 'Admin' || role === 'Guest';
  },
  canEditRecipe(role, userId, recipe) {
    return this.canManageRecipes(role) && typeof userId === 'string' && userId.length > 0 &&
      Boolean(recipe && recipe.userId === userId);
  },
  showAds(role) {
    return role === 'UserWithAdvertisement';
  }
};
