'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const statusColors: Record<string, string> = {
  to_dm: '#94a3b8',
  dm_sent: '#60a5fa',
  responded: '#22d3ee',
  questionnaire_sent: '#a78bfa',
  questionnaire_received: '#8b5cf6',
  call_scheduled: '#fbbf24',
  call_done: '#f97316',
  signed: '#22c55e',
  on_hold: '#eab308',
  killed: '#ef4444',
};

export function StatusPie({ data }: { data: { status: string; count: number }[] }) {
  const chartData = data
    .filter((d) => d.count > 0)
    .map((d) => ({
      name: d.status.replace(/_/g, ' '),
      value: Number(d.count),
      fill: statusColors[d.status] ?? '#94a3b8',
    }));

  const total = chartData.reduce((s, d) => s + d.value, 0);

  if (chartData.length === 0) {
    return (
      <Card className="card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Models by Status</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          No models yet
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-2">
        <div>
          <CardTitle className="text-sm">Models by Status</CardTitle>
          <p className="text-xs text-muted-foreground">{total} total</p>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={95}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: '10px',
                fontSize: '13px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--card)',
                color: 'var(--card-foreground)',
              }}
              formatter={(value) => [value, 'Models']}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-3 justify-center mt-2">
          {chartData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
              <span className="capitalize">{entry.name}</span>
              <span className="font-medium text-foreground">{entry.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
