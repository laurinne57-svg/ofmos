import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const statements = [
  `DO $$ BEGIN CREATE TYPE "public"."ai_asset_type" AS ENUM('character', 'environment'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "public"."ai_generation_status" AS ENUM('draft', 'queued', 'processing', 'done', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `CREATE TABLE IF NOT EXISTS "ai_characters" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "model_id" uuid REFERENCES "models"("id") ON DELETE SET NULL,
    "name" text NOT NULL,
    "handle" text NOT NULL,
    "description" text,
    "identity_prompt" text,
    "negative_prompt" text,
    "notes" text
  )`,

  `CREATE TABLE IF NOT EXISTS "ai_environments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "name" text NOT NULL,
    "handle" text NOT NULL,
    "description" text,
    "environment_prompt" text,
    "negative_prompt" text,
    "notes" text
  )`,

  `CREATE TABLE IF NOT EXISTS "ai_reference_images" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "asset_type" "ai_asset_type" NOT NULL,
    "character_id" uuid REFERENCES "ai_characters"("id") ON DELETE CASCADE,
    "environment_id" uuid REFERENCES "ai_environments"("id") ON DELETE CASCADE,
    "bucket" text DEFAULT 'ai-reference' NOT NULL,
    "storage_path" text NOT NULL,
    "original_name" text,
    "mime_type" text,
    "file_size_bytes" integer,
    "notes" text
  )`,

  `CREATE TABLE IF NOT EXISTS "ai_generation_jobs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "character_id" uuid REFERENCES "ai_characters"("id") ON DELETE SET NULL,
    "environment_id" uuid REFERENCES "ai_environments"("id") ON DELETE SET NULL,
    "provider" text DEFAULT 'enhancor' NOT NULL,
    "status" "ai_generation_status" DEFAULT 'draft' NOT NULL,
    "prompt" text NOT NULL,
    "negative_prompt" text,
    "config" jsonb,
    "result_bucket" text,
    "result_path" text,
    "error_message" text
  )`,

  `CREATE INDEX IF NOT EXISTS "ai_reference_images_character_id_idx" ON "ai_reference_images" ("character_id")`,
  `CREATE INDEX IF NOT EXISTS "ai_reference_images_environment_id_idx" ON "ai_reference_images" ("environment_id")`,
  `CREATE INDEX IF NOT EXISTS "ai_generation_jobs_created_at_idx" ON "ai_generation_jobs" ("created_at")`,

  `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   VALUES (
    'ai-reference',
    'ai-reference',
    false,
    52428800,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']::text[]
   )
   ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']::text[]`,

  `CREATE POLICY "Authenticated users can read ai reference media"
   ON storage.objects FOR SELECT TO authenticated
   USING (bucket_id = 'ai-reference')`,

  `CREATE POLICY "Authenticated users can upload ai reference media"
   ON storage.objects FOR INSERT TO authenticated
   WITH CHECK (bucket_id = 'ai-reference')`,

  `CREATE POLICY "Authenticated users can update ai reference media"
   ON storage.objects FOR UPDATE TO authenticated
   USING (bucket_id = 'ai-reference')
   WITH CHECK (bucket_id = 'ai-reference')`,

  `CREATE POLICY "Authenticated users can delete ai reference media"
   ON storage.objects FOR DELETE TO authenticated
   USING (bucket_id = 'ai-reference')`,
];

async function run() {
  for (let i = 0; i < statements.length; i++) {
    try {
      await sql.unsafe(statements[i]);
      console.log(`[${i + 1}/${statements.length}] OK`);
    } catch (error) {
      if (error.message?.includes('already exists')) {
        console.log(`[${i + 1}/${statements.length}] Already exists`);
        continue;
      }
      console.error(`[${i + 1}/${statements.length}] FAILED:`, error.message);
      throw error;
    }
  }
  await sql.end();
  console.log('AI Studio migration done!');
}

run();
