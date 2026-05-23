import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const statements = [
  `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   VALUES (
    'ai-output',
    'ai-output',
    false,
    104857600,
    ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/webm'
    ]::text[]
   )
   ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/webm'
    ]::text[]`,

  `DROP POLICY IF EXISTS "Authenticated users can read ai output media" ON storage.objects`,
  `DROP POLICY IF EXISTS "Authenticated users can upload ai output media" ON storage.objects`,
  `DROP POLICY IF EXISTS "Authenticated users can update ai output media" ON storage.objects`,
  `DROP POLICY IF EXISTS "Authenticated users can delete ai output media" ON storage.objects`,

  `CREATE POLICY "Authenticated users can read ai output media"
   ON storage.objects FOR SELECT TO authenticated
   USING (bucket_id = 'ai-output')`,

  `CREATE POLICY "Authenticated users can upload ai output media"
   ON storage.objects FOR INSERT TO authenticated
   WITH CHECK (bucket_id = 'ai-output')`,

  `CREATE POLICY "Authenticated users can update ai output media"
   ON storage.objects FOR UPDATE TO authenticated
   USING (bucket_id = 'ai-output')
   WITH CHECK (bucket_id = 'ai-output')`,

  `CREATE POLICY "Authenticated users can delete ai output media"
   ON storage.objects FOR DELETE TO authenticated
   USING (bucket_id = 'ai-output')`,
];

try {
  for (let index = 0; index < statements.length; index++) {
    await sql.unsafe(statements[index]);
    console.log(`[${index + 1}/${statements.length}] OK`);
  }
} finally {
  await sql.end();
}

