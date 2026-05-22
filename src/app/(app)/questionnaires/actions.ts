'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { questionnaires } from '@/lib/db/schema';

export async function importQuestionnaires(formData: FormData): Promise<{ count: number }> {
  const modelId = formData.get('modelId') as string;
  const file = formData.get('file') as File;

  if (!modelId || !file) throw new Error('Missing model or file');

  const text = await file.text();
  const fileName = file.name.toLowerCase();

  let rows: Record<string, string>[];

  if (fileName.endsWith('.json')) {
    const parsed = JSON.parse(text);
    rows = Array.isArray(parsed) ? parsed : parsed.data ?? parsed.responses ?? [parsed];
  } else if (fileName.endsWith('.csv')) {
    rows = parseCsv(text);
  } else {
    throw new Error('Unsupported file type. Use .json or .csv');
  }

  if (rows.length === 0) throw new Error('No data found in file');

  const values = rows.map((row) => ({
    modelId,
    rawResponses: row,
    receivedAt: new Date(),
  }));

  await db.insert(questionnaires).values(values);

  revalidatePath('/questionnaires');
  return { count: values.length };
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (values[i] ?? '').trim();
    });
    return obj;
  });
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
