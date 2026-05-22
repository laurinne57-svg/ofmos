import { notFound } from 'next/navigation';

import { getModelActivities, getModelAiCharacter, getModelById } from '@/lib/db/queries/models';
import { StatusBadge, TierBadge } from '@/components/models/status-badge';
import { ModelTimeline } from '@/components/models/model-timeline';
import { ModelActionsPanel } from '@/components/models/model-actions-panel';
import { ModelDetailFields } from '@/components/models/model-detail-fields';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { ArrowLeft } from '@untitledui/icons';
import { Button } from '@/components/ui/button';
import { ModelAiReferences } from '@/components/models/model-ai-references';

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [model, acts, aiProfile] = await Promise.all([
    getModelById(id),
    getModelActivities(id),
    getModelAiCharacter(id),
  ]);

  if (!model) notFound();

  const ed = model.elementDifferentiel as { category?: string; description?: string; photoUrl?: string } | null;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/models">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{model.name}</h1>
            <StatusBadge status={model.status} />
            <TierBadge tier={model.estimatedTier ?? 'unknown'} />
          </div>
          {model.pseudoHandle && (
            <p className="text-muted-foreground">@{model.pseudoHandle}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <ModelDetailFields model={model as any} />

          {ed && (
            <Card>
              <CardHeader>
                <CardTitle>Élément Différentiel</CardTitle>
              </CardHeader>
              <CardContent>
                {ed.category && (
                  <p className="text-sm capitalize text-muted-foreground">
                    {ed.category.replace(/_/g, ' ')}
                  </p>
                )}
                <p className="mt-1">{ed.description || 'No description'}</p>
              </CardContent>
            </Card>
          )}

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Références IA du modèle</CardTitle>
            </CardHeader>
            <CardContent>
              <ModelAiReferences
                modelId={model.id}
                modelName={model.name}
                character={aiProfile.character}
                references={aiProfile.references}
              />
            </CardContent>
          </Card>

          {model.status === 'questionnaire_received' || model.disponibilityHoursPerDay ? (
            <Card>
              <CardHeader>
                <CardTitle>Tally Data</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Disponibility</p>
                  <p>{model.disponibilityHoursPerDay ?? '—'} h/day</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hard Limits</p>
                  <p>{model.hardLimits || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">AI Consent</p>
                  <p>{model.aiConsent == null ? '—' : model.aiConsent ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Multi-account</p>
                  <p>{model.multiAccountConsent == null ? '—' : model.multiAccountConsent ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Financial Expectations</p>
                  <p>{model.financialExpectationsMonthly ? `${model.financialExpectationsMonthly}€/mo` : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Previous Agencies</p>
                  <p>{model.previousAgenciesCount ?? '—'}</p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {(model.callDate || model.notesCall) && (
            <Card>
              <CardHeader>
                <CardTitle>Call Data</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Call Date</p>
                  <p>{model.callDate || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Face Cam</p>
                  <p className="capitalize">{model.faceCamNatural || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Matos Verified</p>
                  <p>{model.matosVerified ? 'Yes' : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Personal Compat</p>
                  <p className="capitalize">{model.personalCompat || '—'}</p>
                </div>
                {model.notesCall && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-wrap">{model.notesCall}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {model.decision && (
            <Card>
              <CardHeader>
                <CardTitle>Decision</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Decision</p>
                  <p className="capitalize font-medium">{model.decision}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p>{model.decisionDate || '—'}</p>
                </div>
                {model.decisionReason && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Reason</p>
                    <p>{model.decisionReason}</p>
                  </div>
                )}
                {model.killedReason && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Kill Reason</p>
                    <p className="capitalize">{model.killedReason.replace(/_/g, ' ')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <ModelActionsPanel model={{ id: model.id, status: model.status }} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ModelTimeline activities={acts as any} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
