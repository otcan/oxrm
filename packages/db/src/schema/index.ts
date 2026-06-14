import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const assignmentStatus = pgEnum("assignment_status", [
  "new",
  "queued",
  "connection_sent",
  "connected",
  "messaged",
  "follow_up_due",
  "replied",
  "meeting_booked",
  "won",
  "lost",
  "do_not_contact"
]);

export const activityType = pgEnum("activity_type", [
  "connection_sent",
  "connection_accepted",
  "message_sent",
  "message_received",
  "inmail_sent",
  "email_sent",
  "email_received",
  "follow_up_due",
  "booking_created",
  "meeting_booked",
  "not_interested",
  "converted",
  "manual_note"
]);

export const channel = pgEnum("channel", ["linkedin", "salesnav", "email", "scheduler", "manual"]);
export const direction = pgEnum("direction", ["outbound", "inbound", "internal"]);

export const integrationProvider = pgEnum("integration_provider", [
  "linkedin",
  "salesnav",
  "gmail",
  "outlook",
  "google_calendar",
  "microsoft_calendar",
  "caldav"
]);

export const integrationStatus = pgEnum("integration_status", [
  "active",
  "needs_auth",
  "paused",
  "error",
  "archived"
]);
export const syncStatus = pgEnum("sync_status", ["running", "succeeded", "failed"]);

export const agentType = pgEnum("agent_type", [
  "crm_operator",
  "code_contributor",
  "connector_worker",
  "scheduler_worker"
]);

export const agentStatus = pgEnum("agent_status", ["active", "paused", "archived"]);
export const approvalStatus = pgEnum("approval_status", ["pending", "approved", "rejected", "expired"]);
export const backupStatus = pgEnum("backup_status", ["running", "succeeded", "failed"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
};

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: agentType("type").notNull(),
  status: agentStatus("status").notNull().default("active"),
  defaultBranchPrefix: text("default_branch_prefix"),
  ...timestamps
});

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fullName: text("full_name").notNull(),
    company: text("company"),
    title: text("title"),
    linkedinUrl: text("linkedin_url"),
    salesnavUrl: text("salesnav_url"),
    email: text("email"),
    phone: text("phone"),
    location: text("location"),
    source: text("source"),
    ownerAgentId: uuid("owner_agent_id").references(() => agents.id),
    notes: text("notes"),
    createdByAgentId: uuid("created_by_agent_id").references(() => agents.id),
    updatedByAgentId: uuid("updated_by_agent_id").references(() => agents.id),
    ...timestamps
  },
  (table) => [
    uniqueIndex("leads_linkedin_url_unique").on(table.linkedinUrl),
    uniqueIndex("leads_salesnav_url_unique").on(table.salesnavUrl),
    index("leads_email_idx").on(table.email),
    index("leads_owner_agent_idx").on(table.ownerAgentId)
  ]
);

export const flows = pgTable("flows", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  ...timestamps
});

export const flowSteps = pgTable(
  "flow_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    flowId: uuid("flow_id")
      .notNull()
      .references(() => flows.id, { onDelete: "cascade" }),
    stepOrder: integer("step_order").notNull(),
    name: text("name").notNull(),
    defaultDelayDays: integer("default_delay_days"),
    template: text("template"),
    channel: channel("channel").notNull().default("manual"),
    ...timestamps
  },
  (table) => [uniqueIndex("flow_steps_flow_order_unique").on(table.flowId, table.stepOrder)]
);

export const assignments = pgTable(
  "lead_flow_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    flowId: uuid("flow_id")
      .notNull()
      .references(() => flows.id, { onDelete: "cascade" }),
    currentStepId: uuid("current_step_id").references(() => flowSteps.id),
    status: assignmentStatus("status").notNull().default("new"),
    priority: integer("priority").notNull().default(0),
    ownerAgentId: uuid("owner_agent_id").references(() => agents.id),
    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
    nextActionAt: timestamp("next_action_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [
    index("assignments_status_idx").on(table.status),
    index("assignments_next_action_idx").on(table.nextActionAt),
    index("assignments_owner_agent_idx").on(table.ownerAgentId)
  ]
);

export const integrationAccounts = pgTable(
  "integration_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: integrationProvider("provider").notNull(),
    displayName: text("display_name").notNull(),
    status: integrationStatus("status").notNull().default("needs_auth"),
    authType: text("auth_type").notNull().default("oauth"),
    credentialsRef: text("credentials_ref"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastError: text("last_error"),
    ...timestamps
  },
  (table) => [index("integration_accounts_provider_idx").on(table.provider)]
);

export const integrationSyncRuns = pgTable(
  "integration_sync_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    integrationAccountId: uuid("integration_account_id")
      .notNull()
      .references(() => integrationAccounts.id, { onDelete: "cascade" }),
    status: syncStatus("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    importedLeads: integer("imported_leads").notNull().default(0),
    importedActivities: integer("imported_activities").notNull().default(0),
    error: text("error"),
    resultJson: jsonb("result_json").notNull().default(sql`'{}'::jsonb`)
  },
  (table) => [index("integration_sync_runs_account_time_idx").on(table.integrationAccountId, table.startedAt)]
);

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    assignmentId: uuid("assignment_id").references(() => assignments.id, { onDelete: "set null" }),
    integrationAccountId: uuid("integration_account_id").references(() => integrationAccounts.id),
    type: activityType("type").notNull(),
    channel: channel("channel").notNull(),
    direction: direction("direction").notNull().default("internal"),
    body: text("body"),
    externalId: text("external_id"),
    createdByAgentId: uuid("created_by_agent_id").references(() => agents.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("activities_lead_time_idx").on(table.leadId, table.occurredAt),
    index("activities_assignment_time_idx").on(table.assignmentId, table.occurredAt),
    uniqueIndex("activities_external_unique").on(table.integrationAccountId, table.externalId)
  ]
);

export const eventTypes = pgTable("event_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  durationMinutes: integer("duration_minutes").notNull(),
  bufferBeforeMinutes: integer("buffer_before_minutes").notNull().default(0),
  bufferAfterMinutes: integer("buffer_after_minutes").notNull().default(0),
  bookingWindowDays: integer("booking_window_days").notNull().default(30),
  active: boolean("active").notNull().default(true),
  ...timestamps
});

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventTypeId: uuid("event_type_id")
      .notNull()
      .references(() => eventTypes.id),
    leadId: uuid("lead_id").references(() => leads.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    attendeeName: text("attendee_name").notNull(),
    attendeeEmail: text("attendee_email").notNull(),
    externalCalendarEventId: text("external_calendar_event_id"),
    status: text("status").notNull().default("confirmed"),
    ...timestamps
  },
  (table) => [index("bookings_event_time_idx").on(table.eventTypeId, table.startsAt)]
);

export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").references(() => agents.id),
    operation: text("operation").notNull(),
    reason: text("reason"),
    payloadJson: jsonb("payload_json").notNull().default(sql`'{}'::jsonb`),
    status: approvalStatus("status").notNull().default("pending"),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("approvals_status_idx").on(table.status)]
);

export const agentActions = pgTable(
  "agent_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").references(() => agents.id),
    toolName: text("tool_name").notNull(),
    inputJson: jsonb("input_json").notNull().default(sql`'{}'::jsonb`),
    resultJson: jsonb("result_json").notNull().default(sql`'{}'::jsonb`),
    approvalId: uuid("approval_id").references(() => approvals.id),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("agent_actions_agent_time_idx").on(table.agentId, table.createdAt)]
);

export const backupRuns = pgTable(
  "backup_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    status: backupStatus("status").notNull(),
    githubRepo: text("github_repo").notNull(),
    artifactPath: text("artifact_path"),
    commitSha: text("commit_sha"),
    manifestJson: jsonb("manifest_json").notNull().default(sql`'{}'::jsonb`),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true })
  },
  (table) => [index("backup_runs_started_idx").on(table.startedAt)]
);

export const leadRelations = relations(leads, ({ many }) => ({
  assignments: many(assignments),
  activities: many(activities),
  bookings: many(bookings)
}));

export const assignmentRelations = relations(assignments, ({ one, many }) => ({
  lead: one(leads, { fields: [assignments.leadId], references: [leads.id] }),
  flow: one(flows, { fields: [assignments.flowId], references: [flows.id] }),
  currentStep: one(flowSteps, { fields: [assignments.currentStepId], references: [flowSteps.id] }),
  activities: many(activities)
}));

export const flowRelations = relations(flows, ({ many }) => ({
  steps: many(flowSteps),
  assignments: many(assignments)
}));

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type IntegrationSyncRun = typeof integrationSyncRuns.$inferSelect;
