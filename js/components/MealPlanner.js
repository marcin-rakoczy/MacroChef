// Three-day meal planner tab component
window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { Icon, RecipePickerModal } = window.MacroChef.components;
  const { getLocalized } = window.MacroChef.helpers;
  const { getDailyTotals } = window.MacroChef.macroCalculations;
  const MIN_SWIPE_DISTANCE = 50;

  function MealPlanner({
    daysKeys,
    plan,
    recipes,
    goals,
    onAssignMeal,
    onClearWeek,
    onCreateRecipe
  }) {
    const { t, lang } = window.MacroChef.useI18n();
    const [dayOffset, setDayOffset] = React.useState(0);
    const [pickerSlot, setPickerSlot] = React.useState(null);
    const [swipeDelta, setSwipeDelta] = React.useState(0);
    const [transitionDirection, setTransitionDirection] = React.useState('');
    const touchRef = React.useRef({ startX: 0, startY: 0, currentX: 0, currentY: 0 });

    const mealSlots = [
      { key: 'Breakfast', label: t.breakfast },
      { key: 'Lunch', label: t.lunch },
      { key: 'Dinner', label: t.dinner },
      { key: 'Snack', label: t.snack }
    ];

    const moveDays = (amount) => {
      setTransitionDirection(amount < 0 ? 'previous' : 'next');
      setDayOffset((current) => current + amount);
    };

    React.useEffect(() => {
      const handleKeyDown = (event) => {
        const target = event.target;
        if (target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        )) return;
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          moveDays(-1);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          moveDays(1);
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const dateAtOffset = (offset) => {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() + offset);
      return date;
    };

    const getDayKey = (date) => daysKeys[(date.getDay() + 6) % 7];
    const locale = lang === 'pl' ? 'pl-PL' : 'en-US';
    const formatDate = (date) => date.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'short'
    });
    const formatShortDate = (date) => date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short'
    });
    const relativeLabels = {
      0: t.today,
      1: t.tomorrow,
      2: t.dayAfterTomorrow
    };
    const visibleDays = [0, 1, 2].map((position) => {
      const absoluteOffset = dayOffset + position;
      const date = dateAtOffset(absoluteOffset);
      return {
        position,
        dayKey: getDayKey(date),
        date,
        relativeLabel: relativeLabels[absoluteOffset] || ''
      };
    });

    const handleOpenPicker = (dayKey, dayName, slotKey, slotLabel, currentId) => {
      setPickerSlot({
        dayKey,
        dayName,
        slotKey,
        slotLabel,
        currentId: currentId || ''
      });
    };

    const handleTouchStart = (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      touchRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY
      };
      setSwipeDelta(0);
    };

    const handleTouchMove = (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      touchRef.current.currentX = touch.clientX;
      touchRef.current.currentY = touch.clientY;
      const deltaX = touch.clientX - touchRef.current.startX;
      const deltaY = touch.clientY - touchRef.current.startY;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        setSwipeDelta(Math.max(-70, Math.min(70, deltaX * 0.35)));
      }
    };

    const handleTouchEnd = (event) => {
      const touch = event.changedTouches[0];
      const endX = touch ? touch.clientX : touchRef.current.currentX;
      const endY = touch ? touch.clientY : touchRef.current.currentY;
      const deltaX = endX - touchRef.current.startX;
      const deltaY = endY - touchRef.current.startY;
      setSwipeDelta(0);
      if (Math.abs(deltaX) < MIN_SWIPE_DISTANCE || Math.abs(deltaX) <= Math.abs(deltaY)) return;
      moveDays(deltaX < 0 ? 1 : -1);
    };

    const firstVisibleDate = formatShortDate(visibleDays[0].date);
    const lastVisibleDate = formatShortDate(visibleDays[2].date);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Icon name="calendar" className="w-5 h-5 text-emerald-500" />
              <span>{t.threeDaySchedule}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.threeDaySub}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {dayOffset !== 0 && (
              <button
                type="button"
                onClick={() => {
                  setTransitionDirection(dayOffset < 0 ? 'next' : 'previous');
                  setDayOffset(0);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-900/50 transition-colors"
              >
                <Icon name="calendar-days" className="w-3.5 h-3.5" />
                <span>{t.today}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClearWeek}
              className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 transition-colors"
            >
              <Icon name="rotate-ccw" className="w-3.5 h-3.5" />
              <span>{t.clearWeek}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white dark:bg-slate-800 px-3 py-2 border border-slate-200 dark:border-slate-700 shadow-sm">
          <button
            type="button"
            onClick={() => moveDays(-1)}
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            title={t.previousDay}
            aria-label={t.previousDay}
          >
            <Icon name="chevron-left" className="w-5 h-5" />
          </button>
          <div className="text-center min-w-0">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {firstVisibleDate} – {lastVisibleDate}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 md:hidden mt-0.5">
              {t.swipeHint}
            </div>
          </div>
          <button
            type="button"
            onClick={() => moveDays(1)}
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            title={t.nextDay}
            aria-label={t.nextDay}
          >
            <Icon name="chevron-right" className="w-5 h-5" />
          </button>
        </div>

        <div
          className="meal-planner-swipe overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => setSwipeDelta(0)}
        >
          <div
            key={dayOffset}
            className={`meal-planner-grid grid grid-cols-1 md:grid-cols-3 gap-4 ${
              transitionDirection ? `planner-grid-${transitionDirection}` : ''
            }`}
            style={{ transform: swipeDelta ? `translateX(${swipeDelta}px)` : undefined }}
          >
            {visibleDays.map(({ position, dayKey, date, relativeLabel }) => {
              const totals = getDailyTotals(dayKey, plan, recipes);
              const calPercent = Math.min(100, Math.round((totals.calories / (goals.calories || 2000)) * 100));
              const formattedDate = formatDate(date);
              const dayTitle = relativeLabel
                ? `${relativeLabel}, ${formattedDate}`
                : formattedDate;

              return (
                <div
                  key={`${dayOffset}-${position}`}
                  className={`bg-white dark:bg-slate-800 rounded-2xl border p-4 shadow-sm flex-col justify-between hover:shadow-md transition-shadow ${
                    position === 0
                      ? 'flex border-emerald-300 dark:border-emerald-800/80 ring-1 ring-emerald-100 dark:ring-emerald-950/60'
                      : 'hidden md:flex border-slate-200 dark:border-slate-700/80'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60 mb-3">
                      <div className="min-w-0">
                        {relativeLabel && (
                          <span className="inline-flex mb-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                            {relativeLabel}
                          </span>
                        )}
                        <div className="font-bold text-slate-800 dark:text-slate-100 capitalize truncate">
                          {formattedDate}
                        </div>
                      </div>
                      <div className="text-right shrink-0 pt-0.5">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {totals.calories} / {goals.calories} kcal
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mb-4">
                      <div
                        className={`h-full transition-all duration-300 ${
                          calPercent > 105
                            ? 'bg-amber-500'
                            : calPercent > 90
                            ? 'bg-emerald-500'
                            : 'bg-teal-400'
                        }`}
                        style={{ width: `${calPercent}%` }}
                      />
                    </div>

                    <div className="space-y-3">
                      {mealSlots.map((slot) => {
                        const assignedId = plan[dayKey]?.[slot.key];
                        const recipe = recipes.find((item) => item.id === assignedId);

                        return (
                          <div
                            key={slot.key}
                            className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80"
                          >
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                              <span>{slot.label}</span>
                              {recipe && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  {recipe.calories} kcal
                                </span>
                              )}
                            </div>

                            {!recipe ? (
                              <button
                                type="button"
                                onClick={() => handleOpenPicker(dayKey, dayTitle, slot.key, slot.label, '')}
                                className="w-full group py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 bg-white/70 dark:bg-slate-800/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer shadow-none hover:shadow-sm"
                              >
                                <div className="w-5 h-5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Icon name="plus" className="w-3.5 h-3.5" />
                                </div>
                                <span className="truncate">+ {t.selectFromLibrary || 'Wybierz z biblioteki'}</span>
                              </button>
                            ) : (
                              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors">
                                <div className="flex items-start justify-between gap-1.5 mb-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPicker(dayKey, dayTitle, slot.key, slot.label, assignedId)}
                                    className="text-left font-bold text-xs text-slate-800 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 line-clamp-1 transition-colors"
                                    title={getLocalized(recipe.name, lang)}
                                  >
                                    {getLocalized(recipe.name, lang)}
                                  </button>
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPicker(dayKey, dayTitle, slot.key, slot.label, assignedId)}
                                      className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                      title={t.changeRecipe || 'Zmień'}
                                    >
                                      <Icon name="book-open" className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onAssignMeal(dayKey, slot.key, '')}
                                      className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                      title={t.removeMeal || 'Usuń'}
                                    >
                                      <Icon name="trash-2" className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                    B: {recipe.protein}g | W: {recipe.carbs}g | T: {recipe.fats}g
                                  </span>
                                  <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400 shrink-0">
                                    <Icon name="clock" className="w-3 h-3" />
                                    <span>{recipe.prepTime}</span>
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{t.macrosTotal}:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      B:{totals.protein}g | W:{totals.carbs}g | T:{totals.fats}g
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {pickerSlot && (
          <RecipePickerModal
            slotInfo={pickerSlot}
            recipes={recipes}
            onSelectRecipe={(recipeId) => {
              onAssignMeal(pickerSlot.dayKey, pickerSlot.slotKey, recipeId);
              setPickerSlot(null);
            }}
            onClearSlot={() => {
              onAssignMeal(pickerSlot.dayKey, pickerSlot.slotKey, '');
              setPickerSlot(null);
            }}
            onClose={() => setPickerSlot(null)}
            onCreateRecipe={onCreateRecipe}
          />
        )}
      </div>
    );
  }

  window.MacroChef.components.MealPlanner = MealPlanner;
})();
