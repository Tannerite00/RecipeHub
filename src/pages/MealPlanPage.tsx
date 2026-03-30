import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase, type MealPlan, type Recipe } from '../lib/supabase';
import { getWeekDates } from '../lib/utils';

interface MealPlanWithItems extends MealPlan {
  items: {
    day_of_week: number;
    recipes: Recipe[];
  }[];
}

export function MealPlanPage() {
  const [mealPlans, setMealPlans] = useState<MealPlanWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [newPlanDate, setNewPlanDate] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchMealPlans();
  }, []);

  async function fetchMealPlans() {
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .order('week_start_date', { ascending: false });

      if (error) throw error;

      const plansWithItems = await Promise.all(
        (data || []).map(async (plan) => {
          const { data: items } = await supabase
            .from('meal_plan_items')
            .select('day_of_week, recipes(*)')
            .eq('meal_plan_id', plan.id);

          const groupedItems = Array(7).fill(null).map((_, i) => ({
            day_of_week: i,
            recipes: items?.filter(item => item.day_of_week === i).map(item => item.recipes).flat() || []
          }));

          return { ...plan, items: groupedItems };
        })
      );

      setMealPlans(plansWithItems);
    } catch (err) {
      console.error('Error fetching meal plans:', err);
    } finally {
      setLoading(false);
    }
  }

  async function createMealPlan() {
    if (!newPlanDate) return;

    setCreating(true);
    try {
      const { error } = await supabase
        .from('meal_plans')
        .insert({
          week_start_date: newPlanDate,
          user_id: (await supabase.auth.getUser()).data.user?.id || 'anonymous'
        });

      if (error) throw error;
      setShowNewPlanModal(false);
      setNewPlanDate('');
      await fetchMealPlans();
    } catch (err) {
      console.error('Error creating meal plan:', err);
    } finally {
      setCreating(false);
    }
  }

  async function removeMealPlanItem(itemId: string) {
    try {
      const { error } = await supabase
        .from('meal_plan_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      fetchMealPlans();
    } catch (err) {
      console.error('Error removing item:', err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading meal plans...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Meal Planning</h1>
            <p className="text-gray-600 mt-2">Organize your weekly meals</p>
          </div>
          <button
            onClick={() => setShowNewPlanModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            <Plus className="w-5 h-5" />
            New Week
          </button>
        </div>

        {mealPlans.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 mb-4">No meal plans yet. Create your first one!</p>
            <button
              onClick={() => setShowNewPlanModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition"
            >
              <Plus className="w-5 h-5" />
              Create First Meal Plan
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {mealPlans.map((plan) => {
              const weekDates = getWeekDates(new Date(plan.week_start_date));
              return (
                <div key={plan.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                    <h2 className="text-2xl font-bold text-white">
                      Week of {new Date(plan.week_start_date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4 p-6">
                    {weekDates.map((day, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <h3 className="font-bold text-gray-900 mb-3">{day.label}</h3>
                        <p className="text-sm text-gray-600 mb-3">{day.displayDate}</p>
                        <div className="space-y-2 mb-3">
                          {plan.items[idx]?.recipes.map((recipe) => {
                            const item = (mealPlans[mealPlans.indexOf(plan)].items[idx]?.recipes || []).find(
                              r => r.id === recipe.id
                            );
                            return (
                              <div key={recipe.id} className="bg-white p-3 rounded border border-blue-200 flex justify-between items-start gap-2">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 line-clamp-2">{recipe.title}</p>
                                </div>
                                <button
                                  onClick={async () => {
                                    const { data: items } = await supabase
                                      .from('meal_plan_items')
                                      .select('id')
                                      .eq('meal_plan_id', plan.id)
                                      .eq('recipe_id', recipe.id)
                                      .eq('day_of_week', idx)
                                      .maybeSingle();
                                    if (items?.id) {
                                      removeMealPlanItem(items.id);
                                    }
                                  }}
                                  className="text-red-500 hover:text-red-700 flex-shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-500">
                          {plan.items[idx]?.recipes.length || 0} recipe(s)
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showNewPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Create New Meal Plan</h2>
              <button
                onClick={() => {
                  setShowNewPlanModal(false);
                  setNewPlanDate('');
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <p className="text-gray-600 mb-4">Select the start date of the week you want to plan for:</p>

            <div className="mb-6">
              <input
                type="date"
                value={newPlanDate}
                onChange={(e) => setNewPlanDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowNewPlanModal(false);
                  setNewPlanDate('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createMealPlan}
                disabled={!newPlanDate || creating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
