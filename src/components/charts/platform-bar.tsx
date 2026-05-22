'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const platformColors: Record<string, string> = {
  twitter: '#1da1f2',
  reddit: '#ff4500',
  modelmayhem: '#8b5cf6',
  instagram: '#e1306c',
  tiktok: '#25f4ee',
  fanvue: '#6366f1',
  other: '#94a3b8',
};

export function PlatformBar({ data }: { data: { platform: string; count: number }[] }) {
  const chartData = data.map((d) => ({
    name: d.platform,
    count: Number(d.count),
    fill: platformColors[d.platform] ?? '#94a3b8',
  }));

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Models by Platform</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
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
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
