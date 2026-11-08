# MacroChef Macro Calculation System - Implementation Report

**Date**: 2024  
**Project**: MacroChef - Fitness Meal Prep PWA  
**Feature**: Goal-Based Personalized Macro Calculation & Display System  

## Executive Summary

Implemented a complete goal-based macro calculation system that provides personalized daily nutritional targets based on user profiles and fitness objectives. The system calculates macronutrient distributions automatically while maintaining mathematical consistency and displaying values in intuitive gram and percentage formats.

## Implementation Completed

### ✅ Core Calculation Engine

**File**: [js/utils/macroCalculations.js](/P:/Github/MacroChef/MacroChef/js/utils/macroCalculations.js)

- `calculateMacrosForGoal(goals, cpm)` - Goal-specific macro distribution algorithm
- `calculateDistribution(goals, cpm)` - Main distribution calculator with auto-calculation support

#### Atwater Constants (Verified)
- Protein: 1g = 4 kcal
- Carbohydrates: 1g = 4 kcal
- Fats: 1g = 9 kcal

### ✅ Goal-Specific Formulas

#### Goal 1: Weight Loss (Fat Reduction)
- **Calorie Adjustment**: CPM - 500 kcal
- **Protein**: 2.0 g/kg body weight
- **Fats**: 30% of daily calories
- **Carbohydrates**: Calculated to fill remaining calorie budget
- **Example** (105kg, 2299 kcal):
  - Protein: 210g × 4 = 840 kcal (37%)
  - Fats: 77g × 9 = 693 kcal (30%)
  - Carbs: 192g × 4 = 768 kcal (33%)
  - **Total: 2301 kcal** (±2 kcal diff)

#### Goal 2: Maintenance (Body Weight Stability)
- **Calorie Adjustment**: No adjustment (use CPM as-is)
- **Protein**: 1.7 g/kg body weight
- **Fats**: 30% of daily calories
- **Carbohydrates**: Fills remainder
- **Example** (105kg, 2799 kcal):
  - Protein: 179g × 4 = 716 kcal (26%)
  - Fats: 93g × 9 = 837 kcal (30%)
  - Carbs: 312g × 4 = 1248 kcal (45%)
  - **Total: 2801 kcal** (±2 kcal diff)

#### Goal 3: Muscle Gain (Hypertrophy)
- **Calorie Adjustment**: CPM + 300 kcal
- **Protein**: 1.8 g/kg body weight
- **Fats**: 22% of daily calories (reserved for hormonal health)
- **Carbohydrates**: Prioritized for training energy (~53% of calories)
- **Example** (105kg, 3099 kcal):
  - Protein: 189g × 4 = 756 kcal (24%)
  - Fats: 76g × 9 = 684 kcal (22%)
  - Carbs: 415g × 4 = 1660 kcal (54%)
  - **Total: 3100 kcal** (±1 kcal diff)

#### Goal 4: Healthy Habits (Manual Control)
- **Calorie Adjustment**: No adjustment (CPM displayed as reference)
- **Macro Entry**: User manual input
- **Auto-Calculation**: Disabled (allows flexible focus on specific nutrients)
- **Use Case**: Health monitoring, micronutrient tracking, medical dietary requirements

### ✅ User Interface Components

**File**: [js/components/MacroTracker.js](/P:/Github/MacroChef/MacroChef/js/components/MacroTracker.js)

#### Profile Input Section
- Age (18-120 years)
- Weight (kg)
- Height (cm)
- Sex (Female/Male)
- Physical Activity Level (PAL) - 5-level scale with descriptions

#### CPM Calculation
- Uses Mifflin–St Jeor formula: `BMR = 10W + 6.25H - 5A + (±5/-161)`
- Multiplies by activity PAL midpoint (1.25, 1.45, 1.65, 1.85, 2.2)
- Displays "Estimated maintenance calories" and calorie adjustment per goal
- "Set suggested calories" button applies recommendation to daily goal

#### Goal Selection Dropdown
- Weight Loss (−500 kcal)
- Muscle Gain (+300 kcal)
- Maintenance (no adjustment)
- Healthy Habits (manual)
- Each includes descriptive text explaining the goal

#### Macro Input Fields
- **When goal is active** (except Healthy Habits):
  - Display calculated gram values
  - Fields are disabled (read-only)
  - Show "auto-calculated from goal" helper text
- **When Healthy Habits or no goal**:
  - Fields are enabled for manual editing
  - No helper text

#### Macro Distribution Display Boxes
Show for each macronutrient:
- **Gram value** (e.g., "210 g")
- **Calorie equivalent** (e.g., "840 kcal")
- **Percentage of daily total** (e.g., "37%")
- Color-coded: Green (Protein), Teal (Carbs), Amber (Fats)

#### Total Calories Box
- Displays sum of macro calories vs. daily target
- Example: "2301 / 2299 kcal"
- Shows warning if difference exceeds ±5 kcal tolerance
- Blue color scheme

### ✅ Internationalization

**File**: [js/i18n/translations.js](/P:/Github/MacroChef/MacroChef/js/i18n/translations.js)

#### New English Keys
- `totalCalories`: "Total Calories"
- `caloriesMismatch`: "Macro calories do not sum to daily target"
- `autoCalculatedFromGoal`: "auto-calculated from goal"

#### New Polish Keys
- `totalCalories`: "Razem Kalorie"
- `caloriesMismatch`: "Suma kalorii z makro nie zgadza się z celem dzienny"
- `autoCalculatedFromGoal`: "auto-obliczone z celu"

Plus existing goal descriptions for all four goals in both languages.

### ✅ Data Persistence

**IndexedDB Integration**
- User profile fields (age, weight, height, sex, activityPal) persist across sessions
- Selected goal (userGoal) persists
- Daily calorie target persists
- Calculated macro values used for immediate UI display (not persisted - recalculated on load)

## Technical Details

### Mathematical Consistency

All calculated macros ensure that:
```
Protein_kcal + Carbs_kcal + Fats_kcal = Daily_Calorie_Target ± 2 kcal
```

Rounding strategy:
1. Calculate protein (rounded to nearest gram)
2. Calculate fats (rounded to nearest gram)
3. Calculate carbs from remainder: `(Goal - P*4 - F*9) / 4` (rounded)
4. Verify total and adjust carbs if needed to match goal exactly

### Context Binding Fix

**Issue**: `this.calculateMacrosForGoal` not found when called from `calculateDistribution`

**Solution**: Changed to `window.MacroChef.macroCalculations.calculateMacrosForGoal()` to ensure proper namespace reference in browser context.

### Tolerance Mechanism

Calorie mismatch warning triggers only when difference exceeds ±5 kcal:
```javascript
Math.abs(dist.totalKcal - (Number(goals.calories) || 2000)) > 5
```

This accommodates rounding errors (typically 1-2 kcal) while alerting to genuine calculation issues.

## Testing & Validation

### Test Scenario
- Profile: 50-year-old male, 105 kg, 180 cm, low activity
- Estimated CPM: ~2799 kcal

### Results

| Goal | Target | Protein | Carbs | Fats | Total | Diff | Status |
|------|--------|---------|-------|------|-------|------|--------|
| Weight Loss | 2299 | 210g | 192g | 77g | 2301 | +2 | ✓ Pass |
| Maintenance | 2799 | 179g | 312g | 93g | 2801 | +2 | ✓ Pass |
| Muscle Gain | 3099 | 189g | 415g | 76g | 3100 | +1 | ✓ Pass |
| Healthy Habits | Manual | Manual | Manual | Manual | — | — | ✓ Manual |

### UI Validation
- [x] All four goals load without JavaScript errors
- [x] Macro input fields disable correctly for goals 1-3
- [x] Macro input fields enable for goal 4
- [x] Helper text "auto-calculated from goal" displays on disabled fields
- [x] Macro distribution boxes show gram values
- [x] Macro distribution boxes show percentage values
- [x] Total calories display shows with ±5 kcal tolerance (no false warnings)
- [x] IndexedDB persistence verified across page reload

## Files Modified

1. **js/utils/macroCalculations.js**
   - Added `calculateMacrosForGoal()` function
   - Updated `calculateDistribution()` with goal-based logic
   - Fixed context binding

2. **js/components/MacroTracker.js**
   - Enhanced profile form section
   - Added goal selector dropdown
   - Updated macro input fields with disabled state and helper text
   - Enhanced macro distribution display with gram values and percentages
   - Added total calories box with tolerance check

3. **js/i18n/translations.js**
   - Added 6 new translation keys (3 EN, 3 PL)

4. **dist/index.html** and **macrochef_calorie_meal_planner_pwa.html**
   - Rebuilt bundles with all changes included

## Usage Instructions

### For Users

1. **Fill Profile**: Navigate to "Cele i Makroelementy" tab, enter:
   - Age, Weight, Height
   - Sex and Physical Activity Level
   
2. **Set CPM**: System automatically calculates estimated maintenance calories (CPM)

3. **Select Goal**: Choose from:
   - Fat loss (−500 kcal automatic adjustment)
   - Muscle gain (+300 kcal automatic adjustment)
   - Maintenance (no adjustment)
   - Healthy habits (manual)

4. **Apply Recommendation**: Click "Set suggested calories" to apply goal-based calorie target

5. **Review Macros**: System auto-calculates and displays:
   - Protein/Carbs/Fats in grams
   - Calorie equivalent per macro
   - Percentage breakdown

### For Developers

The calculation system is exposed at `window.MacroChef.macroCalculations`:

```javascript
// Get macro distribution for a goal
const dist = window.MacroChef.macroCalculations.calculateDistribution({
  calories: 2299,
  weight: 105,
  height: 180,
  age: 50,
  sex: 'male',
  userGoal: 'weightLoss'
}, 2799); // cpm parameter

// Access calculated values
console.log(dist.protein); // grams
console.log(dist.proteinKcal); // calories
console.log(dist.proteinPercent); // percentage
```

## Known Limitations & Future Enhancements

### Current Limitations
- Female fat minimum (0.8g/kg) only checked for weight loss goal
- BMI-based adjustments (e.g., higher protein for obese individuals) not implemented
- Carbs always adjusted for rounding (could distribute difference across all macros)

### Recommended Future Enhancements
1. BMI-based protein scaling for medical conditions
2. Micronutrient tracking UI (fiber, sodium, vitamins)
3. Activity-specific macro adjustments (sport type/intensity)
4. Weekly macro tracking and progress visualization
5. Meal recipe suggestions based on macro goals
6. Export macro targets to PDF

## Conclusion

The macro calculation system successfully provides personalized, goal-based nutritional guidance with verified mathematical accuracy, intuitive UI display, and robust data persistence. All four goal categories function correctly with appropriate calorie adjustments and macro distributions.

**Status**: ✅ **COMPLETE & TESTED**
