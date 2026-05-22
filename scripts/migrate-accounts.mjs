import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const statements = [
  `DO $$ BEGIN CREATE TYPE "public"."account_status" AS ENUM('active', 'warming', 'suspended', 'banned', 'inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `CREATE TABLE IF NOT EXISTS "accounts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "model_id" uuid NOT NULL REFERENCES "models"("id") ON DELETE CASCADE,
    "platform" text NOT NULL,
    "handle" text NOT NULL,
    "profile_url" text,
    "status" "account_status" DEFAULT 'warming' NOT NULL,
    "followers_count" integer,
    "niche_id" uuid REFERENCES "niches"("id") ON DELETE SET NULL,
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
