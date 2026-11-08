// Main MacroChef React Application Controller
window.MacroChef = window.MacroChef || {};

(function () {
  const { useState, useEffect, useMemo } = React;
  const {
    Header,
    Navigation,
    MealPlanner,
    RecipeLibrary,
    BatchCooking,
    ShoppingList,
    MacroTracker,
    RecipeModal
  } = window.MacroChef.components;

  const { repositories } = window.MacroChef;
  const { shoppingAggregator } = window.MacroChef;
  const { TRANSLATIONS } = window.MacroChef;
  const { DAYS_KEYS, DAYS_TRANSLATED } = window.MacroChef;
  const { useRepositoryQuery } = window.MacroChef;

  function App() {
    const [activeTab, setActiveTab] = useState('planner');
    const [darkMode, setDarkMode] = useState(() => {
      return localStorage.getItem('macrochef_dark') === 'true';
    });
    const [lang, setLang] = useState(() => {
      return localStorage.getItem('macrochef_lang') || 'pl';
    });
    const [colorTheme, setColorTheme] = useState(() => {
      return localStorage.getItem('macrochef_color_theme') || 'emerald';
    });

    const appData = useRepositoryQuery(
      () => repositories.watchAppData(),
      [repositories],
      null
    );
    const recipes = appData.data ? appData.data.recipes : [];
    const plan = appData.data ? appData.data.plan : {};
    const goals = appData.data
      ? {
          ...window.MacroChef.DEFAULT_GOALS,
          ...appData.data.goals,
          age: appData.data.goals.age ?? '',
          weight: appData.data.goals.weight ?? '',
          height: appData.data.goals.height ?? '',
          sex: appData.data.goals.sex ?? '',
          activityPal: appData.data.goals.activityPal ?? '',
          userGoal: appData.data.goals.userGoal ?? ''
        }
      : window.MacroChef.DEFAULT_GOALS;
    const [checkedShopping, setCheckedShopping] = useState(() => {
      try {
        const saved = localStorage.getItem('macrochef_checked');
        return saved ? JSON.parse(saved) : {};
      } catch (e) {
        return {};
      }
    });

    const [selectedBatchRecipe, setSelectedBatchRecipe] = useState(null);
    const [batchStep, setBatchStep] = useState(0);
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState(null);

    const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
    const daysList = DAYS_TRANSLATED[lang] || DAYS_TRANSLATED.en;

    // Sync preferences to localStorage
    useEffect(() => {
      localStorage.setItem('macrochef_lang', lang);
    }, [lang]);

    useEffect(() => {
      localStorage.setItem('macrochef_dark', String(darkMode));
    }, [darkMode]);

    useEffect(() => {
      localStorage.setItem('macrochef_color_theme', colorTheme);
      document.documentElement.setAttribute('data-color-theme', colorTheme);

      // Update mobile status bar theme-color
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        if (colorTheme === 'violet') {
          metaTheme.setAttribute('content', darkMode ? '#1e1b4b' : '#6366f1');
        } else if (colorTheme === 'mono') {
          metaTheme.setAttribute('content', darkMode ? '#18181b' : '#27272a');
        } else {
          metaTheme.setAttribute('content', darkMode ? '#022c22' : '#10b981');
        }
      }
    }, [colorTheme, darkMode]);

    useEffect(() => {
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }, [darkMode]);

    useEffect(() => {
      localStorage.setItem('macrochef_checked', JSON.stringify(checkedShopping));
    }, [checkedShopping]);

    useEffect(() => {
      repositories.initialize().catch((err) => {
        console.error('Data repository initialization error:', err);
      });
    }, []);

    useEffect(() => {
      if (appData.error) {
        console.error('Data repository subscription error:', appData.error);
      }
    }, [appData.error]);

    // Aggregated Smart Shopping List
    const aggregatedShoppingList = useMemo(() => {
      return shoppingAggregator.calculateShoppingList(plan, recipes, lang);
    }, [plan, recipes, lang]);

    // Handlers
    const handleAssignMeal = async (dayKey, mealType, recipeId) => {
      await repositories.savePlannerSlot(
        dayKey,
        plan[dayKey],
        mealType,
        recipeId
      );
    };

    const handleClearWeek = async () => {
      await repositories.clearPlanner();
    };

    const handleSaveRecipe = async (recipeData) => {
      await repositories.saveRecipe(recipeData);
      setShowRecipeModal(false);
      setEditingRecipe(null);
    };

    const handleDeleteRecipe = async (id) => {
      await repositories.deleteRecipe(id);
      if (selectedBatchRecipe && selectedBatchRecipe.id === id) {
        setSelectedBatchRecipe(null);
      }
    };

    const handleSaveGoals = async (newGoals) => {
      await repositories.saveGoals(newGoals);
    };

    const handleStartBatchCooking = (recipe) => {
      setSelectedBatchRecipe(recipe);
      setBatchStep(0);
      setActiveTab('batch');
    };

    const handleToggleShoppingCheck = (name) => {
      setCheckedShopping((prev) => ({
        ...prev,
        [name]: !prev[name]
      }));
    };

    return (
      <div className={darkMode ? 'dark' : ''}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-200 pb-24 md:pb-8">
          {/* Header */}
          <Header
            t={t}
            lang={lang}
            setLang={setLang}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            colorTheme={colorTheme}
            setColorTheme={setColorTheme}
          />

          {/* Main Layout Container */}
          <main className="max-w-7xl mx-auto px-4 pt-6">
            {/* Desktop Tabs */}
            <Navigation
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              t={t}
              isMobile={false}
            />

            {/* Tab 1: Weekly Planner */}
            {activeTab === 'planner' && (
              <MealPlanner
                t={t}
                lang={lang}
                daysList={daysList}
                daysKeys={DAYS_KEYS}
                plan={plan}
                recipes={recipes}
                goals={goals}
                onAssignMeal={handleAssignMeal}
                onClearWeek={handleClearWeek}
                onCreateRecipe={() => {
                  setEditingRecipe(null);
                  setShowRecipeModal(true);
                }}
              />
            )}

            {/* Tab 2: Recipe Library */}
            {activeTab === 'recipes' && (
              <RecipeLibrary
                t={t}
                lang={lang}
                recipes={recipes}
                onCreateRecipe={() => {
                  setEditingRecipe(null);
                  setShowRecipeModal(true);
                }}
                onEditRecipe={(rec) => {
                  setEditingRecipe(rec);
                  setShowRecipeModal(true);
                }}
                onDeleteRecipe={handleDeleteRecipe}
                onStartBatchCooking={handleStartBatchCooking}
              />
            )}

            {/* Tab 3: Batch Cooking */}
            {activeTab === 'batch' && (
              <BatchCooking
                t={t}
                lang={lang}
                recipes={recipes}
                selectedRecipe={selectedBatchRecipe}
                onSelectRecipe={setSelectedBatchRecipe}
                batchStep={batchStep}
                setBatchStep={setBatchStep}
              />
            )}

            {/* Tab 4: Smart Shopping List */}
            {activeTab === 'shopping' && (
              <ShoppingList
                t={t}
                shoppingList={aggregatedShoppingList}
                checkedShopping={checkedShopping}
                onToggleCheck={handleToggleShoppingCheck}
                onUncheckAll={() => setCheckedShopping({})}
              />
            )}

            {/* Tab 5: Macro & Goals Tracker */}
            {activeTab === 'tracker' && (
              <MacroTracker
                t={t}
                lang={lang}
                goals={goals}
                onSaveGoals={handleSaveGoals}
              />
            )}
          </main>

          {/* Modal Dialog */}
          {showRecipeModal && (
            <RecipeModal
              lang={lang}
              t={t}
              editingRecipe={editingRecipe}
              onClose={() => {
                setShowRecipeModal(false);
                setEditingRecipe(null);
              }}
              onSave={handleSaveRecipe}
            />
          )}

          {/* Mobile Bottom Navigation */}
          <Navigation
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            t={t}
            isMobile={true}
          />
        </div>
      </div>
    );
  }

  window.MacroChef.App = App;
})();
