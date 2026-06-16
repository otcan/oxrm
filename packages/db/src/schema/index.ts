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

export const xrmObjectTypes = pgTable(
  "xrm_object_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    pluralLabel: text("plural_label").notNull(),
    icon: text("icon"),
    displayField: text("display_field").notNull().default("name"),
    description: text("description"),
    templateKey: text("template_key"),
    system: boolean("system").notNull().default(false),
    active: boolean("active").notNull().default(true),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    ...timestamps
  },
  (table) => [
    uniqueIndex("xrm_object_types_slug_unique").on(table.slug),
    index("xrm_object_types_template_idx").on(table.templateKey)
  ]
);

export const xrmFieldDefinitions = pgTable(
  "xrm_field_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    objectTypeId: uuid("object_type_id")
      .notNull()
      .references(() => xrmObjectTypes.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    dataType: text("data_type").notNull().default("text"),
    required: boolean("required").notNull().default(false),
    indexed: boolean("indexed").notNull().default(false),
    config: jsonb("config").notNull().default(sql`'{}'::jsonb`),
    ...timestamps
  },
  (table) => [
    uniqueIndex("xrm_field_definitions_object_key_unique").on(table.objectTypeId, table.key),
    index("xrm_field_definitions_object_idx").on(table.objectTypeId)
  ]
);

export const xrmRecords = pgTable(
  "xrm_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    objectTypeId: uuid("object_type_id")
      .notNull()
      .references(() => xrmObjectTypes.id, { onDelete: "restrict" }),
    externalKey: text("external_key"),
    displayName: text("display_name").notNull(),
    fields: jsonb("fields").notNull().default(sql`'{}'::jsonb`),
    searchText: text("search_text").notNull().default(""),
    status: text("status").notNull().default("active"),
    source: text("source"),
    ownerAgentId: uuid("owner_agent_id").references(() => agents.id),
    legacyEntityType: text("legacy_entity_type"),
    legacyEntityId: uuid("legacy_entity_id"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [
    uniqueIndex("xrm_records_object_external_unique").on(table.objectTypeId, table.externalKey),
    index("xrm_records_object_updated_idx").on(table.objectTypeId, table.updatedAt),
    index("xrm_records_search_idx").on(table.searchText),
    index("xrm_records_legacy_idx").on(table.legacyEntityType, table.legacyEntityId),
    index("xrm_records_status_idx").on(table.status)
  ]
);

export const xrmRelationshipTypes = pgTable(
  "xrm_relationship_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    inverseLabel: text("inverse_label"),
    sourceObjectTypeId: uuid("source_object_type_id").references(() => xrmObjectTypes.id, { onDelete: "set null" }),
    targetObjectTypeId: uuid("target_object_type_id").references(() => xrmObjectTypes.id, { onDelete: "set null" }),
    cardinality: text("cardinality").notNull().default("many_to_many"),
    metadataSchema: jsonb("metadata_schema").notNull().default(sql`'{}'::jsonb`),
    system: boolean("system").notNull().default(false),
    active: boolean("active").notNull().default(true),
    ...timestamps
  },
  (table) => [
    uniqueIndex("xrm_relationship_types_key_unique").on(table.key),
    index("xrm_relationship_types_source_target_idx").on(table.sourceObjectTypeId, table.targetObjectTypeId)
  ]
);

export const xrmRecordRelationships = pgTable(
  "xrm_record_relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    relationshipTypeId: uuid("relationship_type_id")
      .notNull()
      .references(() => xrmRelationshipTypes.id, { onDelete: "restrict" }),
    sourceRecordId: uuid("source_record_id")
      .notNull()
      .references(() => xrmRecords.id, { onDelete: "cascade" }),
    targetRecordId: uuid("target_record_id")
      .notNull()
      .references(() => xrmRecords.id, { onDelete: "cascade" }),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    source: text("source"),
    createdByAgentId: uuid("created_by_agent_id").references(() => agents.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [
    uniqueIndex("xrm_record_relationships_unique").on(table.relationshipTypeId, table.sourceRecordId, table.targetRecordId),
    index("xrm_record_relationships_source_idx").on(table.sourceRecordId),
    index("xrm_record_relationships_target_idx").on(table.targetRecordId)
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
    xrmRecordId: uuid("xrm_record_id").references(() => xrmRecords.id, { onDelete: "set null" }),
    idempotencyKey: text("idempotency_key"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    ...timestamps
  },
  (table) => [
    uniqueIndex("tasks_idempotency_key_unique").on(table.idempotencyKey),
    index("tasks_status_due_idx").on(table.status, table.dueAt),
    index("tasks_owner_idx").on(table.ownerAgentId),
    index("tasks_lead_idx").on(table.leadId),
    index("tasks_xrm_record_idx").on(table.xrmRecordId)
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

export const viewDefinitions = pgTable(
  "view_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    objectType: text("object_type").notNull(),
    templateKey: text("template_key"),
    layout: text("layout").notNull().default("table"),
    columns: jsonb("columns").notNull().default(sql`'[]'::jsonb`),
    filters: jsonb("filters").notNull().default(sql`'[]'::jsonb`),
    sort: jsonb("sort").notNull().default(sql`'[]'::jsonb`),
    isDefault: boolean("is_default").notNull().default(false),
    createdByAgentId: uuid("created_by_agent_id").references(() => agents.id),
    ...timestamps
  },
  (table) => [
    uniqueIndex("view_definitions_key_unique").on(table.key),
    index("view_definitions_object_type_idx").on(table.objectType),
    index("view_definitions_template_idx").on(table.templateKey, table.objectType)
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
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    personId: uuid("person_id").references(() => people.id, { onDelete: "set null" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    assignmentId: uuid("assignment_id").references(() => assignments.id, { onDelete: "set null" }),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    xrmRecordId: uuid("xrm_record_id").references(() => xrmRecords.id, { onDelete: "set null" }),
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
    index("activities_xrm_record_time_idx").on(table.xrmRecordId, table.occurredAt),
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

export const xrmObjectTypeRelations = relations(xrmObjectTypes, ({ many }) => ({
  fields: many(xrmFieldDefinitions),
  records: many(xrmRecords),
  sourceRelationshipTypes: many(xrmRelationshipTypes, { relationName: "sourceObjectType" }),
  targetRelationshipTypes: many(xrmRelationshipTypes, { relationName: "targetObjectType" })
}));

export const xrmFieldDefinitionRelations = relations(xrmFieldDefinitions, ({ one }) => ({
  objectType: one(xrmObjectTypes, { fields: [xrmFieldDefinitions.objectTypeId], references: [xrmObjectTypes.id] })
}));

export const xrmRecordRelations = relations(xrmRecords, ({ one, many }) => ({
  objectType: one(xrmObjectTypes, { fields: [xrmRecords.objectTypeId], references: [xrmObjectTypes.id] }),
  ownerAgent: one(agents, { fields: [xrmRecords.ownerAgentId], references: [agents.id] }),
  sourceRelationships: many(xrmRecordRelationships, { relationName: "sourceRecord" }),
  targetRelationships: many(xrmRecordRelationships, { relationName: "targetRecord" }),
  tasks: many(tasks),
  activities: many(activities)
}));

export const xrmRelationshipTypeRelations = relations(xrmRelationshipTypes, ({ one, many }) => ({
  sourceObjectType: one(xrmObjectTypes, {
    fields: [xrmRelationshipTypes.sourceObjectTypeId],
    references: [xrmObjectTypes.id],
    relationName: "sourceObjectType"
  }),
  targetObjectType: one(xrmObjectTypes, {
    fields: [xrmRelationshipTypes.targetObjectTypeId],
    references: [xrmObjectTypes.id],
    relationName: "targetObjectType"
  }),
  relationships: many(xrmRecordRelationships)
}));

export const xrmRecordRelationshipRelations = relations(xrmRecordRelationships, ({ one }) => ({
  relationshipType: one(xrmRelationshipTypes, {
    fields: [xrmRecordRelationships.relationshipTypeId],
    references: [xrmRelationshipTypes.id]
  }),
  sourceRecord: one(xrmRecords, {
    fields: [xrmRecordRelationships.sourceRecordId],
    references: [xrmRecords.id],
    relationName: "sourceRecord"
  }),
  targetRecord: one(xrmRecords, {
    fields: [xrmRecordRelationships.targetRecordId],
    references: [xrmRecords.id],
    relationName: "targetRecord"
  }),
  createdByAgent: one(agents, { fields: [xrmRecordRelationships.createdByAgentId], references: [agents.id] })
}));

export const activityRelations = relations(activities, ({ one }) => ({
  lead: one(leads, { fields: [activities.leadId], references: [leads.id] }),
  person: one(people, { fields: [activities.personId], references: [people.id] }),
  company: one(companies, { fields: [activities.companyId], references: [companies.id] }),
  assignment: one(assignments, { fields: [activities.assignmentId], references: [assignments.id] }),
  task: one(tasks, { fields: [activities.taskId], references: [tasks.id] }),
  xrmRecord: one(xrmRecords, { fields: [activities.xrmRecordId], references: [xrmRecords.id] }),
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
  xrmRecord: one(xrmRecords, { fields: [tasks.xrmRecordId], references: [xrmRecords.id] }),
  activities: many(activities),
  events: many(taskEvents)
}));

export const taskEventRelations = relations(taskEvents, ({ one }) => ({
  task: one(tasks, { fields: [taskEvents.taskId], references: [tasks.id] })
}));

export const viewDefinitionRelations = relations(viewDefinitions, ({ one }) => ({
  createdByAgent: one(agents, { fields: [viewDefinitions.createdByAgentId], references: [agents.id] })
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
export type XrmObjectType = typeof xrmObjectTypes.$inferSelect;
export type NewXrmObjectType = typeof xrmObjectTypes.$inferInsert;
export type XrmFieldDefinition = typeof xrmFieldDefinitions.$inferSelect;
export type NewXrmFieldDefinition = typeof xrmFieldDefinitions.$inferInsert;
export type XrmRecord = typeof xrmRecords.$inferSelect;
export type NewXrmRecord = typeof xrmRecords.$inferInsert;
export type XrmRelationshipType = typeof xrmRelationshipTypes.$inferSelect;
export type NewXrmRelationshipType = typeof xrmRelationshipTypes.$inferInsert;
export type XrmRecordRelationship = typeof xrmRecordRelationships.$inferSelect;
export type NewXrmRecordRelationship = typeof xrmRecordRelationships.$inferInsert;
export type ViewDefinition = typeof viewDefinitions.$inferSelect;
export type NewViewDefinition = typeof viewDefinitions.$inferInsert;
export type IntegrationSyncRun = typeof integrationSyncRuns.$inferSelect;
