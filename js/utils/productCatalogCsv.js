window.MacroChef = window.MacroChef || {};

(function () {
  const categoryNames = {
    meat: { pl: 'Mięso i Ryby', en: 'Meat & Fish' },
    dairy: { pl: 'Nabiał i Jaja', en: 'Dairy & Eggs' },
    grains: { pl: 'Produkty Zbożowe', en: 'Grains & Pasta' },
    veggies: { pl: 'Warzywa i Owoce', en: 'Vegetables & Fruits' },
    fats: { pl: 'Tłuszcze i Dodatki', en: 'Fats & Extras' },
    other: { pl: 'Inne', en: 'Other' }
  };

  const toCsv = (products) => {
    if (!Array.isArray(products) || products.length === 0) {
      throw new TypeError('The product catalog is empty or unavailable.');
    }

    const rows = [[
      'id', 'name_pl', 'name_en', 'category', 'category_pl', 'category_en', 'unit', 'package_size'
    ]];
    products.forEach((product) => {
      if (!product || typeof product !== 'object' || typeof product.id !== 'string' || !product.id) {
        throw new TypeError('Every catalog product must have a string ID.');
      }
      const name = typeof product.name === 'object'
        ? product.name
        : { pl: product.name, en: product.name };
      const categoryName = product.categoryName || categoryNames[product.category] || {};
      rows.push([
        product.id,
        name.pl || name.en || '',
        name.en || name.pl || '',
        product.category || '',
        categoryName.pl || product.category || '',
        categoryName.en || product.category || '',
        product.unit || '',
        product.packageSize === undefined || product.packageSize === null ? '' : product.packageSize
      ]);
    });

    const quote = (value) => `"${String(value).replace(/"/g, '""')}"`;
    return `\uFEFF${rows.map((row) => row.map(quote).join(';')).join('\r\n')}`;
  };

  window.MacroChef.productCatalogCsv = { toCsv };
})();
