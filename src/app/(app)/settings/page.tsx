import { getExpenses, getExpenseStats } from '@/lib/db/queries/expenses';
import { getInspirationItems } from '@/lib/db/queries/inspiration';
import { getNiches } from '@/lib/db/queries/niches';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const [expenses, expenseStats, inspirations, niches] = await Promise.all([
    getExpenses(),
    getExpenseStats(),
    getInspirationItems(),
    getNiches(),
  ]);

  return (
    <SettingsClient
      expenses={expenses}
      expenseStats={expenseStats}
      inspirations={inspirations}
      niches={niches}
    />
  );
}
