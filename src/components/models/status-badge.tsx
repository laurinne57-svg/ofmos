import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; className: string }> = {
  to_dm: { label: 'To DM', className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' },
  dm_sent: { label: 'DM Sent', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  responded: { label: 'Responded', className: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' },
  questionnaire_sent: { label: 'Quest. Sent', className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  questionnaire_received: { label: 'Quest. Received', className: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' },
  call_scheduled: { label: 'Call Scheduled', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  call_done: { label: 'Call Done', className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  signed: { label: 'Signed', className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' },
  on_hold: { label: 'On Hold', className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' },
  killed: { label: 'Killed', className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, className: '' };
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}

const tierColors: Record<string, string> = {
  S: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  A: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  B: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  C: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  unknown: 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20',
};

export function TierBadge({ tier }: { tier: string }) {
  return (
    <Badge variant="outline" className={cn('text-xs font-bold', tierColors[tier] ?? '')}>
      {tier === 'unknown' ? '?' : tier}
    </Badge>
  );
}
