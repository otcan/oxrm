import { z } from "zod";

export const OXRM_PRODUCT_NAME = "oXRM";
export const OXRM_PRODUCT_SLUG = "oxrm";
export const OXRM_PRODUCT_VERSION = "0.2.1";
export const OXRM_COMPAT_COMMAND = "ocrm";

export interface OxrmDeploymentInfo {
  target: string;
  version: string;
  gitSha?: string;
  gitRef?: string;
  githubRunId?: string;
  githubRunNumber?: string;
  deployedAt?: string;
}

export function oxrmDeploymentInfoFromEnv(env: Record<string, string | undefined>): OxrmDeploymentInfo {
  const info: OxrmDeploymentInfo = {
    target: env["OXRM_DEPLOY_TARGET"] || "local",
    version: env["OXRM_DEPLOY_VERSION"] || OXRM_PRODUCT_VERSION
  };
  if (env["OXRM_DEPLOY_GIT_SHA"]) {
    info.gitSha = env["OXRM_DEPLOY_GIT_SHA"];
  }
  if (env["OXRM_DEPLOY_GIT_REF"]) {
    info.gitRef = env["OXRM_DEPLOY_GIT_REF"];
  }
  if (env["OXRM_DEPLOY_GITHUB_RUN_ID"]) {
    info.githubRunId = env["OXRM_DEPLOY_GITHUB_RUN_ID"];
  }
  if (env["OXRM_DEPLOY_GITHUB_RUN_NUMBER"]) {
    info.githubRunNumber = env["OXRM_DEPLOY_GITHUB_RUN_NUMBER"];
  }
  if (env["OXRM_DEPLOYED_AT"]) {
    info.deployedAt = env["OXRM_DEPLOYED_AT"];
  }
  return info;
}

export const assignmentStatusSchema = z.enum([
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

export const activityTypeSchema = z.enum([
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

export const channelSchema = z.enum([
  "linkedin",
  "salesnav",
  "email",
  "scheduler",
  "manual"
]);

export const directionSchema = z.enum(["outbound", "inbound", "internal"]);

export const integrationProviderSchema = z.enum([
  "linkedin",
  "salesnav",
  "gmail",
  "outlook",
  "google_calendar",
  "microsoft_calendar",
  "caldav"
]);

export const integrationStatusSchema = z.enum([
  "active",
  "needs_auth",
  "paused",
  "error",
  "archived"
]);

export const agentTypeSchema = z.string().min(1);

export const agentStatusSchema = z.enum(["active", "paused", "archived"]);
export const approvalStatusSchema = z.enum(["pending", "approved", "rejected", "expired"]);
export const backupStatusSchema = z.enum(["running", "succeeded", "failed"]);
export const taskStatusSchema = z.enum(["open", "in_progress", "blocked", "done", "canceled"]);
export const taskTypeSchema = z.enum(["outreach", "follow_up", "research", "data_cleanup", "approval", "manual"]);
export const noteStatusSchema = z.enum(["confirmed_sent", "no_note", "unconfirmed"]);

export const agentCapabilitySchema = z.object({
  key: z.string().min(1),
  label: z.string().optional(),
  description: z.string().optional(),
  level: z.enum(["read", "write", "external_side_effect", "system"]).default("read"),
  config: z.record(z.string(), z.unknown()).optional()
});

export const agentRuntimeConfigSchema = z.object({
  provider: z.string().optional(),
  runtime: z.string().optional(),
  model: z.string().optional(),
  command: z.string().optional(),
  env: z.record(z.string(), z.string()).optional()
});

export const agentIdentitySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  type: agentTypeSchema.default("operator"),
  status: agentStatusSchema.default("active"),
  defaultBranchPrefix: z.string().optional(),
  capabilities: z.array(agentCapabilitySchema).default([]),
  runtimeConfig: agentRuntimeConfigSchema.default({}),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const cliAdapterCommandSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  input: z.record(z.string(), z.unknown()).optional(),
  requiresApproval: z.boolean().default(false),
  timeoutMs: z.number().int().positive().optional()
});

export const planActionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  surface: z.enum(["mcp", "api", "cli"]),
  operation: z.string().min(1),
  input: z.record(z.string(), z.unknown()).default({}),
  cli: cliAdapterCommandSchema.optional(),
  requiresApproval: z.boolean().default(false),
  agentId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const planExecutionResultSchema = z.object({
  actionId: z.string().min(1),
  status: z.enum(["succeeded", "failed", "skipped", "needs_approval"]),
  output: z.unknown().optional(),
  error: z.string().optional(),
  auditId: z.string().uuid().optional(),
  startedAt: z.string().datetime().optional(),
  finishedAt: z.string().datetime().optional()
});

export const jobDecisionStateSchema = z.enum(["New", "Reviewing", "Saved", "Not a fit", "Archived"]);
export const jobApplicationStageSchema = z.enum(["Not started", "Preparing", "Applied", "Interviewing", "Closed"]);
export const jobClosingReasonSchema = z.enum(["Rejected", "Withdrawn", "Offer accepted", "Position closed", "No response"]);
export const jobWorkflowActionKeySchema = z.enum([
  "start_application",
  "save_for_later",
  "mark_not_fit",
  "remove_from_saved",
  "continue_application",
  "cancel_draft",
  "open_application",
  "withdraw",
  "view_application",
  "archive",
  "reopen",
  "reconsider"
]);

export const runJobWorkflowActionSchema = z.object({
  action: jobWorkflowActionKeySchema,
  reason: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export type JobDecisionState = z.infer<typeof jobDecisionStateSchema>;
export type JobApplicationStage = z.infer<typeof jobApplicationStageSchema>;
export type JobClosingReason = z.infer<typeof jobClosingReasonSchema>;
export type JobWorkflowActionKey = z.infer<typeof jobWorkflowActionKeySchema>;

export interface JobWorkflowAction {
  key: JobWorkflowActionKey;
  label: string;
  tone: "primary" | "neutral" | "danger";
}

export type JobWorkflowRecordLike = object & {
  id?: unknown;
  fields?: unknown;
};

export interface JobWorkflowState {
  jobId?: string;
  linkedApplicationId?: string;
  decisionState: JobDecisionState;
  applicationStage: JobApplicationStage;
  closingReason?: JobClosingReason;
  hasLinkedApplication: boolean;
  isNew: boolean;
  primaryAction: JobWorkflowAction;
  secondaryActions: JobWorkflowAction[];
  allowedActions: JobWorkflowAction[];
}

const jobWorkflowActions: Record<JobWorkflowActionKey, JobWorkflowAction> = {
  start_application: { key: "start_application", label: "Start application", tone: "primary" },
  save_for_later: { key: "save_for_later", label: "Save for later", tone: "neutral" },
  mark_not_fit: { key: "mark_not_fit", label: "Mark not a fit", tone: "neutral" },
  remove_from_saved: { key: "remove_from_saved", label: "Remove from saved", tone: "neutral" },
  continue_application: { key: "continue_application", label: "Continue application", tone: "primary" },
  cancel_draft: { key: "cancel_draft", label: "Cancel draft", tone: "danger" },
  open_application: { key: "open_application", label: "Open application", tone: "primary" },
  withdraw: { key: "withdraw", label: "Withdraw", tone: "danger" },
  view_application: { key: "view_application", label: "View application", tone: "neutral" },
  archive: { key: "archive", label: "Archive", tone: "neutral" },
  reopen: { key: "reopen", label: "Reopen", tone: "neutral" },
  reconsider: { key: "reconsider", label: "Reconsider", tone: "primary" }
};

function workflowField(record: JobWorkflowRecordLike | null | undefined, key: string): unknown {
  if (!record) {
    return undefined;
  }
  const direct = (record as Record<string, unknown>)[key];
  if (direct !== undefined && direct !== null && direct !== "") {
    return direct;
  }
  const fields = record.fields;
  return fields && typeof fields === "object" ? (fields as Record<string, unknown>)[key] : undefined;
}

function normalizedText(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ");
}

export function normalizeJobDecisionState(value: unknown, fallback: JobDecisionState = "New"): JobDecisionState {
  const state = normalizedText(value);
  if (state === "new") return "New";
  if (state === "reviewing" || state === "review" || state === "fit review") return "Reviewing";
  if (state === "saved" || state === "save for later") return "Saved";
  if (state === "not a fit" || state === "not fit" || state === "pass" || state === "skip") return "Not a fit";
  if (state === "archived" || state === "archive") return "Archived";
  return fallback;
}

export function normalizeJobApplicationStage(value: unknown): JobApplicationStage {
  const stage = normalizedText(value);
  if (!stage || stage === "new" || stage === "saved" || stage === "fit review" || stage === "reviewing") return "Not started";
  if (stage.includes("reject") || stage.includes("withdraw") || stage.includes("closed") || stage.includes("offer accepted") || stage.includes("position closed") || stage.includes("no response")) return "Closed";
  if (stage.includes("interview") || stage.includes("intro")) return "Interviewing";
  if (stage.includes("applied") || stage.includes("waiting") || stage.includes("contact") || stage.includes("sent")) return "Applied";
  if (stage.includes("prep") || stage.includes("draft") || stage.includes("packet")) return "Preparing";
  return "Not started";
}

export function normalizeJobClosingReason(value: unknown): JobClosingReason | undefined {
  const reason = normalizedText(value);
  if (reason.includes("reject")) return "Rejected";
  if (reason.includes("withdraw")) return "Withdrawn";
  if (reason.includes("offer")) return "Offer accepted";
  if (reason.includes("position")) return "Position closed";
  if (reason.includes("no response")) return "No response";
  return undefined;
}

export function isActiveJobApplicationStage(stage: JobApplicationStage) {
  return stage !== "Not started" && stage !== "Closed";
}

export function isFreshNewJob(job: JobWorkflowRecordLike, linkedApplication?: JobWorkflowRecordLike | null, now = Date.now()) {
  const discoveredAt = workflowField(job, "discoveredAt");
  const discoveredTime = typeof discoveredAt === "string" || typeof discoveredAt === "number" ? new Date(discoveredAt).getTime() : Number.NaN;
  const viewedAt = workflowField(job, "viewedAt");
  const applicationId = workflowField(job, "applicationId") ?? linkedApplication?.id;
  const decisionState = normalizeJobDecisionState(workflowField(job, "decisionState"), "New");

  return (
    decisionState === "New" &&
    !viewedAt &&
    !applicationId &&
    !Number.isNaN(discoveredTime) &&
    now - discoveredTime <= 48 * 60 * 60 * 1000
  );
}

export function allowedJobActions(
  job: JobWorkflowRecordLike,
  linkedApplication?: JobWorkflowRecordLike | null,
  now = Date.now()
): JobWorkflowState {
  const linkedApplicationId = typeof linkedApplication?.id === "string" ? linkedApplication.id : stringOrUndefined(workflowField(job, "applicationId"));
  const hasLinkedApplication = Boolean(linkedApplicationId);
  const linkedStage = linkedApplication ? normalizeJobApplicationStage(workflowField(linkedApplication, "stage")) : undefined;
  const applicationStage = hasLinkedApplication
    ? normalizeJobApplicationStage(linkedStage ?? workflowField(job, "applicationStage"))
    : normalizeJobApplicationStage(workflowField(job, "applicationStage"));
  const closingReason = normalizeJobClosingReason(workflowField(linkedApplication, "closingReason") ?? workflowField(job, "closingReason"));
  const decisionState = normalizeJobDecisionState(workflowField(job, "decisionState"), fallbackDecisionState(job, applicationStage, hasLinkedApplication));

  let primary: JobWorkflowActionKey = "start_application";
  let secondary: JobWorkflowActionKey[] = ["save_for_later", "mark_not_fit"];

  if (applicationStage === "Preparing") {
    primary = "continue_application";
    secondary = ["cancel_draft", "mark_not_fit"];
  } else if (applicationStage === "Applied" || applicationStage === "Interviewing") {
    primary = "open_application";
    secondary = ["withdraw"];
  } else if (applicationStage === "Closed") {
    primary = "view_application";
    secondary = ["archive", "reopen"];
  } else if (decisionState === "Saved") {
    primary = "start_application";
    secondary = ["remove_from_saved", "mark_not_fit"];
  } else if (decisionState === "Not a fit") {
    primary = "reconsider";
    secondary = ["archive"];
  } else if (decisionState === "Archived") {
    primary = "reconsider";
    secondary = [];
  }

  if (hasLinkedApplication && applicationStage === "Not started") {
    primary = "open_application";
    secondary = [];
  }

  if (hasLinkedApplication) {
    secondary = secondary.filter((action) => action !== "mark_not_fit" && action !== "save_for_later");
  }

  const primaryAction = jobWorkflowActions[primary];
  const secondaryActions = secondary.map((action) => jobWorkflowActions[action]);

  return {
    ...(typeof job.id === "string" ? { jobId: job.id } : {}),
    ...(linkedApplicationId ? { linkedApplicationId } : {}),
    decisionState,
    applicationStage,
    ...(closingReason ? { closingReason } : {}),
    hasLinkedApplication,
    isNew: isFreshNewJob(job, linkedApplication, now),
    primaryAction,
    secondaryActions,
    allowedActions: [primaryAction, ...secondaryActions]
  };
}

export function isJobWorkflowActionAllowed(state: JobWorkflowState, action: JobWorkflowActionKey) {
  return state.allowedActions.some((candidate) => candidate.key === action);
}

function fallbackDecisionState(job: JobWorkflowRecordLike, applicationStage: JobApplicationStage, hasLinkedApplication: boolean): JobDecisionState {
  const status = normalizedText(workflowField(job, "status"));
  if (status === "saved") return "Saved";
  if (status.includes("reject") || status.includes("archive")) return "Archived";
  if (status.includes("not") && status.includes("fit")) return "Not a fit";
  if (hasLinkedApplication || isActiveJobApplicationStage(applicationStage) || applicationStage === "Closed") return "Reviewing";
  return "New";
}

function stringOrUndefined(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export const createLeadSchema = z.object({
  fullName: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  companyDomain: z.string().optional(),
  website: z.string().url().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  seniority: z.string().optional(),
  timezone: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  salesnavUrl: z.string().url().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  source: z.string().optional(),
  ownerAgentId: z.string().uuid().optional(),
  notes: z.string().optional(),
  customFields: z.record(z.string(), z.unknown()).optional()
});

export const updateLeadSchema = createLeadSchema.partial();

export const createActivitySchema = z.object({
  leadId: z.string().uuid().optional(),
  personId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  xrmRecordId: z.string().uuid().optional(),
  lead: createLeadSchema.optional(),
  assignmentId: z.string().uuid().optional(),
  type: activityTypeSchema,
  channel: channelSchema,
  direction: directionSchema.default("internal"),
  subject: z.string().optional(),
  body: z.string().optional(),
  providerThreadId: z.string().optional(),
  providerMessageId: z.string().optional(),
  externalId: z.string().optional(),
  externalUrl: z.string().url().optional(),
  idempotencyKey: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  occurredAt: z.string().datetime().optional()
}).refine((value) => value.leadId || value.personId || value.companyId || value.taskId || value.xrmRecordId || value.lead, {
  message: "Activity must reference at least one lead, person, company, task, XRM record, or lead payload."
});

export const createAssignmentSchema = z.object({
  leadId: z.string().uuid(),
  flowId: z.string().uuid(),
  currentStepId: z.string().uuid().optional(),
  status: assignmentStatusSchema.default("new"),
  priority: z.number().int().default(0),
  ownerAgentId: z.string().uuid().optional(),
  lastContactedAt: z.string().datetime().optional(),
  nextActionAt: z.string().datetime().optional()
});

export const outreachMetadataSchema = z.object({
  noteStatus: noteStatusSchema.optional(),
  proposedNote: z.string().optional(),
  linkedinResult: z.string().optional(),
  sourceQuery: z.string().optional(),
  searchPage: z.number().int().optional(),
  auditDirectory: z.string().optional(),
  rowText: z.string().optional(),
  profileUrl: z.string().url().optional()
});

export const outreachNextActionTaskSchema = z.object({
  create: z.boolean().default(true),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: taskTypeSchema.default("follow_up"),
  status: taskStatusSchema.default("open"),
  priority: z.number().int().optional(),
  dueAt: z.string().datetime().optional(),
  dueInDays: z.number().int().min(0).max(365).optional(),
  ownerAgentId: z.string().uuid().optional(),
  idempotencyKey: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const recordOutreachEventSchema = z.object({
  externalKey: z.string().min(1).optional(),
  lead: createLeadSchema,
  assignment: z
    .object({
      flowId: z.string().uuid().optional(),
      currentStepId: z.string().uuid().optional(),
            status: assignmentStatusSchema.optional(),
            priority: z.number().int().optional(),
      ownerAgentId: z.string().uuid().optional(),
      lastContactedAt: z.string().datetime().optional(),
      nextActionAt: z.string().datetime().optional()
    })
    .optional(),
  activity: z
    .object({
      type: activityTypeSchema.optional(),
      channel: channelSchema.optional(),
      direction: directionSchema.optional(),
      body: z.string().optional(),
      subject: z.string().optional(),
      providerThreadId: z.string().optional(),
      providerMessageId: z.string().optional(),
      externalId: z.string().optional(),
      externalUrl: z.string().url().optional(),
      idempotencyKey: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
      ...outreachMetadataSchema.shape,
      occurredAt: z.string().datetime().optional()
    })
    .optional(),
  nextActionTask: z.union([outreachNextActionTaskSchema, z.literal(false)]).optional()
});

export const updateAssignmentSchema = z.object({
  currentStepId: z.string().uuid().nullable().optional(),
  status: assignmentStatusSchema.optional(),
  priority: z.number().int().optional(),
  ownerAgentId: z.string().uuid().nullable().optional(),
  lastContactedAt: z.string().datetime().nullable().optional(),
  nextActionAt: z.string().datetime().nullable().optional()
});

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: taskTypeSchema.default("manual"),
  status: taskStatusSchema.default("open"),
  priority: z.number().int().default(0),
  dueAt: z.string().datetime().optional(),
  ownerAgentId: z.string().uuid().optional(),
  personId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  assignmentId: z.string().uuid().optional(),
  xrmRecordId: z.string().uuid().optional(),
  idempotencyKey: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const updateTaskSchema = createTaskSchema
  .partial()
  .extend({
    status: taskStatusSchema.optional(),
    dueAt: z.string().datetime().nullable().optional(),
    ownerAgentId: z.string().uuid().nullable().optional(),
    personId: z.string().uuid().nullable().optional(),
    companyId: z.string().uuid().nullable().optional(),
    leadId: z.string().uuid().nullable().optional(),
    assignmentId: z.string().uuid().nullable().optional(),
    xrmRecordId: z.string().uuid().nullable().optional()
  });

export const xrmSlugSchema = z
  .string()
  .min(2)
  .max(96)
  .regex(/^[a-z][a-z0-9_.-]*$/);

export const xrmFieldDefinitionInputSchema = z.object({
  key: xrmSlugSchema,
  label: z.string().min(1),
  dataType: z.enum(["text", "long_text", "number", "boolean", "date", "datetime", "url", "email", "json", "select", "file_ref"]).default("text"),
  required: z.boolean().default(false),
  indexed: z.boolean().default(false),
  searchable: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
  summaryRank: z.number().int().min(0).nullable().optional(),
  isPrimary: z.boolean().default(false),
  options: z.array(z.record(z.string(), z.unknown())).default([]),
  config: z.record(z.string(), z.unknown()).optional()
});

export const createXrmObjectTypeSchema = z.object({
  slug: xrmSlugSchema,
  label: z.string().min(1),
  pluralLabel: z.string().min(1).optional(),
  icon: z.string().optional(),
  displayField: z.string().min(1).default("name"),
  description: z.string().optional(),
  templateKey: z.string().optional(),
  system: z.boolean().default(false),
  active: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).optional(),
  fields: z.array(xrmFieldDefinitionInputSchema).default([])
});

export const updateXrmObjectTypeSchema = createXrmObjectTypeSchema.partial().extend({
  fields: z.array(xrmFieldDefinitionInputSchema).optional()
});

export const upsertXrmRecordSchema = z.object({
  objectType: xrmSlugSchema,
  recordId: z.string().uuid().optional(),
  externalKey: z.string().optional(),
  displayName: z.string().optional(),
  fields: z.record(z.string(), z.unknown()).default({}),
  status: z.string().default("active"),
  source: z.string().optional(),
  ownerAgentId: z.string().uuid().optional(),
  legacyEntityType: z.string().optional(),
  legacyEntityId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const searchXrmRecordsSchema = z.object({
  objectType: xrmSlugSchema.optional(),
  query: z.string().optional(),
  includeDeleted: z.boolean().default(false),
  limit: z.number().int().min(1).max(500).default(100)
});

export const createXrmRelationshipTypeSchema = z.object({
  key: xrmSlugSchema,
  label: z.string().min(1),
  inverseLabel: z.string().optional(),
  sourceObjectType: xrmSlugSchema.optional(),
  targetObjectType: xrmSlugSchema.optional(),
  cardinality: z.enum(["one_to_one", "one_to_many", "many_to_one", "many_to_many"]).default("many_to_many"),
  metadataSchema: z.record(z.string(), z.unknown()).optional(),
  system: z.boolean().default(false),
  active: z.boolean().default(true)
});

export const linkXrmRecordsSchema = z.object({
  relationshipType: xrmSlugSchema,
  sourceRecordId: z.string().uuid(),
  targetRecordId: z.string().uuid(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  source: z.string().optional(),
  createdByAgentId: z.string().uuid().optional()
});

export const selectApplicationDocumentSchema = z.object({
  applicationId: z.string().uuid(),
  kind: z.enum(["cv", "cover_letter"]),
  documentId: z.string().uuid().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  source: z.string().optional()
});

export const listXrmRelationshipsSchema = z.object({
  recordId: z.string().uuid().optional(),
  relationshipType: xrmSlugSchema.optional(),
  direction: z.enum(["source", "target", "both"]).default("both"),
  includeDeleted: z.boolean().default(false),
  limit: z.number().int().min(1).max(500).default(100)
});

export const upsertXrmSemanticFieldSchema = z.object({
  key: xrmSlugSchema,
  label: z.string().min(1),
  dataType: z.enum(["text", "long_text", "number", "boolean", "date", "datetime", "url", "email", "json", "select", "file_ref"]).default("text"),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const upsertXrmFieldMappingSchema = z.object({
  objectType: xrmSlugSchema,
  fieldKey: xrmSlugSchema,
  semanticFieldKey: xrmSlugSchema,
  confidence: z.number().int().min(0).max(100).default(100),
  transform: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const createXrmFileSchema = z.object({
  recordId: z.string().uuid(),
  kind: z.enum(["document", "raw_source", "draft", "attachment", "note", "export"]).default("document"),
  title: z.string().min(1),
  path: z.string().min(1),
  mimeType: z.string().optional(),
  size: z.number().int().min(0).optional(),
  checksum: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdByAgentId: z.string().uuid().optional()
});

export const workspaceLayoutSchema = z.object({
  templateKey: xrmSlugSchema.default("job_search"),
  limit: z.number().int().min(1).max(500).default(100)
});

export type AssignmentStatus = z.infer<typeof assignmentStatusSchema>;
export type ActivityType = z.infer<typeof activityTypeSchema>;
export type Channel = z.infer<typeof channelSchema>;
export type Direction = z.infer<typeof directionSchema>;
export type IntegrationProvider = z.infer<typeof integrationProviderSchema>;
export type IntegrationStatus = z.infer<typeof integrationStatusSchema>;
export type AgentType = z.infer<typeof agentTypeSchema>;
export type AgentStatus = z.infer<typeof agentStatusSchema>;
export type AgentCapability = z.infer<typeof agentCapabilitySchema>;
export type AgentRuntimeConfig = z.infer<typeof agentRuntimeConfigSchema>;
export type AgentIdentity = z.infer<typeof agentIdentitySchema>;
export type CliAdapterCommand = z.infer<typeof cliAdapterCommandSchema>;
export type PlanAction = z.infer<typeof planActionSchema>;
export type PlanExecutionResult = z.infer<typeof planExecutionResultSchema>;
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
export type BackupStatus = z.infer<typeof backupStatusSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskType = z.infer<typeof taskTypeSchema>;
export type NoteStatus = z.infer<typeof noteStatusSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
export type RecordOutreachEventInput = z.infer<typeof recordOutreachEventSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type OutreachNextActionTaskInput = z.infer<typeof outreachNextActionTaskSchema>;
export type CreateXrmObjectTypeInput = z.infer<typeof createXrmObjectTypeSchema>;
export type UpdateXrmObjectTypeInput = z.infer<typeof updateXrmObjectTypeSchema>;
export type UpsertXrmRecordInput = z.infer<typeof upsertXrmRecordSchema>;
export type SearchXrmRecordsInput = z.infer<typeof searchXrmRecordsSchema>;
export type CreateXrmRelationshipTypeInput = z.infer<typeof createXrmRelationshipTypeSchema>;
export type LinkXrmRecordsInput = z.infer<typeof linkXrmRecordsSchema>;
export type SelectApplicationDocumentInput = z.infer<typeof selectApplicationDocumentSchema>;
export type ListXrmRelationshipsInput = z.infer<typeof listXrmRelationshipsSchema>;
export type UpsertXrmSemanticFieldInput = z.infer<typeof upsertXrmSemanticFieldSchema>;
export type UpsertXrmFieldMappingInput = z.infer<typeof upsertXrmFieldMappingSchema>;
export type CreateXrmFileInput = z.infer<typeof createXrmFileSchema>;
export type WorkspaceLayoutInput = z.infer<typeof workspaceLayoutSchema>;
