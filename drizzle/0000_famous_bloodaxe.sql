CREATE TYPE "public"."activity_type" AS ENUM('dm_sent', 'response_received', 'questionnaire_sent', 'questionnaire_received', 'call_scheduled', 'call_done', 'note', 'status_change', 'photo_uploaded');--> statement-breakpoint
CREATE TYPE "public"."compat" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."decision" AS ENUM('signed', 'passed', 'on_hold');--> statement-breakpoint
CREATE TYPE "public"."diff_category" AS ENUM('physique', 'talent', 'niche_exclusive', 'personality', 'fetish', 'other');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('model_payment', 'software', 'advertising', 'equipment', 'outsourcing', 'other');--> statement-breakpoint
CREATE TYPE "public"."face_cam" AS ENUM('good', 'ok', 'bad');--> statement-breakpoint
CREATE TYPE "public"."format_type" AS ENUM('photo_set', 'short_video', 'long_video', 'live', 'story', 'reel', 'other');--> statement-breakpoint
CREATE TYPE "public"."model_status" AS ENUM('to_dm', 'dm_sent', 'responded', 'questionnaire_sent', 'questionnaire_received', 'call_scheduled', 'call_done', 'signed', 'on_hold', 'killed');--> statement-breakpoint
CREATE TYPE "public"."phone_quality" AS ENUM('iphone_recent', 'iphone_old', 'android_premium', 'low_quality', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."platform_source" AS ENUM('twitter', 'reddit', 'modelmayhem', 'instagram', 'tiktok', 'fanvue', 'other');--> statement-breakpoint
CREATE TYPE "public"."saturation_level" AS ENUM('low', 'medium', 'high', 'saturated');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('S', 'A', 'B', 'C', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."variation_status" AS ENUM('pending', 'processing', 'done', 'failed');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"type" "activity_type" NOT NULL,
	"content" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "competitor_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competitor_id" uuid NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"followers_count" integer,
	"likes_avg" integer,
	"posts_count" integer,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "competitor_winning_formats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competitor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"format_type" "format_type" NOT NULL,
	"description" text NOT NULL,
	"example_url" text,
	"estimated_engagement" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "competitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"platform" text NOT NULL,
	"profile_url" text,
	"niche_id" uuid,
	"followers_count" integer,
	"estimated_revenue_monthly" integer,
	"posting_frequency_per_week" numeric(4, 1),
	"screenshot_examples" jsonb,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "differenciants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"category" "diff_category" NOT NULL,
	"description" text,
	"photos" jsonb,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "dm_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"platform" "platform_source" NOT NULL,
	"content" text NOT NULL,
	"variables" jsonb,
	"times_used" integer DEFAULT 0,
	"response_rate" numeric(5, 4)
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"date" date NOT NULL,
	"category" "expense_category" NOT NULL,
	"description" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"model_id" uuid,
	"recurring" boolean DEFAULT false,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "inspiration_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"url" text,
	"screenshot_url" text,
	"niche_id" uuid,
	"hook_pattern" text,
	"format_type" "format_type",
	"notes" text,
	"tags" jsonb
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"pseudo_handle" text,
	"platform_source" "platform_source" NOT NULL,
	"profile_url" text,
	"followers_count" integer,
	"status" "model_status" DEFAULT 'to_dm' NOT NULL,
	"killed_reason" text,
	"has_existing_content" boolean DEFAULT false,
	"visible_phone_quality" "phone_quality" DEFAULT 'unknown',
	"element_differentiel" jsonb,
	"estimated_tier" "tier" DEFAULT 'unknown',
	"geo_country" text,
	"nationality" text,
	"age" integer,
	"disponibility_hours_per_day" numeric(4, 2),
	"hard_limits" text,
	"ai_consent" boolean,
	"multi_account_consent" boolean,
	"financial_expectations_monthly" integer,
	"previous_agencies_count" integer,
	"call_date" date,
	"matos_verified" boolean,
	"face_cam_natural" "face_cam",
	"element_differentiel_confirmed" boolean,
	"personal_compat" "compat",
	"notes_call" text,
	"decision" "decision",
	"decision_reason" text,
	"decision_date" date,
	"current_main_account_count" integer,
	"lora_trained_at" timestamp with time zone,
	"lora_storage_url" text,
	"comp_structure" jsonb,
	"monthly_revenue_target_cents" integer,
	"signed_contract_url" text
);
--> statement-breakpoint
CREATE TABLE "niches" (
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
);
--> statement-breakpoint
CREATE TABLE "niches_differenciants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"niche_id" uuid NOT NULL,
	"differenciant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questionnaires" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"raw_responses" jsonb NOT NULL,
	"extracted_summary" text
);
--> statement-breakpoint
CREATE TABLE "source_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"model_id" uuid,
	"title" text NOT NULL,
	"storage_url" text NOT NULL,
	"thumbnail_url" text,
	"duration_seconds" integer,
	"file_size_bytes" integer,
	"niche_id" uuid,
	"tags" jsonb,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "variation_postings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variation_id" uuid NOT NULL,
	"posted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"platform" text NOT NULL,
	"account_handle" text,
	"post_url" text,
	"views" integer,
	"likes" integer,
	"comments" integer
);
--> statement-breakpoint
CREATE TABLE "video_variations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_video_id" uuid NOT NULL,
	"status" "variation_status" DEFAULT 'pending' NOT NULL,
	"storage_url" text,
	"thumbnail_url" text,
	"config" jsonb,
	"error_message" text
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_snapshots" ADD CONSTRAINT "competitor_snapshots_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_winning_formats" ADD CONSTRAINT "competitor_winning_formats_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "public"."niches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspiration_items" ADD CONSTRAINT "inspiration_items_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "public"."niches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "niches_differenciants" ADD CONSTRAINT "niches_differenciants_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "public"."niches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "niches_differenciants" ADD CONSTRAINT "niches_differenciants_differenciant_id_differenciants_id_fk" FOREIGN KEY ("differenciant_id") REFERENCES "public"."differenciants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_videos" ADD CONSTRAINT "source_videos_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_videos" ADD CONSTRAINT "source_videos_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "public"."niches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variation_postings" ADD CONSTRAINT "variation_postings_variation_id_video_variations_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."video_variations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_variations" ADD CONSTRAINT "video_variations_source_video_id_source_videos_id_fk" FOREIGN KEY ("source_video_id") REFERENCES "public"."source_videos"("id") ON DELETE cascade ON UPDATE no action;