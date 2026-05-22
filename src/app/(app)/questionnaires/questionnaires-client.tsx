'use client';

import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';

import { BookOpen01, ChevronDown, ChevronRight, Eye, Upload01 } from '@untitledui/icons';

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
import { Label } from '@/components/ui/label';
import { importQuestionnaires } from './actions';

type Questionnaire = {
  id: string;
  modelId: string;
  receivedAt: Date;
  rawResponses: any;
  extractedSummary: string | null;
  modelName: string;
};

type Model = { id: string; name: string };

export function QuestionnairesClient({ data, models }: { data: Questionnaire[]; models: Model[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [importResult, setImportResult] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleImport(fd: FormData) {
    setImportResult(null);
    startTransition(async () => {
      try {
        const result = await importQuestionnaires(fd);
        setImportResult(`${result.count} questionnaire${result.count > 1 ? 's' : ''} imported`);
        formRef.current?.reset();
        setTimeout(() => {
          setImportOpen(false);
          setImportResult(null);
        }, 1500);
      } catch (e: any) {
        setImportResult(`Error: ${e.message}`);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Questionnaires</h1>
          <p className="text-sm text-muted-foreground">{data.length} questionnaire{data.length !== 1 ? 's' : ''} received</p>
        </div>
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogTrigger render={<Button />}>
            <Upload01 className="mr-2 h-4 w-4" />
            Import
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Questionnaires</DialogTitle>
            </DialogHeader>
            <form ref={formRef} action={handleImport} className="space-y-4">
              <div className="space-y-2">
                <Label>Model</Label>
                <select name="modelId" required className="w-full rounded-md border px-3 py-2 text-sm">
                  <option value="">Select model</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>File (JSON or CSV)</Label>
                <input
                  type="file"
                  name="file"
                  accept=".json,.csv"
                  required
                  className="w-full rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:text-primary-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  JSON: array of objects or Tally export. CSV: headers as questions, rows as responses.
                </p>
              </div>
              {importResult && (
                <p className={`text-sm ${importResult.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {importResult}
                </p>
              )}
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Importing...' : 'Import'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen01 className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">No questionnaires yet</p>
            <p className="text-sm text-muted-foreground">Import responses or wait for models to return them</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((q) => {
            const isExpanded = expandedId === q.id;
            const responses = q.rawResponses as Record<string, string>;

            return (
              <Card key={q.id}>
                <CardHeader className="cursor-pointer pb-3" onClick={() => setExpandedId(isExpanded ? null : q.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <div>
                        <CardTitle className="text-base">{q.modelName}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Received {new Date(q.receivedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {q.extractedSummary && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 text-xs">Summarized</Badge>
                      )}
                      <Link href={`/models/${q.modelId}`}>
                        <Button variant="ghost" size="icon-sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="space-y-4 border-t pt-4">
                    {q.extractedSummary && (
                      <div className="rounded-lg bg-blue-500/10 p-3">
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Summary</p>
                        <p className="mt-1 text-sm text-blue-600/80 dark:text-blue-400/80">{q.extractedSummary}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium mb-2">Raw Responses</p>
                      <div className="space-y-2">
                        {typeof responses === 'object' && responses !== null ? (
                          Object.entries(responses).map(([key, value]) => (
                            <div key={key} className="rounded-md border p-3">
                              <p className="text-xs font-medium text-muted-foreground">{key}</p>
                              <p className="mt-1 text-sm">{String(value)}</p>
                            </div>
                          ))
                        ) : (
                          <pre className="rounded-md bg-muted p-3 text-xs overflow-auto">
                            {JSON.stringify(responses, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
