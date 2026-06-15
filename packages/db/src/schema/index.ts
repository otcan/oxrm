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
  "connection_request_sent",
  "connection_request_received",
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
export const emailAddressType = pgEnum("email_address_type", ["work", "personal", "other"]);
export const emailAddressStatus = pgEnum("email_address_status", ["unknown", "valid", "invalid", "bounced", "unsubscribed"]);
export const externalIdentityProvider = pgEnum("external_identity_provider", [
  "linkedin",
  "salesnav",
  "email",
  "domain",
  "website",
  "manual",
  "external"
]);
export const externalIdentitySubject = pgEnum("external_identity_subject", ["person", "company", "lead"]);
export const taskStatus = pgEnum("task_status", ["open", "in_progress", "blocked", "done", "canceled"]);
export const taskType = pgEnum("task_type", ["outreach", "follow_up", "research", "data_cleanup", "approval", "manual"]);
export const taskEventType = pgEnum("task_event_type", ["created", "updated", "assigned", "completed", "canceled", "comment"]);

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

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    website: text("website"),
    primaryDomain: text("primary_domain"),
    industry: text("industry"),
    size: text("size"),
    location: text("location"),
    source: text("source"),
    customFields: jsonb("custom_fields").notNull().default(sql`'{}'::jsonb`),
    ...timestamps
  },
  (table) => [
    uniqueIndex("companies_normalized_name_unique").on(table.normalizedName),
    index("companies_primary_domain_idx").on(table.primaryDomain)
  ]
);

export const companyDomains = pgTable(
  "company_domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    source: text("source"),
    ...timestamps
  },
  (table) => [uniqueIndex("company_domains_domain_unique").on(table.domain), index("company_domains_company_idx").on(table.companyId)]
);

export const people = pgTable(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fullName: text("full_name").notNull(),
    normalizedFullName: text("normalized_full_name").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    title: text("title"),
    location: text("location"),
    timezone: text("timezone"),
    seniority: text("seniority"),
    department: text("department"),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    source: text("source"),
    customFields: jsonb("custom_fields").notNull().default(sql`'{}'::jsonb`),
    ...timestamps
  },
  (table) => [
    index("people_normalized_name_idx").on(table.normalizedFullName),
    index("people_company_idx").on(table.companyId)
  ]
);

export const emailAddresses = pgTable(
  "email_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id").references(() => people.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    normalizedEmail: text("normalized_email").notNull(),
    domain: text("domain").notNull(),
    type: emailAddressType("type").notNull().default("work"),
    status: emailAddressStatus("status").notNull().default("unknown"),
    isPrimary: boolean("is_primary").notNull().default(false),
    source: text("source"),
    ...timestamps
  },
  (table) => [
    uniqueIndex("email_addresses_normalized_unique").on(table.normalizedEmail),
    index("email_addresses_person_idx").on(table.personId),
    index("email_addresses_company_idx").on(table.companyId),
    index("email_addresses_domain_idx").on(table.domain)
  ]
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id").references(() => people.id, { onDelete: "set null" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
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
    customFields: jsonb("custom_fields").notNull().default(sql`'{}'::jsonb`),
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

export const leadRecords = pgTable(
  "lead_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    status: assignmentStatus("status").notNull().default("new"),
    source: text("source"),
    ownerAgentId: uuid("owner_agent_id").references(() => agents.id),
    customFields: jsonb("custom_fields").notNull().default(sql`'{}'::jsonb`),
    ...timestamps
  },
  (table) => [
    uniqueIndex("lead_records_lead_unique").on(table.leadId),
    index("lead_records_person_idx").on(table.personId),
    index("lead_records_company_idx").on(table.companyId),
    index("lead_records_status_idx").on(table.status)
  ]
);

export const externalIdentities = pgTable(
  "external_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: externalIdentityProvider("provider").notNull(),
    subjectType: externalIdentitySubject("subject_type").notNull(),
    personId: uuid("person_id").references(() => people.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    externalId: text("external_id"),
    externalUrl: text("external_url"),
    normalizedValue: text("normalized_value").notNull(),
    source: text("source"),
    ...timestamps
  },
  (table) => [
    uniqueIndex("external_identities_provider_value_unique").on(table.provider, table.normalizedValue),
    index("external_identities_person_idx").on(table.personId),
    index("external_identities_company_idx").on(table.companyId),
    index("external_identities_lead_idx").on(table.leadId)
  ]
);

export const mergeEvents = pgTable(
  "merge_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    targetId: uuid("target_id").notNull(),
    reason: text("reason"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdByAgentId: uuid("created_by_agent_id").references(() => agents.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("merge_events_entity_idx").on(table.entityType, table.targetId)]
);

export const dedupeCandidates = pgTable(
  "dedupe_candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    leftId: uuid("left_id").notNull(),
    rightId: uuid("right_id").notNull(),
    reason: text("reason").notNull(),
    score: integer("score").notNull().default(0),
    status: text("status").notNull().default("open"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    ...timestamps
  },
  (table) => [index("dedupe_candidates_status_idx").on(table.status)]
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

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    type: taskType("type").notNull().default("manual"),
    status: taskStatus("status").notNull().default("open"),
    priority: integer("priority").notNull().default(0),
    dueAt: timestamp("due_at", { withTimezone: true }),
    ownerAgentId: uuid("owner_agent_id").references(() => agents.id),
    personId: uuid("person_id").references(() => people.id, { onDelete: "set null" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    assignmentId: uuid("assignment_id").references(() => assignments.id, { onDelete: "set null" }),
    idempotencyKey: text("idempotency_key"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    ...timestamps
  },
  (table) => [
    uniqueIndex("tasks_idempotency_key_unique").on(table.idempotencyKey),
    index("tasks_status_due_idx").on(table.status, table.dueAt),
    index("tasks_owner_idx").on(table.ownerAgentId),
    index("tasks_lead_idx").on(table.leadId)
  ]
);

export const taskEvents = pgTable(
  "task_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    type: taskEventType("type").notNull(),
    body: text("body"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdByAgentId: uuid("created_by_agent_id").references(() => agents.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("task_events_task_time_idx").on(table.taskId, table.createdAt)]
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
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    personId: uuid("person_id").references(() => people.id, { onDelete: "set null" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    assignmentId: uuid("assignment_id").references(() => assignments.id, { onDelete: "set null" }),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    integrationAccountId: uuid("integration_account_id").references(() => integrationAccounts.id),
    type: activityType("type").notNull(),
    channel: channel("channel").notNull(),
    direction: direction("direction").notNull().default("internal"),
    subject: text("subject"),
    body: text("body"),
    providerThreadId: text("provider_thread_id"),
    providerMessageId: text("provider_message_id"),
    externalId: text("external_id"),
    externalUrl: text("external_url"),
    idempotencyKey: text("idempotency_key"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdByAgentId: uuid("created_by_agent_id").references(() => agents.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("activities_lead_time_idx").on(table.leadId, table.occurredAt),
    index("activities_person_time_idx").on(table.personId, table.occurredAt),
    index("activities_company_time_idx").on(table.companyId, table.occurredAt),
    index("activities_assignment_time_idx").on(table.assignmentId, table.occurredAt),
    index("activities_task_time_idx").on(table.taskId, table.occurredAt),
    index("activities_channel_time_idx").on(table.channel, table.occurredAt),
    uniqueIndex("activities_idempotency_key_unique").on(table.idempotencyKey),
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

export const companyRelations = relations(companies, ({ many }) => ({
  domains: many(companyDomains),
  people: many(people),
  emailAddresses: many(emailAddresses),
  leadRecords: many(leadRecords),
  activities: many(activities),
  tasks: many(tasks)
}));

export const companyDomainRelations = relations(companyDomains, ({ one }) => ({
  company: one(companies, { fields: [companyDomains.companyId], references: [companies.id] })
}));

export const personRelations = relations(people, ({ one, many }) => ({
  company: one(companies, { fields: [people.companyId], references: [companies.id] }),
  emailAddresses: many(emailAddresses),
  leadRecords: many(leadRecords),
  activities: many(activities),
  tasks: many(tasks)
}));

export const emailAddressRelations = relations(emailAddresses, ({ one }) => ({
  person: one(people, { fields: [emailAddresses.personId], references: [people.id] }),
  company: one(companies, { fields: [emailAddresses.companyId], references: [companies.id] })
}));

export const leadRelations = relations(leads, ({ one, many }) => ({
  person: one(people, { fields: [leads.personId], references: [people.id] }),
  companyEntity: one(companies, { fields: [leads.companyId], references: [companies.id] }),
  leadRecord: one(leadRecords),
  assignments: many(assignments),
  activities: many(activities),
  bookings: many(bookings),
  tasks: many(tasks)
}));

export const leadRecordRelations = relations(leadRecords, ({ one }) => ({
  lead: one(leads, { fields: [leadRecords.leadId], references: [leads.id] }),
  person: one(people, { fields: [leadRecords.personId], references: [people.id] }),
  company: one(companies, { fields: [leadRecords.companyId], references: [companies.id] })
}));

export const externalIdentityRelations = relations(externalIdentities, ({ one }) => ({
  person: one(people, { fields: [externalIdentities.personId], references: [people.id] }),
  company: one(companies, { fields: [externalIdentities.companyId], references: [companies.id] }),
  lead: one(leads, { fields: [externalIdentities.leadId], references: [leads.id] })
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

export const flowStepRelations = relations(flowSteps, ({ one }) => ({
  flow: one(flows, { fields: [flowSteps.flowId], references: [flows.id] })
}));

export const activityRelations = relations(activities, ({ one }) => ({
  lead: one(leads, { fields: [activities.leadId], references: [leads.id] }),
  person: one(people, { fields: [activities.personId], references: [people.id] }),
  company: one(companies, { fields: [activities.companyId], references: [companies.id] }),
  assignment: one(assignments, { fields: [activities.assignmentId], references: [assignments.id] }),
  task: one(tasks, { fields: [activities.taskId], references: [tasks.id] }),
  integrationAccount: one(integrationAccounts, {
    fields: [activities.integrationAccountId],
    references: [integrationAccounts.id]
  })
}));

export const bookingRelations = relations(bookings, ({ one }) => ({
  lead: one(leads, { fields: [bookings.leadId], references: [leads.id] }),
  eventType: one(eventTypes, { fields: [bookings.eventTypeId], references: [eventTypes.id] })
}));

export const taskRelations = relations(tasks, ({ one, many }) => ({
  person: one(people, { fields: [tasks.personId], references: [people.id] }),
  company: one(companies, { fields: [tasks.companyId], references: [companies.id] }),
  lead: one(leads, { fields: [tasks.leadId], references: [leads.id] }),
  assignment: one(assignments, { fields: [tasks.assignmentId], references: [assignments.id] }),
  activities: many(activities),
  events: many(taskEvents)
}));

export const taskEventRelations = relations(taskEvents, ({ one }) => ({
  task: one(tasks, { fields: [taskEvents.taskId], references: [tasks.id] })
}));

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
export type EmailAddress = typeof emailAddresses.$inferSelect;
export type NewEmailAddress = typeof emailAddresses.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type LeadRecord = typeof leadRecords.$inferSelect;
export type NewLeadRecord = typeof leadRecords.$inferInsert;
export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type IntegrationSyncRun = typeof integrationSyncRuns.$inferSelect;
