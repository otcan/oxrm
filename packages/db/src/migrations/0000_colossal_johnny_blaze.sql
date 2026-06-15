CREATE TYPE "public"."activity_type" AS ENUM('connection_sent', 'connection_accepted', 'message_sent', 'message_received', 'inmail_sent', 'email_sent', 'email_received', 'follow_up_due', 'booking_created', 'meeting_booked', 'not_interested', 'converted', 'manual_note');--> statement-breakpoint
CREATE TYPE "public"."agent_status" AS ENUM('active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."agent_type" AS ENUM('crm_operator', 'code_contributor', 'connector_worker', 'scheduler_worker');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."assignment_status" AS ENUM('new', 'queued', 'connection_sent', 'connected', 'messaged', 'follow_up_due', 'replied', 'meeting_booked', 'won', 'lost', 'do_not_contact');--> statement-breakpoint
CREATE TYPE "public"."backup_status" AS ENUM('running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('linkedin', 'salesnav', 'email', 'scheduler', 'manual');--> statement-breakpoint
CREATE TYPE "public"."direction" AS ENUM('outbound', 'inbound', 'internal');--> statement-breakpoint
CREATE TYPE "public"."integration_provider" AS ENUM('linkedin', 'salesnav', 'gmail', 'outlook', 'google_calendar', 'microsoft_calendar', 'caldav');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('active', 'needs_auth', 'paused', 'error', 'archived');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"assignment_id" uuid,
	"integration_account_id" uuid,
	"type" "activity_type" NOT NULL,
	"channel" "channel" NOT NULL,
	"direction" "direction" DEFAULT 'internal' NOT NULL,
	"body" text,
	"external_id" text,
	"created_by_agent_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"tool_name" text NOT NULL,
	"input_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"approval_id" uuid,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "agent_type" NOT NULL,
	"status" "agent_status" DEFAULT 'active' NOT NULL,
	"default_branch_prefix" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"operation" text NOT NULL,
	"reason" text,
	"payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "approval_status" DEFAULT 'pending' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_flow_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"flow_id" uuid NOT NULL,
	"current_step_id" uuid,
	"status" "assignment_status" DEFAULT 'new' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"owner_agent_id" uuid,
	"last_contacted_at" timestamp with time zone,
	"next_action_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backup_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "backup_status" NOT NULL,
	"github_repo" text NOT NULL,
	"artifact_path" text,
	"commit_sha" text,
	"manifest_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type_id" uuid NOT NULL,
	"lead_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"attendee_name" text NOT NULL,
	"attendee_email" text NOT NULL,
	"external_calendar_event_id" text,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"duration_minutes" integer NOT NULL,
	"buffer_before_minutes" integer DEFAULT 0 NOT NULL,
	"buffer_after_minutes" integer DEFAULT 0 NOT NULL,
	"booking_window_days" integer DEFAULT 30 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_types_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "flow_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flow_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"name" text NOT NULL,
	"default_delay_days" integer,
	"template" text,
	"channel" "channel" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"display_name" text NOT NULL,
	"status" "integration_status" DEFAULT 'needs_auth' NOT NULL,
	"auth_type" text DEFAULT 'oauth' NOT NULL,
	"credentials_ref" text,
	"last_sync_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"company" text,
	"title" text,
	"linkedin_url" text,
	"salesnav_url" text,
	"email" text,
	"phone" text,
	"location" text,
	"source" text,
	"owner_agent_id" uuid,
	"notes" text,
	"created_by_agent_id" uuid,
	"updated_by_agent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_assignment_id_lead_flow_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."lead_flow_assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_integration_account_id_integration_accounts_id_fk" FOREIGN KEY ("integration_account_id") REFERENCES "public"."integration_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_approval_id_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_flow_assignments" ADD CONSTRAINT "lead_flow_assignments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_flow_assignments" ADD CONSTRAINT "lead_flow_assignments_flow_id_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_flow_assignments" ADD CONSTRAINT "lead_flow_assignments_current_step_id_flow_steps_id_fk" FOREIGN KEY ("current_step_id") REFERENCES "public"."flow_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_flow_assignments" ADD CONSTRAINT "lead_flow_assignments_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_event_type_id_event_types_id_fk" FOREIGN KEY ("event_type_id") REFERENCES "public"."event_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_steps" ADD CONSTRAINT "flow_steps_flow_id_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_updated_by_agent_id_agents_id_fk" FOREIGN KEY ("updated_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_lead_time_idx" ON "activities" USING btree ("lead_id","occurred_at");--> statement-breakpoint
CREATE INDEX "activities_assignment_time_idx" ON "activities" USING btree ("assignment_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "activities_external_unique" ON "activities" USING btree ("integration_account_id","external_id");--> statement-breakpoint
CREATE INDEX "agent_actions_agent_time_idx" ON "agent_actions" USING btree ("agent_id","created_at");--> statement-breakpoint
CREATE INDEX "approvals_status_idx" ON "approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assignments_status_idx" ON "lead_flow_assignments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assignments_next_action_idx" ON "lead_flow_assignments" USING btree ("next_action_at");--> statement-breakpoint
CREATE INDEX "assignments_owner_agent_idx" ON "lead_flow_assignments" USING btree ("owner_agent_id");--> statement-breakpoint
CREATE INDEX "backup_runs_started_idx" ON "backup_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "bookings_event_time_idx" ON "bookings" USING btree ("event_type_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "flow_steps_flow_order_unique" ON "flow_steps" USING btree ("flow_id","step_order");--> statement-breakpoint
CREATE INDEX "integration_accounts_provider_idx" ON "integration_accounts" USING btree ("provider");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_linkedin_url_unique" ON "leads" USING btree ("linkedin_url");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_salesnav_url_unique" ON "leads" USING btree ("salesnav_url");--> statement-breakpoint
CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "leads_owner_agent_idx" ON "leads" USING btree ("owner_agent_id");