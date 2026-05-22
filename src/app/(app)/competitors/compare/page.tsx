import { getCompetitors } from '@/lib/db/queries/competitors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function CompareCompetitorsPage() {
  const data = await getCompetitors();

  if (data.length < 2) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Compare Competitors</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Add at least 2 competitors to use comparison view
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Compare Competitors</h1>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-left text-sm font-medium text-muted-foreground w-40">Metric</th>
              {data.map((c) => (
                <th key={c.id} className="p-3 text-left text-sm font-medium min-w-[180px]">{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="p-3 text-sm text-muted-foreground">Platform</td>
              {data.map((c) => (
                <td key={c.id} className="p-3 text-sm capitalize">{c.platform}</td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="p-3 text-sm text-muted-foreground">Niche</td>
              {data.map((c) => (
                <td key={c.id} className="p-3">
                  {c.nicheName ? <Badge variant="outline" className="text-xs">{c.nicheName}</Badge> : '--'}
                </td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="p-3 text-sm text-muted-foreground">Followers</td>
              {data.map((c) => (
                <td key={c.id} className="p-3 text-sm font-medium">
                  {c.followersCount ? `${(c.followersCount / 1000).toFixed(1)}k` : '--'}
                </td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="p-3 text-sm text-muted-foreground">Est. Revenue</td>
              {data.map((c) => (
                <td key={c.id} className="p-3 text-sm font-medium">
                  {c.estimatedRevenueMonthly ? `$${c.estimatedRevenueMonthly.toLocaleString()}` : '--'}
                </td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="p-3 text-sm text-muted-foreground">Posts/week</td>
              {data.map((c) => (
                <td key={c.id} className="p-3 text-sm">{c.postingFrequencyPerWeek ?? '--'}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
