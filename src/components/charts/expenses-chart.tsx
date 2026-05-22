'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type MonthlyData = {
  month: string;
  total: number;
};

export function ExpensesChart({ data }: { data: MonthlyData[] }) {
  if (data.length === 0) {
    return (
      <Card className="card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Monthly Expenses</CardTitle>
          <p className="text-xs text-muted-foreground">No data yet</p>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          No expense data yet
        </CardContent>
      </Card>
    );
  }

  const totalAll = data.reduce((s, d) => s + d.total, 0);

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Monthly Expenses</CardTitle>
            <p className="text-xs text-muted-foreground">${totalAll.toFixed(0)} total</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{
                borderRadius: '10px',
                fontSize: '13px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--card)',
                color: 'var(--card-foreground)',
              }}
              formatter={(value) => [`$${Number(value).toFixed(0)}`, 'Expenses']}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#f97316"
              fill="url(#expenseGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
