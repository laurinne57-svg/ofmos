import { desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { questionnaires, models } from '@/lib/db/schema';
import { QuestionnairesClient } from './questionnaires-client';

export default async function QuestionnairesPage() {
  const [data, allModels] = await Promise.all([
    db
      .select({
        id: questionnaires.id,
        modelId: questionnaires.modelId,
        receivedAt: questionnaires.receivedAt,
        rawResponses: questionnaires.rawResponses,
        extractedSummary: questionnaires.extractedSummary,
        modelName: models.name,
      })
      .from(questionnaires)
      .innerJoin(models, eq(questionnaires.modelId, models.id))
      .orderBy(desc(questionnaires.receivedAt)),
    db.select({ id: models.id, name: models.name }).from(models),
  ]);

  return <QuestionnairesClient data={data} models={allModels} />;
}
