-- Manual migration note:
-- This migration adds the oXRM foundation tables and nullable xrm_record_id links on tasks/activities.
-- Existing leads, people, companies, tasks, and activities remain canonical during rollout; no automatic data rewrite is performed here.
-- After applying, run the seed step to install built-in outreach object types and relationship types.
-- Optional backfill can create xrm_records with legacy_entity_type/legacy_entity_id for existing CRM rows after operators review mapping rules.
-- Verification: run seed, typecheck/build, db smoke, and an xrm upsert/link/list smoke against a Docker instance.
-- Rollback impact: dropping these tables/columns removes only generic oXRM records/links created after this migration, not legacy CRM rows.

CREATE TABLE "xrm_field_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_type_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"data_type" text DEFAULT 'text' NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"indexed" boolean DEFAULT false NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xrm_object_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"plural_label" text NOT NULL,
	"icon" text,
	"display_field" text DEFAULT 'name' NOT NULL,
	"description" text,
	"template_key" text,
	"system" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xrm_record_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"relationship_type_id" uuid NOT NULL,
	"source_record_id" uuid NOT NULL,
	"target_record_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" text,
	"created_by_agent_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xrm_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_type_id" uuid NOT NULL,
	"external_key" text,
	"display_name" text NOT NULL,
	"fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"search_text" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text,
	"owner_agent_id" uuid,
	"legacy_entity_type" text,
	"legacy_entity_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xrm_relationship_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"inverse_label" text,
	"source_object_type_id" uuid,
	"target_object_type_id" uuid,
	"cardinality" text DEFAULT 'many_to_many' NOT NULL,
	"metadata_schema" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"system" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "xrm_record_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "xrm_record_id" uuid;--> statement-breakpoint
ALTER TABLE "xrm_field_definitions" ADD CONSTRAINT "xrm_field_definitions_object_type_id_xrm_object_types_id_fk" FOREIGN KEY ("object_type_id") REFERENCES "public"."xrm_object_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xrm_record_relationships" ADD CONSTRAINT "xrm_record_relationships_relationship_type_id_xrm_relationship_types_id_fk" FOREIGN KEY ("relationship_type_id") REFERENCES "public"."xrm_relationship_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xrm_record_relationships" ADD CONSTRAINT "xrm_record_relationships_source_record_id_xrm_records_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."xrm_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xrm_record_relationships" ADD CONSTRAINT "xrm_record_relationships_target_record_id_xrm_records_id_fk" FOREIGN KEY ("target_record_id") REFERENCES "public"."xrm_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xrm_record_relationships" ADD CONSTRAINT "xrm_record_relationships_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xrm_records" ADD CONSTRAINT "xrm_records_object_type_id_xrm_object_types_id_fk" FOREIGN KEY ("object_type_id") REFERENCES "public"."xrm_object_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xrm_records" ADD CONSTRAINT "xrm_records_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xrm_relationship_types" ADD CONSTRAINT "xrm_relationship_types_source_object_type_id_xrm_object_types_id_fk" FOREIGN KEY ("source_object_type_id") REFERENCES "public"."xrm_object_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xrm_relationship_types" ADD CONSTRAINT "xrm_relationship_types_target_object_type_id_xrm_object_types_id_fk" FOREIGN KEY ("target_object_type_id") REFERENCES "public"."xrm_object_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "xrm_field_definitions_object_key_unique" ON "xrm_field_definitions" USING btree ("object_type_id","key");--> statement-breakpoint
CREATE INDEX "xrm_field_definitions_object_idx" ON "xrm_field_definitions" USING btree ("object_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "xrm_object_types_slug_unique" ON "xrm_object_types" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "xrm_object_types_template_idx" ON "xrm_object_types" USING btree ("template_key");--> statement-breakpoint
CREATE UNIQUE INDEX "xrm_record_relationships_unique" ON "xrm_record_relationships" USING btree ("relationship_type_id","source_record_id","target_record_id");--> statement-breakpoint
CREATE INDEX "xrm_record_relationships_source_idx" ON "xrm_record_relationships" USING btree ("source_record_id");--> statement-breakpoint
CREATE INDEX "xrm_record_relationships_target_idx" ON "xrm_record_relationships" USING btree ("target_record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "xrm_records_object_external_unique" ON "xrm_records" USING btree ("object_type_id","external_key");--> statement-breakpoint
CREATE INDEX "xrm_records_object_updated_idx" ON "xrm_records" USING btree ("object_type_id","updated_at");--> statement-breakpoint
CREATE INDEX "xrm_records_search_idx" ON "xrm_records" USING btree ("search_text");--> statement-breakpoint
CREATE INDEX "xrm_records_legacy_idx" ON "xrm_records" USING btree ("legacy_entity_type","legacy_entity_id");--> statement-breakpoint
CREATE INDEX "xrm_records_status_idx" ON "xrm_records" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "xrm_relationship_types_key_unique" ON "xrm_relationship_types" USING btree ("key");--> statement-breakpoint
CREATE INDEX "xrm_relationship_types_source_target_idx" ON "xrm_relationship_types" USING btree ("source_object_type_id","target_object_type_id");--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_xrm_record_id_xrm_records_id_fk" FOREIGN KEY ("xrm_record_id") REFERENCES "public"."xrm_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_xrm_record_id_xrm_records_id_fk" FOREIGN KEY ("xrm_record_id") REFERENCES "public"."xrm_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_xrm_record_time_idx" ON "activities" USING btree ("xrm_record_id","occurred_at");--> statement-breakpoint
CREATE INDEX "tasks_xrm_record_idx" ON "tasks" USING btree ("xrm_record_id");
