'use client';

import { useState, useTransition } from 'react';

import { Plus, Trash01 } from '@untitledui/icons';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { createExpense, createInspiration, deleteExpense, deleteInspiration } from './actions';

const expenseCategories = ['model_payment', 'software', 'advertising', 'equipment', 'outsourcing', 'other'];
const formatTypes = ['photo_set', 'short_video', 'long_video', 'live', 'story', 'reel', 'other'];

type Expense = {
  id: string;
  date: string;
  category: string;
  description: string;
  amountCents: number;
  modelName: string | null;
  recurring: boolean | null;
  notes: string | null;
};

type ExpenseStats = {
  totalThisMonthCents: number;
  byCategory: { category: string; total: number }[];
};

type Inspiration = {
  id: string;
  url: string | null;
  screenshotUrl: string | null;
  hookPattern: string | null;
  formatType: string | null;
  notes: string | null;
  nicheName: string | null;
  tags: any;
  createdAt: Date;
};

type Niche = { id: string; name: string };

export function SettingsClient({
  expenses,
  expenseStats,
  inspirations,
  niches,
}: {
  expenses: Expense[];
  expenseStats: ExpenseStats;
  inspirations: Inspiration[];
  niches: Niche[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Expenses, inspiration library, and configuration</p>
      </div>

      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="inspiration">Inspiration</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4 mt-4">
          <ExpensesTab expenses={expenses} expenseStats={expenseStats} />
        </TabsContent>

        <TabsContent value="inspiration" className="space-y-4 mt-4">
          <InspirationTab inspirations={inspirations} niches={niches} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExpensesTab({ expenses, expenseStats }: { expenses: Expense[]; expenseStats: ExpenseStats }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-3xl font-bold">${(expenseStats.totalThisMonthCents / 100).toFixed(0)}</p>
          </CardContent>
        </Card>
        {expenseStats.byCategory.slice(0, 2).map((cat) => (
          <Card key={cat.category}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground capitalize">{cat.category.replace(/_/g, ' ')}</p>
              <p className="text-2xl font-bold">${(Number(cat.total) / 100).toFixed(0)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">All Expenses</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Expense</DialogTitle>
            </DialogHeader>
            <form
              action={async (fd) => {
                const amount = parseFloat(fd.get('amount') as string);
                fd.set('amountCents', String(Math.round(amount * 100)));
                await createExpense(fd);
                setCreateOpen(false);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select name="category" required className="w-full rounded-md border px-3 py-2 text-sm">
                    {expenseCategories.map((c) => (
                      <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input name="description" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount ($)</Label>
                  <Input name="amount" type="number" step="0.01" required />
                </div>
                <div className="space-y-2 flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="recurring" value="true" className="rounded" />
                    Recurring
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea name="notes" rows={2} />
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button type="submit">Add</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {expenses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">No expenses recorded yet</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20">{e.date}</span>
                <Badge variant="outline" className="text-xs capitalize">{e.category.replace(/_/g, ' ')}</Badge>
                <span className="text-sm">{e.description}</span>
                {e.modelName && <span className="text-xs text-muted-foreground">({e.modelName})</span>}
                {e.recurring && <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">Recurring</Badge>}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">${(e.amountCents / 100).toFixed(2)}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    if (!confirm('Delete?')) return;
                    startTransition(() => deleteExpense(e.id));
                  }}
                >
                  <Trash01 className="h-3.5 w-3.5 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function InspirationTab({ inspirations, niches }: { inspirations: Inspiration[]; niches: Niche[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Inspiration Library ({inspirations.length})</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Add Inspiration
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Inspiration</DialogTitle>
            </DialogHeader>
            <form
              action={async (fd) => {
                await createInspiration(fd);
                setCreateOpen(false);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>URL</Label>
                <Input name="url" placeholder="Link to the inspiration" />
              </div>
              <div className="space-y-2">
                <Label>Hook Pattern</Label>
                <Input name="hookPattern" placeholder="What makes this work?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <select name="formatType" className="w-full rounded-md border px-3 py-2 text-sm">
                    <option value="">No format</option>
                    {formatTypes.map((f) => (
                      <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Niche</Label>
                  <select name="nicheId" className="w-full rounded-md border px-3 py-2 text-sm">
                    <option value="">No niche</option>
                    {niches.map((n) => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input name="tags" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea name="notes" rows={3} />
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button type="submit">Add</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {inspirations.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">No inspiration items yet</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {inspirations.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4 space-y-2">
                {item.hookPattern && <p className="text-sm font-medium">{item.hookPattern}</p>}
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline truncate block">
                    {item.url}
                  </a>
                )}
                {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {item.formatType && <Badge variant="outline" className="text-xs capitalize">{item.formatType.replace(/_/g, ' ')}</Badge>}
                    {item.nicheName && <Badge variant="outline" className="text-xs">{item.nicheName}</Badge>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      if (!confirm('Delete?')) return;
                      startTransition(() => deleteInspiration(item.id));
                    }}
                  >
                    <Trash01 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
