export function parseISO8601Duration(duration: string): string {
  const regex = /PT(\d+H)?(\d+M)?/;
  const matches = duration.match(regex);

  if (!matches) return 'N/A';

  let time = '';
  if (matches[1]) {
    time += matches[1];
  }
  if (matches[2]) {
    if (time) time += ' ';
    time += matches[2];
  }

  return time || 'N/A';
}

export function getWeekDates(startDate: Date) {
  const days = [];
  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    days.push({
      label: dayLabels[i],
      date: date.toISOString().split('T')[0],
      displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });
  }

  return days;
}

export function aggregateIngredients(ingredients: string[][]): Record<string, number> {
  const aggregated: Record<string, number> = {};

  ingredients.forEach(ingredientList => {
    ingredientList.forEach(ingredient => {
      const cleaned = ingredient.trim().replace(/<[^>]*>/g, '');
      if (cleaned) {
        aggregated[cleaned] = (aggregated[cleaned] || 0) + 1;
      }
    });
  });

  return aggregated;
}
