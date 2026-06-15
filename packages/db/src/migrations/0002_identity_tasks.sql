DO $$ BEGIN
 CREATE TYPE "public"."email_address_type" AS ENUM('work', 'personal', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE IF NOT EXISTS 'connection_request_sent' BEFORE 'connection_sent';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE IF NOT EXISTS 'connection_request_received' BEFORE 'connection_sent';--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."email_address_status" AS ENUM('unknown', 'valid', 'invalid', 'bounced', 'unsubscribed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."external_identity_provider" AS ENUM('linkedin', 'salesnav', 'email', 'domain', 'website', 'manual', 'external');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."external_identity_subject" AS ENUM('person', 'company', 'lead');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."task_status" AS ENUM('open', 'in_progress', 'blocked', 'done', 'canceled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."task_type" AS ENUM('outreach', 'follow_up', 'research', 'data_cleanup', 'approval', 'manual');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."task_event_type" AS ENUM('created', 'updated', 'assigned', 'completed', 'canceled', 'comment');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "companies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "normalized_name" text NOT NULL,
  "website" text,
  "primary_domain" text,
  "industry" text,
  "size" text,
  "location" text,
  "source" text,
  "custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "companies_normalized_name_unique" ON "companies" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "companies_primary_domain_idx" ON "companies" USING btree ("primary_domain");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "company_domains" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "domain" text NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "source" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "company_domains" ADD CONSTRAINT "company_domains_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "company_domains_domain_unique" ON "company_domains" USING btree ("domain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_domains_company_idx" ON "company_domains" USING btree ("company_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "people" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "full_name" text NOT NULL,
  "normalized_full_name" text NOT NULL,
  "first_name" text,
  "last_name" text,
  "title" text,
  "location" text,
  "timezone" text,
  "seniority" text,
  "department" text,
  "company_id" uuid,
  "source" text,
  "custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "people_normalized_name_idx" ON "people" USING btree ("normalized_full_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "people_company_idx" ON "people" USING btree ("company_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "email_addresses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "person_id" uuid,
  "company_id" uuid,
  "email" text NOT NULL,
  "normalized_email" text NOT NULL,
  "domain" text NOT NULL,
  "type" "email_address_type" DEFAULT 'work' NOT NULL,
  "status" "email_address_status" DEFAULT 'unknown' NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "source" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "email_addresses" ADD CONSTRAINT "email_addresses_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_addresses" ADD CONSTRAINT "email_addresses_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_addresses_normalized_unique" ON "email_addresses" USING btree ("normalized_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_addresses_person_idx" ON "email_addresses" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_addresses_company_idx" ON "email_addresses" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_addresses_domain_idx" ON "email_addresses" USING btree ("domain");--> statement-breakpoint

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "person_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "company_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

ALTER TABLE "activities" ALTER COLUMN "lead_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "person_id" uuid;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "company_id" uuid;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "task_id" uuid;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "subject" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "provider_thread_id" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "provider_message_id" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "external_url" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activities" ADD CONSTRAINT "activities_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activities" ADD CONSTRAINT "activities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activities_person_time_idx" ON "activities" USING btree ("person_id", "occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activities_company_time_idx" ON "activities" USING btree ("company_id", "occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activities_task_time_idx" ON "activities" USING btree ("task_id", "occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activities_channel_time_idx" ON "activities" USING btree ("channel", "occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "activities_idempotency_key_unique" ON "activities" USING btree ("idempotency_key");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "lead_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL,
  "person_id" uuid NOT NULL,
  "company_id" uuid,
  "status" "assignment_status" DEFAULT 'new' NOT NULL,
  "source" text,
  "owner_agent_id" uuid,
  "custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "lead_records" ADD CONSTRAINT "lead_records_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_records" ADD CONSTRAINT "lead_records_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_records" ADD CONSTRAINT "lead_records_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_records" ADD CONSTRAINT "lead_records_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "lead_records_lead_unique" ON "lead_records" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_records_person_idx" ON "lead_records" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_records_company_idx" ON "lead_records" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_records_status_idx" ON "lead_records" USING btree ("status");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "external_identities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" "external_identity_provider" NOT NULL,
  "subject_type" "external_identity_subject" NOT NULL,
  "person_id" uuid,
  "company_id" uuid,
  "lead_id" uuid,
  "external_id" text,
  "external_url" text,
  "normalized_value" text NOT NULL,
  "source" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "external_identities" ADD CONSTRAINT "external_identities_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_identities" ADD CONSTRAINT "external_identities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_identities" ADD CONSTRAINT "external_identities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "external_identities_provider_value_unique" ON "external_identities" USING btree ("provider", "normalized_value");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_identities_person_idx" ON "external_identities" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_identities_company_idx" ON "external_identities" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_identities_lead_idx" ON "external_identities" USING btree ("lead_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "merge_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entity_type" text NOT NULL,
  "source_id" uuid NOT NULL,
  "target_id" uuid NOT NULL,
  "reason" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_by_agent_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "merge_events" ADD CONSTRAINT "merge_events_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "merge_events_entity_idx" ON "merge_events" USING btree ("entity_type", "target_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "dedupe_candidates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entity_type" text NOT NULL,
  "left_id" uuid NOT NULL,
  "right_id" uuid NOT NULL,
  "reason" text NOT NULL,
  "score" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dedupe_candidates_status_idx" ON "dedupe_candidates" USING btree ("status");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "type" "task_type" DEFAULT 'manual' NOT NULL,
  "status" "task_status" DEFAULT 'open' NOT NULL,
  "priority" integer DEFAULT 0 NOT NULL,
  "due_at" timestamp with time zone,
  "owner_agent_id" uuid,
  "person_id" uuid,
  "company_id" uuid,
  "lead_id" uuid,
  "assignment_id" uuid,
  "idempotency_key" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignment_id_lead_flow_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."lead_flow_assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tasks_idempotency_key_unique" ON "tasks" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_status_due_idx" ON "tasks" USING btree ("status", "due_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_owner_idx" ON "tasks" USING btree ("owner_agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_lead_idx" ON "tasks" USING btree ("lead_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activities" ADD CONSTRAINT "activities_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "task_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL,
  "type" "task_event_type" NOT NULL,
  "body" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_by_agent_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_events_task_time_idx" ON "task_events" USING btree ("task_id", "created_at");--> statement-breakpoint

INSERT INTO "companies" ("name", "normalized_name", "source")
SELECT min(trim("company")), lower(regexp_replace(trim("company"), '\s+', ' ', 'g')), 'migration'
FROM "leads"
WHERE "company" IS NOT NULL AND trim("company") <> ''
GROUP BY lower(regexp_replace(trim("company"), '\s+', ' ', 'g'))
ON CONFLICT ("normalized_name") DO NOTHING;--> statement-breakpoint

UPDATE "leads"
SET "company_id" = "companies"."id"
FROM "companies"
WHERE "leads"."company_id" IS NULL
  AND "leads"."company" IS NOT NULL
  AND lower(regexp_replace(trim("leads"."company"), '\s+', ' ', 'g')) = "companies"."normalized_name";--> statement-breakpoint

INSERT INTO "people" ("full_name", "normalized_full_name", "title", "location", "company_id", "source", "created_at", "updated_at")
SELECT "full_name", lower(regexp_replace(trim("full_name"), '\s+', ' ', 'g')), "title", "location", "company_id", coalesce("source", 'migration'), "created_at", "updated_at"
FROM "leads"
WHERE "person_id" IS NULL;--> statement-breakpoint

UPDATE "leads"
SET "person_id" = "people"."id"
FROM "people"
WHERE "leads"."person_id" IS NULL
  AND "people"."full_name" = "leads"."full_name"
  AND "people"."created_at" = "leads"."created_at"
  AND ("people"."source" = "leads"."source" OR ("people"."source" = 'migration' AND "leads"."source" IS NULL));--> statement-breakpoint

UPDATE "activities"
SET "person_id" = "leads"."person_id",
    "company_id" = "leads"."company_id"
FROM "leads"
WHERE "activities"."lead_id" = "leads"."id"
  AND ("activities"."person_id" IS NULL OR "activities"."company_id" IS NULL);--> statement-breakpoint

INSERT INTO "email_addresses" ("person_id", "company_id", "email", "normalized_email", "domain", "is_primary", "source")
SELECT DISTINCT ON (lower(trim("email")))
  "person_id",
  "company_id",
  trim("email"),
  lower(trim("email")),
  lower(split_part(trim("email"), '@', 2)),
  true,
  coalesce("source", 'migration')
FROM "leads"
WHERE "email" IS NOT NULL
  AND trim("email") <> ''
  AND position('@' in trim("email")) > 1
ORDER BY lower(trim("email")), "updated_at" DESC
ON CONFLICT ("normalized_email") DO NOTHING;--> statement-breakpoint

INSERT INTO "company_domains" ("company_id", "domain", "is_primary", "source")
SELECT DISTINCT ON ("company_id", lower(split_part(trim("email"), '@', 2)))
  "company_id",
  lower(split_part(trim("email"), '@', 2)),
  false,
  coalesce("source", 'migration')
FROM "leads"
WHERE "company_id" IS NOT NULL
  AND "email" IS NOT NULL
  AND trim("email") <> ''
  AND position('@' in trim("email")) > 1
ON CONFLICT ("domain") DO NOTHING;--> statement-breakpoint

UPDATE "companies"
SET "primary_domain" = "company_domains"."domain"
FROM "company_domains"
WHERE "companies"."id" = "company_domains"."company_id"
  AND "companies"."primary_domain" IS NULL;--> statement-breakpoint

INSERT INTO "lead_records" ("lead_id", "person_id", "company_id", "source", "owner_agent_id", "created_at", "updated_at")
SELECT "id", "person_id", "company_id", "source", "owner_agent_id", "created_at", "updated_at"
FROM "leads"
WHERE "person_id" IS NOT NULL
ON CONFLICT ("lead_id") DO NOTHING;--> statement-breakpoint

INSERT INTO "external_identities" ("provider", "subject_type", "person_id", "lead_id", "external_url", "normalized_value", "source")
SELECT 'linkedin', 'person', "person_id", "id", "linkedin_url", lower(trim("linkedin_url")), coalesce("source", 'migration')
FROM "leads"
WHERE "person_id" IS NOT NULL AND "linkedin_url" IS NOT NULL AND trim("linkedin_url") <> ''
ON CONFLICT ("provider", "normalized_value") DO NOTHING;--> statement-breakpoint

INSERT INTO "external_identities" ("provider", "subject_type", "person_id", "lead_id", "external_url", "normalized_value", "source")
SELECT 'salesnav', 'person', "person_id", "id", "salesnav_url", lower(trim("salesnav_url")), coalesce("source", 'migration')
FROM "leads"
WHERE "person_id" IS NOT NULL AND "salesnav_url" IS NOT NULL AND trim("salesnav_url") <> ''
ON CONFLICT ("provider", "normalized_value") DO NOTHING;--> statement-breakpoint

INSERT INTO "external_identities" ("provider", "subject_type", "person_id", "lead_id", "external_id", "normalized_value", "source")
SELECT 'email', 'person', "person_id", "id", lower(trim("email")), lower(trim("email")), coalesce("source", 'migration')
FROM "leads"
WHERE "person_id" IS NOT NULL AND "email" IS NOT NULL AND trim("email") <> ''
ON CONFLICT ("provider", "normalized_value") DO NOTHING;
