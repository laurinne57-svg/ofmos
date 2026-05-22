import {
  boolean,
  date,
  decimal,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// ── Enums ──────────────────────────────────────────────────────────────

export const platformSourceEnum = pgEnum('platform_source', [
  'twitter',
  'reddit',
  'modelmayhem',
  'instagram',
  'tiktok',
  'fanvue',
  'other',
]);

export const modelStatusEnum = pgEnum('model_status', [
  'to_dm',
  'dm_sent',
  'responded',
  'questionnaire_sent',
  'questionnaire_received',
  'call_scheduled',
  'call_done',
  'signed',
  'on_hold',
  'killed',
]);

export const tierEnum = pgEnum('tier', ['S', 'A', 'B', 'C', 'unknown']);

export const phoneQualityEnum = pgEnum('phone_quality', [
  'iphone_recent',
  'iphone_old',
  'android_premium',
  'low_quality',
  'unknown',
]);

export const decisionEnum = pgEnum('decision', ['signed', 'passed', 'on_hold']);

export const faceCamEnum = pgEnum('face_cam', ['good', 'ok', 'bad']);

export const compatEnum = pgEnum('compat', ['high', 'medium', 'low']);

export const activityTypeEnum = pgEnum('activity_type', [
  'dm_sent',
  'response_received',
  'questionnaire_sent',
  'questionnaire_received',
  'call_scheduled',
  'call_done',
  'note',
  'status_change',
  'photo_uploaded',
]);

export const saturationLevelEnum = pgEnum('saturation_level', [
  'low',
  'medium',
  'high',
  'saturated',
]);

export const diffCategoryEnum = pgEnum('diff_category', [
  'physique',
  'talent',
  'niche_exclusive',
  'personality',
  'fetish',
  'other',
]);

export const formatTypeEnum = pgEnum('format_type', [
  'photo_set',
  'short_video',
  'long_video',
  'live',
  'story',
  'reel',
  'other',
]);

export const variationStatusEnum = pgEnum('variation_status', [
  'pending',
  'processing',
  'done',
  'failed',
]);

export const accountStatusEnum = pgEnum('account_status', [
  'active',
  'warming',
  'suspended',
  'banned',
  'inactive',
]);

export const expenseCategoryEnum = pgEnum('expense_category', [
  'model_payment',
  'software',
  'advertising',
  'equipment',
  'outsourcing',
  'other',
]);

export const aiAssetTypeEnum = pgEnum('ai_asset_type', [
  'character',
  'environment',
]);

export const aiGenerationStatusEnum = pgEnum('ai_generation_status', [
  'draft',
  'queued',
  'processing',
  'done',
  'failed',
]);

// ── Models ─────────────────────────────────────────────────────────────

export const models = pgTable('models', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

  name: text('name').notNull(),
  pseudoHandle: text('pseudo_handle'),
  platformSource: platformSourceEnum('platform_source').notNull(),
  profileUrl: text('profile_url'),
  followersCount: integer('followers_count'),

  status: modelStatusEnum('status').default('to_dm').notNull(),
  killedReason: text('killed_reason'),

  hasExistingContent: boolean('has_existing_content').default(false),
  visiblePhoneQuality: phoneQualityEnum('visible_phone_quality').default('unknown'),
  elementDifferentiel: jsonb('element_differentiel'),

  estimatedTier: tierEnum('estimated_tier').default('unknown'),

  geoCountry: text('geo_country'),
  nationality: text('nationality'),
  age: integer('age'),

  disponibilityHoursPerDay: decimal('disponibility_hours_per_day', { precision: 4, scale: 2 }),
  hardLimits: text('hard_limits'),
  aiConsent: boolean('ai_consent'),
  multiAccountConsent: boolean('multi_account_consent'),
  financialExpectationsMonthly: integer('financial_expectations_monthly'),
  previousAgenciesCount: integer('previous_agencies_count'),

  callDate: date('call_date'),
  matosVerified: boolean('matos_verified'),
  faceCamNatural: faceCamEnum('face_cam_natural'),
  elementDifferentielConfirmed: boolean('element_differentiel_confirmed'),
  personalCompat: compatEnum('personal_compat'),
  notesCall: text('notes_call'),

  decision: decisionEnum('decision'),
  decisionReason: text('decision_reason'),
  decisionDate: date('decision_date'),

  currentMainAccountCount: integer('current_main_account_count'),
  loraTrainedAt: timestamp('lora_trained_at', { withTimezone: true }),
  loraStorageUrl: text('lora_storage_url'),
  compStructure: jsonb('comp_structure'),
  monthlyRevenueTargetCents: integer('monthly_revenue_target_cents'),
  signedContractUrl: text('signed_contract_url'),
});

// ── Activities ─────────────────────────────────────────────────────────

export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelId: uuid('model_id')
    .references(() => models.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  type: activityTypeEnum('type').notNull(),
  content: text('content'),
  metadata: jsonb('metadata'),
});

// ── DM Templates ───────────────────────────────────────────────────────

export const dmTemplates = pgTable('dm_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  name: text('name').notNull(),
  platform: platformSourceEnum('platform').notNull(),
  content: text('content').notNull(),
  variables: jsonb('variables'),
  timesUsed: integer('times_used').default(0),
  responseRate: decimal('response_rate', { precision: 5, scale: 4 }),
});

// ── Questionnaires ─────────────────────────────────────────────────────

export const questionnaires = pgTable('questionnaires', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelId: uuid('model_id')
    .references(() => models.id, { onDelete: 'cascade' })
    .notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  rawResponses: jsonb('raw_responses').notNull(),
  extractedSummary: text('extracted_summary'),
});

// ── Niches ─────────────────────────────────────────────────────────────

export const niches = pgTable('niches', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  targetAudience: text('target_audience'),
  saturationLevel: saturationLevelEnum('saturation_level').default('medium'),
  keywords: jsonb('keywords'),
  notes: text('notes'),
  estimatedRevenuePerModel: integer('estimated_revenue_per_model'),
});

// ── Differenciants ─────────────────────────────────────────────────────

export const differenciants = pgTable('differenciants', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  name: text('name').notNull(),
  category: diffCategoryEnum('category').notNull(),
  description: text('description'),
  photos: jsonb('photos'),
  notes: text('notes'),
});

// ── Niches ↔ Differenciants ────────────────────────────────────────────

export const nichesDifferenciants = pgTable('niches_differenciants', {
  id: uuid('id').primaryKey().defaultRandom(),
  nicheId: uuid('niche_id')
    .references(() => niches.id, { onDelete: 'cascade' })
    .notNull(),
  differenciantId: uuid('differenciant_id')
    .references(() => differenciants.id, { onDelete: 'cascade' })
    .notNull(),
});

// ── Competitors ────────────────────────────────────────────────────────

export const competitors = pgTable('competitors', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  name: text('name').notNull(),
  platform: text('platform').notNull(),
  profileUrl: text('profile_url'),
  nicheId: uuid('niche_id').references(() => niches.id, { onDelete: 'set null' }),
  followersCount: integer('followers_count'),
  estimatedRevenueMonthly: integer('estimated_revenue_monthly'),
  postingFrequencyPerWeek: decimal('posting_frequency_per_week', { precision: 4, scale: 1 }),
  screenshotExamples: jsonb('screenshot_examples'),
  notes: text('notes'),
});

// ── Competitor Snapshots ───────────────────────────────────────────────

export const competitorSnapshots = pgTable('competitor_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  competitorId: uuid('competitor_id')
    .references(() => competitors.id, { onDelete: 'cascade' })
    .notNull(),
  capturedAt: timestamp('captured_at', { withTimezone: true }).defaultNow().notNull(),
  followersCount: integer('followers_count'),
  likesAvg: integer('likes_avg'),
  postsCount: integer('posts_count'),
  metadata: jsonb('metadata'),
});

// ── Competitor Winning Formats ─────────────────────────────────────────

export const competitorWinningFormats = pgTable('competitor_winning_formats', {
  id: uuid('id').primaryKey().defaultRandom(),
  competitorId: uuid('competitor_id')
    .references(() => competitors.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  formatType: formatTypeEnum('format_type').notNull(),
  description: text('description').notNull(),
  exampleUrl: text('example_url'),
  estimatedEngagement: text('estimated_engagement'),
  notes: text('notes'),
});

// ── Source Videos (Content Library) ────────────────────────────────────

export const sourceVideos = pgTable('source_videos', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  modelId: uuid('model_id').references(() => models.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  storageUrl: text('storage_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  durationSeconds: integer('duration_seconds'),
  fileSizeBytes: integer('file_size_bytes'),
  nicheId: uuid('niche_id').references(() => niches.id, { onDelete: 'set null' }),
  tags: jsonb('tags'),
  notes: text('notes'),
});

// ── Video Variations ───────────────────────────────────────────────────

export const videoVariations = pgTable('video_variations', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  sourceVideoId: uuid('source_video_id')
    .references(() => sourceVideos.id, { onDelete: 'cascade' })
    .notNull(),
  status: variationStatusEnum('status').default('pending').notNull(),
  storageUrl: text('storage_url'),
  thumbnailUrl: text('thumbnail_url'),
  config: jsonb('config'),
  errorMessage: text('error_message'),
});

// ── Variation Postings ─────────────────────────────────────────────────

export const variationPostings = pgTable('variation_postings', {
  id: uuid('id').primaryKey().defaultRandom(),
  variationId: uuid('variation_id')
    .references(() => videoVariations.id, { onDelete: 'cascade' })
    .notNull(),
  postedAt: timestamp('posted_at', { withTimezone: true }).defaultNow().notNull(),
  platform: text('platform').notNull(),
  accountHandle: text('account_handle'),
  postUrl: text('post_url'),
  views: integer('views'),
  likes: integer('likes'),
  comments: integer('comments'),
});

// ── Inspiration Library ────────────────────────────────────────────────

export const inspirationItems = pgTable('inspiration_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  url: text('url'),
  screenshotUrl: text('screenshot_url'),
  nicheId: uuid('niche_id').references(() => niches.id, { onDelete: 'set null' }),
  hookPattern: text('hook_pattern'),
  formatType: formatTypeEnum('format_type'),
  notes: text('notes'),
  tags: jsonb('tags'),
});

// ── Accounts (IG/platform accounts per model) ─────────────────────────

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  modelId: uuid('model_id')
    .references(() => models.id, { onDelete: 'cascade' })
    .notNull(),
  platform: text('platform').notNull(),
  handle: text('handle').notNull(),
  profileUrl: text('profile_url'),
  status: accountStatusEnum('status').default('warming').notNull(),
  followersCount: integer('followers_count'),
  nicheId: uuid('niche_id').references(() => niches.id, { onDelete: 'set null' }),
  notes: text('notes'),
});

// ── Expenses ───────────────────────────────────────────────────────────

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  date: date('date').notNull(),
  category: expenseCategoryEnum('category').notNull(),
  description: text('description').notNull(),
  amountCents: integer('amount_cents').notNull(),
  modelId: uuid('model_id').references(() => models.id, { onDelete: 'set null' }),
  recurring: boolean('recurring').default(false),
  notes: text('notes'),
});

// ── AI Studio Characters ──────────────────────────────────────────────

export const aiCharacters = pgTable('ai_characters', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  modelId: uuid('model_id').references(() => models.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  handle: text('handle').notNull(),
  description: text('description'),
  identityPrompt: text('identity_prompt'),
  negativePrompt: text('negative_prompt'),
  notes: text('notes'),
});

// ── AI Studio Environments ────────────────────────────────────────────

export const aiEnvironments = pgTable('ai_environments', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  name: text('name').notNull(),
  handle: text('handle').notNull(),
  description: text('description'),
  environmentPrompt: text('environment_prompt'),
  negativePrompt: text('negative_prompt'),
  notes: text('notes'),
});

// ── AI Studio Private Reference Images ────────────────────────────────

export const aiReferenceImages = pgTable('ai_reference_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  assetType: aiAssetTypeEnum('asset_type').notNull(),
  characterId: uuid('character_id').references(() => aiCharacters.id, { onDelete: 'cascade' }),
  environmentId: uuid('environment_id').references(() => aiEnvironments.id, { onDelete: 'cascade' }),
  bucket: text('bucket').default('ai-reference').notNull(),
  storagePath: text('storage_path').notNull(),
  originalName: text('original_name'),
  mimeType: text('mime_type'),
  fileSizeBytes: integer('file_size_bytes'),
  notes: text('notes'),
});

// ── AI Studio Generation Jobs ─────────────────────────────────────────

export const aiGenerationJobs = pgTable('ai_generation_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  characterId: uuid('character_id').references(() => aiCharacters.id, { onDelete: 'set null' }),
  environmentId: uuid('environment_id').references(() => aiEnvironments.id, { onDelete: 'set null' }),
  provider: text('provider').default('enhancor').notNull(),
  status: aiGenerationStatusEnum('status').default('draft').notNull(),
  prompt: text('prompt').notNull(),
  negativePrompt: text('negative_prompt'),
  config: jsonb('config'),
  resultBucket: text('result_bucket'),
  resultPath: text('result_path'),
  errorMessage: text('error_message'),
});
