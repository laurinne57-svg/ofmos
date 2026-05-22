import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const statements = [
  // New enums
  `DO $$ BEGIN CREATE TYPE "public"."saturation_level" AS ENUM('low', 'medium', 'high', 'saturated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "public"."diff_category" AS ENUM('physique', 'talent', 'niche_exclusive', 'personality', 'fetish', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "public"."format_type" AS ENUM('photo_set', 'short_video', 'long_video', 'live', 'story', 'reel', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "public"."variation_status" AS ENUM('pending', 'processing', 'done', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "public"."expense_category" AS ENUM('model_payment', 'software', 'advertising', 'equipment', 'outsourcing', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // New columns on models
  `ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "current_main_account_count" integer`,
  `ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "lora_trained_at" timestamp with time zone`,
  `ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "lora_storage_url" text`,
  `ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "comp_structure" jsonb`,
  `ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "monthly_revenue_target_cents" integer`,
  `ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "signed_contract_url" text`,

  // New column on dm_templates
  `ALTER TABLE "dm_templates" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now()`,

  // Niches
  `CREATE TABLE IF NOT EXISTS "niches" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "target_audience" text,
    "saturation_level" "saturation_level" DEFAULT 'medium',
    "keywords" jsonb,
    "notes" text,
    "estimated_revenue_per_model" integer
  )`,

  // Differenciants
  `CREATE TABLE IF NOT EXISTS "differenciants" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "name" text NOT NULL,
    "category" "diff_category" NOT NULL,
    "description" text,
    "photos" jsonb,
    "notes" text
  )`,

  // Junction
  `CREATE TABLE IF NOT EXISTS "niches_differenciants" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "niche_id" uuid NOT NULL REFERENCES "niches"("id") ON DELETE CASCADE,
    "differenciant_id" uuid NOT NULL REFERENCES "differenciants"("id") ON DELETE CASCADE
  )`,

  // Competitors
  `CREATE TABLE IF NOT EXISTS "competitors" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "name" text NOT NULL,
    "platform" text NOT NULL,
    "profile_url" text,
    "niche_id" uuid REFERENCES "niches"("id") ON DELETE SET NULL,
    "followers_count" integer,
    "estimated_revenue_monthly" integer,
    "posting_frequency_per_week" numeric(4, 1),
    "screenshot_examples" jsonb,
    "notes" text
  )`,

  // Competitor Snapshots
  `CREATE TABLE IF NOT EXISTS "competitor_snapshots" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "competitor_id" uuid NOT NULL REFERENCES "competitors"("id") ON DELETE CASCADE,
    "captured_at" timestamp with time zone DEFAULT now() NOT NULL,
    "followers_count" integer,
    "likes_avg" integer,
    "posts_count" integer,
    "metadata" jsonb
  )`,

  // Competitor Winning Formats
  `CREATE TABLE IF NOT EXISTS "competitor_winning_formats" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "competitor_id" uuid NOT NULL REFERENCES "competitors"("id") ON DELETE CASCADE,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "format_type" "format_type" NOT NULL,
    "description" text NOT NULL,
    "example_url" text,
    "estimated_engagement" text,
    "notes" text
  )`,

  // Source Videos
  `CREATE TABLE IF NOT EXISTS "source_videos" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "model_id" uuid REFERENCES "models"("id") ON DELETE SET NULL,
    "title" text NOT NULL,
    "storage_url" text NOT NULL,
    "thumbnail_url" text,
    "duration_seconds" integer,
    "file_size_bytes" integer,
    "niche_id" uuid REFERENCES "niches"("id") ON DELETE SET NULL,
    "tags" jsonb,
    "notes" text
  )`,

  // Video Variations
  `CREATE TABLE IF NOT EXISTS "video_variations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "source_video_id" uuid NOT NULL REFERENCES "source_videos"("id") ON DELETE CASCADE,
    "status" "variation_status" DEFAULT 'pending' NOT NULL,
    "storage_url" text,
    "thumbnail_url" text,
    "config" jsonb,
    "error_message" text
  )`,

  // Variation Postings
  `CREATE TABLE IF NOT EXISTS "variation_postings" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "variation_id" uuid NOT NULL REFERENCES "video_variations"("id") ON DELETE CASCADE,
    "posted_at" timestamp with time zone DEFAULT now() NOT NULL,
    "platform" text NOT NULL,
    "account_handle" text,
    "post_url" text,
    "views" integer,
    "likes" integer,
    "comments" integer
  )`,

  // Inspiration Items
  `CREATE TABLE IF NOT EXISTS "inspiration_items" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "url" text,
    "screenshot_url" text,
    "niche_id" uuid REFERENCES "niches"("id") ON DELETE SET NULL,
    "hook_pattern" text,
    "format_type" "format_type",
    "notes" text,
    "tags" jsonb
  )`,

  // Expenses
  `CREATE TABLE IF NOT EXISTS "expenses" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "date" date NOT NULL,
    "category" "expense_category" NOT NULL,
    "description" text NOT NULL,
    "amount_cents" integer NOT NULL,
    "model_id" uuid REFERENCES "models"("id") ON DELETE SET NULL,
    "recurring" boolean DEFAULT false,
    "notes" text
  )`,
];

async function run() {
  for (let i = 0; i < statements.length; i++) {
    try {
      await sql.unsafe(statements[i]);
      console.log(`[${i + 1}/${statements.length}] OK`);
    } catch (e) {
      console.error(`[${i + 1}/${statements.length}] FAILED:`, e.message);
    }
  }
  await sql.end();
  console.log('Done!');
}

run();
