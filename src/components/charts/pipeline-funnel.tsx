'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const statusLabels: Record<string, string> = {
  to_dm: 'To DM',
  dm_sent: 'DM Sent',
  responded: 'Responded',
  questionnaire_sent: 'Quest. Sent',
  questionnaire_received: 'Quest. Recv',
  call_scheduled: 'Call Sched.',
  call_done: 'Call Done',
  signed: 'Signed',
};

const statusColors: Record<string, string> = {
  to_dm: '#94a3b8',
  dm_sent: '#60a5fa',
  responded: '#22d3ee',
  questionnaire_sent: '#a78bfa',
  questionnaire_received: '#8b5cf6',
  call_scheduled: '#fbbf24',
  call_done: '#f97316',
  signed: '#22c55e',
};

const pipelineOrder = [
  'to_dm',
  'dm_sent',
  'responded',
  'questionnaire_sent',
  'questionnaire_received',
  'call_scheduled',
  'call_done',
  'signed',
];

export function PipelineFunnel({ counts }: { counts: Record<string, number> }) {
  const data = pipelineOrder.map((status) => ({
    name: statusLabels[status] ?? status,
    count: counts[status] ?? 0,
    fill: statusColors[status] ?? '#94a3b8',
  }));

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Pipeline Funnel</CardTitle>
            <p className="text-xs text-muted-foreground">{total} total models</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
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
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
