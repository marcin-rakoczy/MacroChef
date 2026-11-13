window.MacroChef = window.MacroChef || {};

window.MacroChef.permissions = {
  canManageRecipes(role) {
    return role === 'Admin' || role === 'Guest';
  },
  showAds(role) {
    return role === 'UserWithAdvertisement';
  }
};
