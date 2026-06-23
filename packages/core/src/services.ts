import {
  activities,
  agentActions,
  approvals,
  assignments,
  backupRuns,
  bookings,
  companies,
  companyDomains,
  emailAddresses,
  eventTypes,
  externalIdentities,
  flowSteps,
  flows,
  leadRecords,
  leads,
  people,
  taskEvents,
  tasks,
  viewDefinitions,
  xrmFieldMappings,
  xrmFieldDefinitions,
  xrmFiles,
  xrmObjectTypes,
  xrmRecordRelationships,
  xrmRecords,
  xrmRelationshipTypes,
  xrmSemanticFields,
  type Database
} from "@oxrm/db";
import {
  createXrmObjectTypeSchema,
  createXrmRelationshipTypeSchema,
  createXrmFileSchema,
  createActivitySchema,
  createAssignmentSchema,
  createLeadSchema,
  createTaskSchema,
  allowedJobActions,
  isJobWorkflowActionAllowed,
  runJobWorkflowActionSchema,
  selectApplicationDocumentSchema,
  OXRM_PRODUCT_NAME,
  OXRM_PRODUCT_SLUG,
  OXRM_PRODUCT_VERSION,
  oxrmDeploymentInfoFromEnv,
  linkXrmRecordsSchema,
  listXrmRelationshipsSchema,
  recordOutreachEventSchema,
  searchXrmRecordsSchema,
  upsertXrmFieldMappingSchema,
  updateTaskSchema,
  updateAssignmentSchema,
  updateLeadSchema,
  updateXrmObjectTypeSchema,
  upsertXrmSemanticFieldSchema,
  workspaceLayoutSchema,
  upsertXrmRecordSchema
} from "@oxrm/shared";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";

export interface ServiceContext {
  db: Database;
  backupsRequired?: boolean | undefined;
}

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type LeadInput = z.infer<typeof createLeadSchema>;
type ActivityInput = z.infer<typeof createActivitySchema>;
type OutreachEventInput = z.infer<typeof recordOutreachEventSchema>;

const viewObjectTypeSchema = z
  .string()
  .min(2)
  .max(96)
  .regex(/^[a-z][a-z0-9_.-]*$/);
const viewLayoutSchema = z.enum(["table", "cards", "timeline", "board", "queue"]);
const viewOperatorSchema = z.enum(["equals", "contains", "starts_with", "is_empty", "is_not_empty", "before", "after"]);
const viewDirectionSchema = z.enum(["asc", "desc"]);
const templateKeySchema = z
  .string()
  .min(2)
  .max(96)
  .regex(/^[a-z][a-z0-9_.-]*$/);
const viewFieldSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_.-]+$/);

const viewFilterSchema = z.object({
  field: viewFieldSchema,
  operator: viewOperatorSchema.default("contains"),
  value: z.unknown().optional()
});

const viewSortSchema = z.object({
  field: viewFieldSchema,
  direction: viewDirectionSchema.default("asc")
});

const viewDefinitionInputSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(96)
    .regex(/^[a-z][a-z0-9_.-]*$/),
  name: z.string().min(1),
  description: z.string().optional(),
  objectType: viewObjectTypeSchema,
  templateKey: templateKeySchema.optional(),
  layout: viewLayoutSchema.default("table"),
  columns: z.array(viewFieldSchema).default([]),
  filters: z.array(viewFilterSchema).default([]),
  sort: z.array(viewSortSchema).default([]),
  groupBy: viewFieldSchema.optional(),
  placement: z.enum(["summary", "main", "secondary", "sidebar", "hidden"]).default("sidebar"),
  displayOrder: z.number().int().min(0).default(0),
  audience: z.enum(["default", "power", "hidden", "mcp"]).default("default"),
  visibleWhen: z.record(z.string(), z.unknown()).default({}),
  isDefault: z.boolean().default(false),
  createdByAgentId: z.string().uuid().optional()
});

const viewDefinitionUpdateSchema = viewDefinitionInputSchema
  .omit({ key: true, createdByAgentId: true })
  .partial();

const viewRunInputSchema = z.object({
  viewId: z.string().optional(),
  key: z.string().optional(),
  q: z.string().optional(),
  filters: z.array(viewFilterSchema).optional(),
  sort: z.array(viewSortSchema).optional(),
  limit: z.number().int().min(1).max(500).optional()
});

const backfillLegacyOutreachEventsSchema = z.object({
  dryRun: z.boolean().default(true),
  activityId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  channel: z.enum(["linkedin", "salesnav", "email", "scheduler", "manual"]).default("linkedin"),
  limit: z.number().int().min(1).max(500).default(50),
  createTasks: z.boolean().default(true),
  overwriteConfirmedBody: z.boolean().default(false)
});

type ViewObjectType = z.infer<typeof viewObjectTypeSchema>;
type ViewFilter = z.infer<typeof viewFilterSchema>;
type ViewSort = z.infer<typeof viewSortSchema>;

const legacyViewObjectTypes = ["lead", "person", "company", "task", "event"] as const;
type LegacyViewObjectType = (typeof legacyViewObjectTypes)[number];

const legacyViewFields: Record<LegacyViewObjectType, string[]> = {
  lead: [
    "id",
    "fullName",
    "company",
    "title",
    "linkedinUrl",
    "salesnavUrl",
    "email",
    "phone",
    "location",
    "source",
    "notes",
    "createdAt",
    "updatedAt"
  ],
  person: ["id", "fullName", "title", "location", "source", "createdAt", "updatedAt"],
  company: ["id", "name", "website", "primaryDomain", "industry", "size", "location", "source", "createdAt", "updatedAt"],
  task: ["id", "title", "description", "type", "status", "priority", "dueAt", "lead.fullName", "createdAt", "updatedAt"],
  event: [
    "id",
    "type",
    "channel",
    "direction",
    "subject",
    "body",
    "lead.fullName",
    "task.title",
    "occurredAt",
    "createdAt"
  ]
};

const legacyDefaultViewColumns: Record<LegacyViewObjectType, string[]> = {
  lead: ["fullName", "company", "title", "status", "nextAction"],
  person: ["fullName", "title", "location", "updatedAt"],
  company: ["name", "primaryDomain", "industry", "updatedAt"],
  task: ["title", "status", "type", "dueAt", "lead.fullName"],
  event: ["subject", "type", "channel", "lead.fullName", "occurredAt"]
};

const xrmCoreViewFields = new Set([
  "id",
  "objectType",
  "displayName",
  "externalKey",
  "status",
  "source",
  "createdAt",
  "updatedAt",
  "taskCount",
  "eventCount",
  "relationshipCount",
  "sourceRelationshipCount",
  "targetRelationshipCount",
  "relationshipSummary"
]);
const xrmDefaultViewColumns = ["displayName", "status", "source", "updatedAt"];

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function compactText(value: string | undefined) {
  const compacted = value?.trim().replace(/\s+/g, " ");
  return compacted || undefined;
}

function normalizeName(value: string | undefined) {
  return compactText(value)?.toLowerCase();
}

function normalizeEmail(value: string | undefined) {
  return compactText(value)?.toLowerCase();
}

function labelFromKey(value: string) {
  return value
    .replace(/[_.-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function emailDomain(email: string | undefined) {
  const normalized = normalizeEmail(email);
  const at = normalized?.lastIndexOf("@") ?? -1;
  return at > 0 ? normalized?.slice(at + 1) : undefined;
}

function normalizeViewConfig(input: z.infer<typeof viewDefinitionInputSchema>) {
  const columns = input.columns.length > 0 ? input.columns : defaultViewColumns(input.objectType);
  validateViewFields(input.objectType, columns);
  validateViewFields(
    input.objectType,
    input.filters.map((filter) => filter.field)
  );
  validateViewFields(
    input.objectType,
    input.sort.map((sort) => sort.field)
  );

  return {
    ...input,
    columns
  };
}

function normalizeViewPatch(existingObjectType: ViewObjectType, input: z.infer<typeof viewDefinitionUpdateSchema>) {
  const objectType = input.objectType ?? existingObjectType;
  if (input.columns) {
    validateViewFields(objectType, input.columns);
  }
  if (input.filters) {
    validateViewFields(
      objectType,
      input.filters.map((filter) => filter.field)
    );
  }
  if (input.sort) {
    validateViewFields(
      objectType,
      input.sort.map((entry) => entry.field)
    );
  }

  return {
    ...input,
    objectType
  };
}

function validateViewFields(objectType: ViewObjectType, fields: string[]) {
  const invalid = fields.filter((field) => !isAllowedViewField(objectType, field));
  if (invalid.length > 0) {
    throw new Error(`invalid_view_fields:${invalid.join(",")}`);
  }
}

function defaultViewColumns(objectType: ViewObjectType) {
  return isLegacyViewObjectType(objectType) ? legacyDefaultViewColumns[objectType] : xrmDefaultViewColumns;
}

function isLegacyViewObjectType(objectType: string): objectType is LegacyViewObjectType {
  return legacyViewObjectTypes.includes(objectType as LegacyViewObjectType);
}

function isAllowedViewField(objectType: ViewObjectType, field: string) {
  if (field.startsWith("fields.") || field.startsWith("relationships.")) {
    return true;
  }
  if (xrmCoreViewFields.has(field)) {
    return true;
  }
  if (isLegacyViewObjectType(objectType) && legacyViewFields[objectType].includes(field)) {
    return true;
  }
  return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(field);
}

function parseViewFilters(value: unknown, objectType: ViewObjectType) {
  const filters = z.array(viewFilterSchema).parse(value ?? []);
  validateViewFields(
    objectType,
    filters.map((filter) => filter.field)
  );
  return filters;
}

function parseViewSort(value: unknown, objectType: ViewObjectType) {
  const sort = z.array(viewSortSchema).parse(value ?? []);
  validateViewFields(
    objectType,
    sort.map((entry) => entry.field)
  );
  return sort;
}

function parseViewColumns(value: unknown, objectType: ViewObjectType) {
  const columns = z.array(z.string().min(1)).parse(value ?? []);
  const resolved = columns.length > 0 ? columns : defaultViewColumns(objectType);
  validateViewFields(objectType, resolved);
  return resolved;
}

function getRecordValue(record: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    return (current as Record<string, unknown>)[segment];
  }, record);
}

function compareValues(left: unknown, right: unknown) {
  const leftValue = left instanceof Date ? left.getTime() : left;
  const rightValue = right instanceof Date ? right.getTime() : right;
  if (leftValue === rightValue) {
    return 0;
  }
  if (leftValue === undefined || leftValue === null) {
    return -1;
  }
  if (rightValue === undefined || rightValue === null) {
    return 1;
  }
  return String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: "base" });
}

function matchesViewFilter(record: unknown, filter: ViewFilter) {
  const value = getRecordValue(record, filter.field);
  const text = value === undefined || value === null ? "" : String(value).toLowerCase();
  const expected = filter.value === undefined || filter.value === null ? "" : String(filter.value).toLowerCase();

  switch (filter.operator) {
    case "equals":
      return text === expected;
    case "contains":
      return text.includes(expected);
    case "starts_with":
      return text.startsWith(expected);
    case "is_empty":
      return text.length === 0;
    case "is_not_empty":
      return text.length > 0;
    case "before":
      return dateValue(value) < dateValue(filter.value);
    case "after":
      return dateValue(value) > dateValue(filter.value);
  }
}

function dateValue(value: unknown) {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value).getTime();
  }
  return Number.NaN;
}

function searchableRowText(record: unknown) {
  if (!record || typeof record !== "object") {
    return String(record ?? "").toLowerCase();
  }
  return JSON.stringify(record).toLowerCase();
}

function runViewPipeline<T>(rows: T[], filters: ViewFilter[], sort: ViewSort[], limit: number, query?: string | undefined) {
  const normalizedQuery = compactText(query)?.toLowerCase();
  const filtered = rows.filter((row) => {
    if (normalizedQuery && !searchableRowText(row).includes(normalizedQuery)) {
      return false;
    }
    return filters.every((filter) => matchesViewFilter(row, filter));
  });
  const sorted = [...filtered].sort((left, right) => {
    for (const entry of sort) {
      const comparison = compareValues(getRecordValue(left, entry.field), getRecordValue(right, entry.field));
      if (comparison !== 0) {
        return entry.direction === "desc" ? -comparison : comparison;
      }
    }
    return 0;
  });

  return {
    total: filtered.length,
    rows: sorted.slice(0, limit)
  };
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function serviceError(message: string, statusCode: number, code = message) {
  const error = new Error(message) as Error & { statusCode: number; code: string };
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function xrmFields(record: { fields?: unknown } | null | undefined): Record<string, unknown> {
  return jsonObject(record?.fields);
}

function xrmField(record: { fields?: unknown; [key: string]: unknown } | null | undefined, key: string, fallback = "") {
  const fields = xrmFields(record);
  const value = fields[key] ?? record?.[key];
  return value === undefined || value === null || value === "" ? fallback : String(value);
}

function summarizeRelationship(
  relationship: {
    relationshipType?: { label?: string | null; inverseLabel?: string | null } | null;
    sourceRecord?: { displayName: string } | null;
    targetRecord?: { displayName: string } | null;
  },
  direction: "source" | "target"
) {
  const label =
    direction === "source"
      ? relationship.relationshipType?.label
      : relationship.relationshipType?.inverseLabel ?? relationship.relationshipType?.label;
  const other = direction === "source" ? relationship.targetRecord?.displayName : relationship.sourceRecord?.displayName;
  return [label, other].filter(Boolean).join(" ");
}

function toXrmViewRow(record: {
  id: string;
  externalKey: string | null;
  displayName: string;
  fields: unknown;
  status: string;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
  objectType?: { slug: string; label: string; templateKey?: string | null } | null;
  sourceRelationships?: Array<{
    sourceRecordId: string;
    targetRecordId: string;
    relationshipType?: { label?: string | null; inverseLabel?: string | null } | null;
    targetRecord?: { displayName: string } | null;
  }>;
  targetRelationships?: Array<{
    sourceRecordId: string;
    targetRecordId: string;
    relationshipType?: { label?: string | null; inverseLabel?: string | null } | null;
    sourceRecord?: { displayName: string } | null;
  }>;
  tasks?: unknown[];
  activities?: unknown[];
}) {
  const fields = jsonObject(record.fields);
  const sourceRelationships = record.sourceRelationships ?? [];
  const targetRelationships = record.targetRelationships ?? [];
  const relationshipSummary = [
    ...sourceRelationships.map((relationship) => summarizeRelationship(relationship, "source")),
    ...targetRelationships.map((relationship) => summarizeRelationship(relationship, "target"))
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    ...fields,
    _links: {
      self: {
        kind: "record",
        id: record.id,
        objectType: record.objectType?.slug
      }
    },
    id: record.id,
    objectType: record.objectType?.slug,
    objectTypeLabel: record.objectType?.label,
    templateKey: record.objectType?.templateKey,
    displayName: record.displayName,
    externalKey: record.externalKey,
    fields,
    status: typeof fields["status"] === "string" && fields["status"] ? fields["status"] : record.status,
    source: record.source,
    taskCount: record.tasks?.length ?? 0,
    eventCount: record.activities?.length ?? 0,
    relationshipCount: sourceRelationships.length + targetRelationships.length,
    sourceRelationshipCount: sourceRelationships.length,
    targetRelationshipCount: targetRelationships.length,
    relationshipSummary,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function withLegacyViewLink<T extends { id: string }>(row: T, kind: LegacyViewObjectType) {
  return {
    ...row,
    _links: {
      self: {
        kind,
        id: row.id
      }
    }
  };
}

function normalizeDomain(value: string | undefined) {
  const compacted = compactText(value)?.toLowerCase();
  if (!compacted) {
    return undefined;
  }
  return compacted.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]?.replace(/\.$/, "") || undefined;
}

function normalizeUrl(value: string | undefined) {
  const compacted = compactText(value);
  if (!compacted) {
    return undefined;
  }
  return compacted.replace(/\/+$/, "").toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function buildXrmSearchText(input: { displayName: string; fields?: Record<string, unknown>; externalKey?: string | undefined }) {
  const fieldText = Object.values(input.fields ?? {})
    .filter((value) => typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    .map(String)
    .join(" ");
  return compactText([input.displayName, input.externalKey, fieldText].filter(Boolean).join(" "))?.toLowerCase() ?? "";
}

function displayNameFromFields(fields: Record<string, unknown>, displayField: string, fallback: string | undefined) {
  const value = fields[displayField];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return compactText(String(value)) ?? fallback ?? "Untitled record";
  }
  return fallback ?? "Untitled record";
}

function mergeOutreachMetadata(activityInput: NonNullable<OutreachEventInput["activity"]>) {
  const metadata: Record<string, unknown> = isRecord(activityInput.metadata) ? { ...activityInput.metadata } : {};
  for (const key of [
    "noteStatus",
    "proposedNote",
    "linkedinResult",
    "sourceQuery",
    "searchPage",
    "auditDirectory",
    "rowText",
    "profileUrl"
  ] as const) {
    if (activityInput[key] !== undefined) {
      metadata[key] = activityInput[key];
    }
  }
  return metadata;
}

function outreachTaskDefaults(activityType: string) {
  switch (activityType) {
    case "connection_sent":
    case "connection_request_sent":
      return { kind: "acceptance-check", titlePrefix: "Check acceptance", type: "follow_up" as const, dueInDays: 5 };
    case "connection_accepted":
      return { kind: "first-message-approval", titlePrefix: "Approve first message", type: "approval" as const, dueInDays: 0 };
    case "message_received":
    case "email_received":
      return { kind: "reply-approval", titlePrefix: "Review reply", type: "approval" as const, dueInDays: 0 };
    case "follow_up_due":
      return { kind: "follow-up", titlePrefix: "Follow up", type: "follow_up" as const, dueInDays: 0 };
    default:
      return undefined;
  }
}

async function upsertOutreachNextActionTask(
  tx: Tx,
  input: {
    config: OutreachEventInput["nextActionTask"];
    activityType: string;
    lead: typeof leads.$inferSelect;
    personId?: string | null | undefined;
    companyId?: string | null | undefined;
    assignmentId?: string | null | undefined;
    ownerAgentId?: string | null | undefined;
    priority: number;
    occurredAt: Date;
    assignmentNextActionAt?: Date | null | undefined;
    profileKey: string;
  }
) {
  if (input.config === false || input.config?.create === false) {
    return undefined;
  }

  const defaults = outreachTaskDefaults(input.activityType);
  if (!defaults && !input.config) {
    return undefined;
  }

  const config = input.config || undefined;
  const dueAt =
    config?.dueAt !== undefined
      ? new Date(config.dueAt)
      : input.assignmentNextActionAt ?? addDays(input.occurredAt, config?.dueInDays ?? defaults?.dueInDays ?? 0);
  const kind = defaults?.kind ?? "next-action";
  const title = config?.title ?? `${defaults?.titlePrefix ?? "Next action"}: ${input.lead.fullName}`;
  const taskType = config?.type ?? defaults?.type ?? "follow_up";
  const taskStatus = config?.status ?? "open";
  const priority = config?.priority ?? input.priority;
  const ownerAgentId = config?.ownerAgentId ?? input.ownerAgentId ?? undefined;
  const idempotencyKey = config?.idempotencyKey ?? `outreach:${input.profileKey}:${kind}`;
  const metadata = {
    source: "outreach-event",
    activityType: input.activityType,
    nextActionKind: kind,
    ...(config?.metadata ?? {})
  };

  const [task] = await tx
    .insert(tasks)
    .values({
      title,
      description: config?.description,
      type: taskType,
      status: taskStatus,
      priority,
      dueAt,
      ownerAgentId,
      personId: input.personId ?? undefined,
      companyId: input.companyId ?? undefined,
      leadId: input.lead.id,
      assignmentId: input.assignmentId ?? undefined,
      idempotencyKey,
      metadata
    })
    .onConflictDoUpdate({
      target: tasks.idempotencyKey,
      set: {
        title,
        description: config?.description,
        type: taskType,
        status: taskStatus,
        priority,
        dueAt,
        ownerAgentId,
        personId: input.personId ?? undefined,
        companyId: input.companyId ?? undefined,
        leadId: input.lead.id,
        assignmentId: input.assignmentId ?? undefined,
        metadata,
        updatedAt: new Date()
      }
    })
    .returning();

  return task;
}

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

function parseLegacyOutreachBody(body: string | null | undefined, externalUrl: string | null | undefined) {
  const raw = body?.trim();
  if (!raw) {
    return undefined;
  }

  const linkedinResult = firstMatch(raw, [
    /linkedin(?: result)?:\s*([^\n]+)/i,
    /result:\s*([^\n]+)/i,
    /\b(native_[a-z0-9_]+|textarea_not_found|verified_pending|pending)\b/i
  ]);
  const sourceQuery = firstMatch(raw, [/source query:\s*([^\n]+)/i, /query:\s*([^\n]+)/i]);
  const searchPageText = firstMatch(raw, [/search page:\s*(\d+)/i, /page:\s*(\d+)/i]);
  const auditDirectory = firstMatch(raw, [/audit directory:\s*([^\n]+)/i, /audit:\s*([^\n]+)/i, /(\/[^\s]+(?:audit|crawler|connect)[^\s]*)/i]);
  const rowText = firstMatch(raw, [/row text:\s*([\s\S]+)/i]);
  const profileUrl = normalizeUrl(
    externalUrl ??
      firstMatch(raw, [/(https?:\/\/(?:www\.)?linkedin\.com\/in\/[^\s,)]+)/i, /profile(?: url)?:\s*([^\n]+)/i])
  );
  const lower = raw.toLowerCase();
  const noteStatus = lower.includes("no note")
    ? "no_note"
    : lower.includes("confirmed_sent") || lower.includes("note confirmed") || lower.includes("note sent")
      ? "confirmed_sent"
      : "unconfirmed";

  return {
    noteStatus,
    proposedNote: noteStatus === "confirmed_sent" || noteStatus === "no_note" ? undefined : raw,
    linkedinResult,
    sourceQuery,
    searchPage: searchPageText ? Number(searchPageText) : undefined,
    auditDirectory,
    rowText,
    profileUrl,
    originalBody: raw
  };
}

function splitName(fullName: string) {
  const parts = compactText(fullName)?.split(" ") ?? [];
  if (parts.length <= 1) {
    return { firstName: parts[0], lastName: undefined };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ")
  };
}

async function upsertCompany(tx: Tx, input: LeadInput) {
  const explicitDomain = normalizeDomain(input.companyDomain ?? input.website);
  const inferredDomain = emailDomain(input.email);
  const domain = explicitDomain ?? inferredDomain;
  const companyName = compactText(input.company) ?? (domain ? domain.split(".")[0] : undefined);
  const normalizedName = normalizeName(companyName);

  let company =
    domain !== undefined
      ? (await tx.query.companyDomains.findFirst({
          where: eq(companyDomains.domain, domain),
          with: { company: true }
        }))?.company
      : undefined;

  if (!company && normalizedName) {
    company = await tx.query.companies.findFirst({ where: eq(companies.normalizedName, normalizedName) });
  }

  if (!company && companyName && normalizedName) {
    [company] = await tx
      .insert(companies)
      .values({
        name: companyName,
        normalizedName,
        website: input.website,
        primaryDomain: domain,
        industry: input.industry,
        size: input.companySize,
        location: input.location,
        source: input.source,
        customFields: input.customFields ?? {}
      })
      .returning();
  } else if (company) {
    [company] = await tx
      .update(companies)
      .set({
        name: companyName ?? company.name,
        website: input.website ?? company.website,
        primaryDomain: company.primaryDomain ?? domain,
        industry: input.industry ?? company.industry,
        size: input.companySize ?? company.size,
        location: input.location ?? company.location,
        source: input.source ?? company.source,
        updatedAt: new Date()
      })
      .where(eq(companies.id, company.id))
      .returning();
  }

  if (company && domain) {
    await tx
      .insert(companyDomains)
      .values({
        companyId: company.id,
        domain,
        isPrimary: company.primaryDomain === domain || !company.primaryDomain,
        source: input.source
      })
      .onConflictDoNothing();
  }

  return company;
}

async function resolvePerson(tx: Tx, input: LeadInput, companyId: string | undefined) {
  const normalizedEmail = normalizeEmail(input.email);
  const linkedinUrl = normalizeUrl(input.linkedinUrl);
  const salesnavUrl = normalizeUrl(input.salesnavUrl);
  const normalizedFullName = normalizeName(input.fullName) ?? input.fullName.toLowerCase();
  const names = splitName(input.fullName);

  let person =
    normalizedEmail !== undefined
      ? (await tx.query.emailAddresses.findFirst({
          where: eq(emailAddresses.normalizedEmail, normalizedEmail),
          with: { person: true }
        }))?.person
      : undefined;

  if (!person && linkedinUrl) {
    person = (await tx.query.externalIdentities.findFirst({
      where: and(eq(externalIdentities.provider, "linkedin"), eq(externalIdentities.normalizedValue, linkedinUrl)),
      with: { person: true }
    }))?.person;
  }

  if (!person && salesnavUrl) {
    person = (await tx.query.externalIdentities.findFirst({
      where: and(eq(externalIdentities.provider, "salesnav"), eq(externalIdentities.normalizedValue, salesnavUrl)),
      with: { person: true }
    }))?.person;
  }

  if (!person && companyId) {
    person = await tx.query.people.findFirst({
      where: and(eq(people.normalizedFullName, normalizedFullName), eq(people.companyId, companyId))
    });
  }

  if (!person) {
    [person] = await tx
      .insert(people)
      .values({
        fullName: compactText(input.fullName) ?? input.fullName,
        normalizedFullName,
        firstName: compactText(input.firstName) ?? names.firstName,
        lastName: compactText(input.lastName) ?? names.lastName,
        title: input.title,
        location: input.location,
        timezone: input.timezone,
        seniority: input.seniority,
        department: input.department,
        companyId,
        source: input.source,
        customFields: input.customFields ?? {}
      })
      .returning();
  } else {
    [person] = await tx
      .update(people)
      .set({
        fullName: compactText(input.fullName) ?? person.fullName,
        normalizedFullName,
        firstName: compactText(input.firstName) ?? person.firstName ?? names.firstName,
        lastName: compactText(input.lastName) ?? person.lastName ?? names.lastName,
        title: input.title ?? person.title,
        location: input.location ?? person.location,
        timezone: input.timezone ?? person.timezone,
        seniority: input.seniority ?? person.seniority,
        department: input.department ?? person.department,
        companyId: companyId ?? person.companyId,
        source: input.source ?? person.source,
        updatedAt: new Date()
      })
      .where(eq(people.id, person.id))
      .returning();
  }

  if (!person) {
    throw new Error("Failed to resolve person identity");
  }

  if (normalizedEmail) {
    await tx
      .insert(emailAddresses)
      .values({
        personId: person.id,
        companyId,
        email: compactText(input.email) ?? normalizedEmail,
        normalizedEmail,
        domain: emailDomain(input.email) ?? "",
        isPrimary: true,
        source: input.source
      })
      .onConflictDoUpdate({
        target: emailAddresses.normalizedEmail,
        set: {
          personId: person.id,
          companyId,
          updatedAt: new Date()
        }
      });
  }

  for (const identity of [
    { provider: "linkedin" as const, value: linkedinUrl, url: input.linkedinUrl },
    { provider: "salesnav" as const, value: salesnavUrl, url: input.salesnavUrl },
    { provider: "email" as const, value: normalizedEmail, externalId: normalizedEmail }
  ]) {
    if (!identity.value) {
      continue;
    }
    await tx
      .insert(externalIdentities)
      .values({
        provider: identity.provider,
        subjectType: "person",
        personId: person.id,
        externalId: identity.externalId,
        externalUrl: identity.url,
        normalizedValue: identity.value,
        source: input.source
      })
      .onConflictDoUpdate({
        target: [externalIdentities.provider, externalIdentities.normalizedValue],
        set: {
          personId: person.id,
          updatedAt: new Date()
        }
      });
  }

  return person;
}

async function upsertLeadRecord(tx: Tx, input: LeadInput) {
  const company = await upsertCompany(tx, input);
  const person = await resolvePerson(tx, input, company?.id);
  const normalizedEmail = normalizeEmail(input.email);
  const linkedinUrl = normalizeUrl(input.linkedinUrl);
  const salesnavUrl = normalizeUrl(input.salesnavUrl);

  let lead =
    (await tx.query.leads.findFirst({ where: eq(leads.personId, person.id) })) ??
    (linkedinUrl ? await tx.query.leads.findFirst({ where: eq(leads.linkedinUrl, linkedinUrl) }) : undefined) ??
    (salesnavUrl ? await tx.query.leads.findFirst({ where: eq(leads.salesnavUrl, salesnavUrl) }) : undefined) ??
    (normalizedEmail ? await tx.query.leads.findFirst({ where: eq(leads.email, normalizedEmail) }) : undefined);

  const leadValues = {
    personId: person.id,
    companyId: company?.id,
    fullName: compactText(input.fullName) ?? input.fullName,
    company: company?.name ?? compactText(input.company),
    title: input.title,
    linkedinUrl,
    salesnavUrl,
    email: normalizedEmail,
    phone: input.phone,
    location: input.location,
    source: input.source,
    ownerAgentId: input.ownerAgentId,
    notes: input.notes,
    customFields: input.customFields ?? {},
    updatedAt: new Date()
  };

  if (lead) {
    [lead] = await tx.update(leads).set(leadValues).where(eq(leads.id, lead.id)).returning();
  } else {
    [lead] = await tx
      .insert(leads)
      .values({
        ...leadValues,
        updatedAt: undefined
      })
      .returning();
  }

  if (!lead) {
    throw new Error("Failed to create or update lead");
  }

  await tx
    .insert(leadRecords)
    .values({
      leadId: lead.id,
      personId: person.id,
      companyId: company?.id,
      source: input.source,
      ownerAgentId: input.ownerAgentId,
      customFields: input.customFields ?? {}
    })
    .onConflictDoUpdate({
      target: leadRecords.leadId,
      set: {
        personId: person.id,
        companyId: company?.id,
        source: input.source,
        ownerAgentId: input.ownerAgentId,
        updatedAt: new Date()
      }
    });

  await tx
    .update(externalIdentities)
    .set({ leadId: lead.id, updatedAt: new Date() })
    .where(eq(externalIdentities.personId, person.id));

  return { lead, person, company };
}

async function resolveActivityLinks(tx: Tx, input: ActivityInput) {
  let leadId = input.leadId;
  let personId = input.personId;
  let companyId = input.companyId;
  let taskId = input.taskId;
  let xrmRecordId = input.xrmRecordId;

  if (input.lead) {
    const resolved = await upsertLeadRecord(tx, input.lead);
    leadId = resolved.lead.id;
    personId = personId ?? resolved.person.id;
    companyId = companyId ?? resolved.company?.id;
  }

  if (input.assignmentId && !leadId) {
    const assignment = await tx.query.assignments.findFirst({ where: eq(assignments.id, input.assignmentId) });
    leadId = assignment?.leadId;
  }

  if (taskId && (!leadId || !personId || !companyId)) {
    const task = await tx.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
    leadId = leadId ?? task?.leadId ?? undefined;
    personId = personId ?? task?.personId ?? undefined;
    companyId = companyId ?? task?.companyId ?? undefined;
    xrmRecordId = xrmRecordId ?? task?.xrmRecordId ?? undefined;
  }

  if (xrmRecordId && (!leadId || !personId || !companyId)) {
    const record = await tx.query.xrmRecords.findFirst({ where: eq(xrmRecords.id, xrmRecordId) });
    if (record?.legacyEntityType === "lead") {
      leadId = leadId ?? record.legacyEntityId ?? undefined;
    }
    if (record?.legacyEntityType === "person") {
      personId = personId ?? record.legacyEntityId ?? undefined;
    }
    if (record?.legacyEntityType === "company") {
      companyId = companyId ?? record.legacyEntityId ?? undefined;
    }
  }

  if (leadId && (!personId || !companyId)) {
    const lead = await tx.query.leads.findFirst({ where: eq(leads.id, leadId) });
    personId = personId ?? lead?.personId ?? undefined;
    companyId = companyId ?? lead?.companyId ?? undefined;
  }

  if (personId && !companyId) {
    const person = await tx.query.people.findFirst({ where: eq(people.id, personId) });
    companyId = person?.companyId ?? undefined;
  }

  return { leadId, personId, companyId, taskId, xrmRecordId };
}

export function createCrmServices({ db, backupsRequired = false }: ServiceContext) {
  return {
    async health() {
      const backup = await this.getBackupHealth();
      return {
        status: backup.degraded ? "degraded" : "ok",
        service: "oxrm-api",
        product: {
          name: OXRM_PRODUCT_NAME,
          slug: OXRM_PRODUCT_SLUG,
          version: OXRM_PRODUCT_VERSION
        },
        deployment: oxrmDeploymentInfoFromEnv(process.env),
        backup
      };
    },

    async listXrmObjectTypes(input: { active?: boolean | undefined; templateKey?: string | undefined; limit?: number | undefined } = {}) {
      const conditions = [
        input.active === undefined ? undefined : eq(xrmObjectTypes.active, input.active),
        input.templateKey ? eq(xrmObjectTypes.templateKey, input.templateKey) : undefined
      ].filter((condition): condition is NonNullable<typeof condition> => condition !== undefined);

      return db.query.xrmObjectTypes.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: { fields: true, fieldMappings: { with: { semanticField: true } } },
        orderBy: [desc(xrmObjectTypes.system), desc(xrmObjectTypes.updatedAt)],
        limit: input.limit ?? 100
      });
    },

    async getXrmObjectType(slugOrId: string) {
      return db.query.xrmObjectTypes.findFirst({
        where: uuidPattern.test(slugOrId) ? eq(xrmObjectTypes.id, slugOrId) : eq(xrmObjectTypes.slug, slugOrId),
        with: { fields: true, fieldMappings: { with: { semanticField: true } } }
      });
    },

    async createXrmObjectType(input: unknown) {
      const parsed = createXrmObjectTypeSchema.parse(input);
      return db.transaction(async (tx) => {
        const [objectType] = await tx
          .insert(xrmObjectTypes)
          .values({
            slug: parsed.slug,
            label: parsed.label,
            pluralLabel: parsed.pluralLabel ?? `${parsed.label}s`,
            icon: parsed.icon,
            displayField: parsed.displayField,
            description: parsed.description,
            templateKey: parsed.templateKey,
            system: parsed.system,
            active: parsed.active,
            metadata: parsed.metadata ?? {}
          })
          .onConflictDoUpdate({
            target: xrmObjectTypes.slug,
            set: {
              label: parsed.label,
              pluralLabel: parsed.pluralLabel ?? `${parsed.label}s`,
              icon: parsed.icon,
              displayField: parsed.displayField,
              description: parsed.description,
              templateKey: parsed.templateKey,
              system: parsed.system,
              active: parsed.active,
              metadata: parsed.metadata ?? {},
              updatedAt: new Date()
            }
          })
          .returning();

        if (!objectType) {
          throw new Error("xrm_object_type_upsert_failed");
        }

        for (const field of parsed.fields) {
          await tx
            .insert(xrmFieldDefinitions)
            .values({
              objectTypeId: objectType.id,
              key: field.key,
              label: field.label,
              dataType: field.dataType,
              required: field.required,
              indexed: field.indexed,
              searchable: field.searchable,
              displayOrder: field.displayOrder,
              summaryRank: field.summaryRank ?? null,
              isPrimary: field.isPrimary,
              options: field.options,
              config: field.config ?? {}
            })
            .onConflictDoUpdate({
              target: [xrmFieldDefinitions.objectTypeId, xrmFieldDefinitions.key],
              set: {
                label: field.label,
                dataType: field.dataType,
                required: field.required,
                indexed: field.indexed,
                searchable: field.searchable,
                displayOrder: field.displayOrder,
                summaryRank: field.summaryRank ?? null,
                isPrimary: field.isPrimary,
                options: field.options,
                config: field.config ?? {},
                updatedAt: new Date()
              }
            });
        }

        return tx.query.xrmObjectTypes.findFirst({
          where: eq(xrmObjectTypes.id, objectType.id),
          with: { fields: true }
        });
      });
    },

    async updateXrmObjectType(slugOrId: string, input: unknown) {
      const existing = await this.getXrmObjectType(slugOrId);
      if (!existing) {
        return undefined;
      }
      const parsed = updateXrmObjectTypeSchema.parse(input);
      const [updated] = await db
        .update(xrmObjectTypes)
        .set({
          slug: parsed.slug,
          label: parsed.label,
          pluralLabel: parsed.pluralLabel,
          icon: parsed.icon,
          displayField: parsed.displayField,
          description: parsed.description,
          templateKey: parsed.templateKey,
          system: parsed.system,
          active: parsed.active,
          metadata: parsed.metadata,
          updatedAt: new Date()
        })
        .where(eq(xrmObjectTypes.id, existing.id))
        .returning();
      return updated;
    },

    async upsertXrmRecord(input: unknown) {
      const parsed = upsertXrmRecordSchema.parse(input);
      return db.transaction(async (tx) => {
        const objectType = await tx.query.xrmObjectTypes.findFirst({ where: eq(xrmObjectTypes.slug, parsed.objectType) });
        if (!objectType) {
          throw new Error(`xrm_object_type_not_found:${parsed.objectType}`);
        }

        const displayName = displayNameFromFields(parsed.fields, objectType.displayField, parsed.displayName ?? parsed.externalKey);
        const searchText = buildXrmSearchText({ displayName, fields: parsed.fields, externalKey: parsed.externalKey });
        const existing =
          parsed.recordId
            ? await tx.query.xrmRecords.findFirst({ where: eq(xrmRecords.id, parsed.recordId) })
            : parsed.externalKey
              ? await tx.query.xrmRecords.findFirst({
                  where: and(eq(xrmRecords.objectTypeId, objectType.id), eq(xrmRecords.externalKey, parsed.externalKey))
                })
              : undefined;

        if (existing) {
          const [updated] = await tx
            .update(xrmRecords)
            .set({
              externalKey: parsed.externalKey,
              displayName,
              fields: parsed.fields,
              searchText,
              status: parsed.status,
              source: parsed.source,
              ownerAgentId: parsed.ownerAgentId,
              legacyEntityType: parsed.legacyEntityType,
              legacyEntityId: parsed.legacyEntityId,
              metadata: parsed.metadata ?? {},
              deletedAt: null,
              updatedAt: new Date()
            })
            .where(eq(xrmRecords.id, existing.id))
            .returning();
          return updated;
        }

        const [created] = await tx
          .insert(xrmRecords)
          .values({
            objectTypeId: objectType.id,
            externalKey: parsed.externalKey,
            displayName,
            fields: parsed.fields,
            searchText,
            status: parsed.status,
            source: parsed.source,
            ownerAgentId: parsed.ownerAgentId,
            legacyEntityType: parsed.legacyEntityType,
            legacyEntityId: parsed.legacyEntityId,
            metadata: parsed.metadata ?? {}
          })
          .returning();
        return created;
      });
    },

    async getXrmRecord(id: string) {
      return db.query.xrmRecords.findFirst({
        where: eq(xrmRecords.id, id),
        with: {
          objectType: { with: { fields: true, fieldMappings: { with: { semanticField: true } } } },
          sourceRelationships: {
            where: isNull(xrmRecordRelationships.deletedAt),
            with: { relationshipType: true, targetRecord: { with: { objectType: true } } }
          },
          targetRelationships: {
            where: isNull(xrmRecordRelationships.deletedAt),
            with: { relationshipType: true, sourceRecord: { with: { objectType: true } } }
          },
          files: true,
          tasks: true,
          activities: true
        }
      });
    },

    async searchXrmRecords(input: unknown = {}) {
      const parsed = searchXrmRecordsSchema.parse(input);
      const objectType = parsed.objectType
        ? await db.query.xrmObjectTypes.findFirst({ where: eq(xrmObjectTypes.slug, parsed.objectType) })
        : undefined;
      if (parsed.objectType && !objectType) {
        return [];
      }
      const conditions = [
        objectType ? eq(xrmRecords.objectTypeId, objectType.id) : undefined,
        parsed.includeDeleted ? undefined : isNull(xrmRecords.deletedAt),
        parsed.query
          ? or(ilike(xrmRecords.searchText, `%${parsed.query}%`), ilike(xrmRecords.displayName, `%${parsed.query}%`))
          : undefined
      ].filter((condition): condition is NonNullable<typeof condition> => condition !== undefined);

      return db.query.xrmRecords.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: { objectType: true },
        orderBy: [desc(xrmRecords.updatedAt)],
        limit: parsed.limit
      });
    },

    async deleteXrmRecord(id: string) {
      const [deleted] = await db
        .update(xrmRecords)
        .set({ status: "archived", deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(xrmRecords.id, id))
        .returning({ id: xrmRecords.id });
      return { deleted: deleted !== undefined, recordId: id };
    },

    async createXrmRelationshipType(input: unknown) {
      const parsed = createXrmRelationshipTypeSchema.parse(input);
      const [sourceObjectType, targetObjectType] = await Promise.all([
        parsed.sourceObjectType ? this.getXrmObjectType(parsed.sourceObjectType) : Promise.resolve(undefined),
        parsed.targetObjectType ? this.getXrmObjectType(parsed.targetObjectType) : Promise.resolve(undefined)
      ]);

      const [relationshipType] = await db
        .insert(xrmRelationshipTypes)
        .values({
          key: parsed.key,
          label: parsed.label,
          inverseLabel: parsed.inverseLabel,
          sourceObjectTypeId: sourceObjectType?.id,
          targetObjectTypeId: targetObjectType?.id,
          cardinality: parsed.cardinality,
          metadataSchema: parsed.metadataSchema ?? {},
          system: parsed.system,
          active: parsed.active
        })
        .onConflictDoUpdate({
          target: xrmRelationshipTypes.key,
          set: {
            label: parsed.label,
            inverseLabel: parsed.inverseLabel,
            sourceObjectTypeId: sourceObjectType?.id,
            targetObjectTypeId: targetObjectType?.id,
            cardinality: parsed.cardinality,
            metadataSchema: parsed.metadataSchema ?? {},
            system: parsed.system,
            active: parsed.active,
            updatedAt: new Date()
          }
        })
        .returning();
      return relationshipType;
    },

    async linkXrmRecords(input: unknown) {
      const parsed = linkXrmRecordsSchema.parse(input);
      const relationshipType = await db.query.xrmRelationshipTypes.findFirst({
        where: eq(xrmRelationshipTypes.key, parsed.relationshipType)
      });
      if (!relationshipType) {
        throw new Error(`xrm_relationship_type_not_found:${parsed.relationshipType}`);
      }

      const [relationship] = await db
        .insert(xrmRecordRelationships)
        .values({
          relationshipTypeId: relationshipType.id,
          sourceRecordId: parsed.sourceRecordId,
          targetRecordId: parsed.targetRecordId,
          metadata: parsed.metadata ?? {},
          source: parsed.source,
          createdByAgentId: parsed.createdByAgentId
        })
        .onConflictDoUpdate({
          target: [
            xrmRecordRelationships.relationshipTypeId,
            xrmRecordRelationships.sourceRecordId,
            xrmRecordRelationships.targetRecordId
          ],
          set: {
            metadata: parsed.metadata ?? {},
            source: parsed.source,
            deletedAt: null,
            updatedAt: new Date()
          }
        })
        .returning();
      return relationship;
    },

    async selectApplicationDocument(input: unknown) {
      const parsed = selectApplicationDocumentSchema.parse(input);
      const config =
        parsed.kind === "cv"
          ? { relationshipType: "application_uses_cv", objectType: "cv_version", cacheField: "cvVersion" }
          : { relationshipType: "application_uses_cover_letter", objectType: "cover_letter", cacheField: "coverLetterVersion" };

      await db.transaction(async (tx) => {
        const application = await tx.query.xrmRecords.findFirst({
          where: eq(xrmRecords.id, parsed.applicationId),
          with: { objectType: true }
        });
        if (!application || application.objectType?.slug !== "application") {
          throw serviceError("application_not_found", 404);
        }

        const relationshipType = await tx.query.xrmRelationshipTypes.findFirst({
          where: eq(xrmRelationshipTypes.key, config.relationshipType)
        });
        if (!relationshipType) {
          throw serviceError(`xrm_relationship_type_not_found:${config.relationshipType}`, 404, "xrm_relationship_type_not_found");
        }

        const document = parsed.documentId
          ? await tx.query.xrmRecords.findFirst({
              where: eq(xrmRecords.id, parsed.documentId),
              with: { objectType: true }
            })
          : null;
        if (parsed.documentId && (!document || document.objectType?.slug !== config.objectType)) {
          throw serviceError("application_document_not_found", 404);
        }

        const now = new Date();
        await tx
          .update(xrmRecordRelationships)
          .set({ deletedAt: now, updatedAt: now })
          .where(
            and(
              eq(xrmRecordRelationships.relationshipTypeId, relationshipType.id),
              eq(xrmRecordRelationships.sourceRecordId, application.id),
              isNull(xrmRecordRelationships.deletedAt)
            )
          );

        if (document) {
          await tx
            .insert(xrmRecordRelationships)
            .values({
              relationshipTypeId: relationshipType.id,
              sourceRecordId: application.id,
              targetRecordId: document.id,
              metadata: { ...(parsed.metadata ?? {}), selected: true },
              source: parsed.source
            })
            .onConflictDoUpdate({
              target: [
                xrmRecordRelationships.relationshipTypeId,
                xrmRecordRelationships.sourceRecordId,
                xrmRecordRelationships.targetRecordId
              ],
              set: {
                metadata: { ...(parsed.metadata ?? {}), selected: true },
                source: parsed.source,
                deletedAt: null,
                updatedAt: now
              }
            });
        }

        const fields = { ...xrmFields(application), [config.cacheField]: document?.displayName ?? "" };
        await tx
          .update(xrmRecords)
          .set({
            fields,
            searchText: buildXrmSearchText({
              displayName: application.displayName,
              fields,
              externalKey: application.externalKey ?? undefined
            }),
            updatedAt: now
          })
          .where(eq(xrmRecords.id, application.id));
      });

      return this.getXrmRecord(parsed.applicationId);
    },

    async listXrmRelationships(input: unknown = {}) {
      const parsed = listXrmRelationshipsSchema.parse(input);
      const relationshipType = parsed.relationshipType
        ? await db.query.xrmRelationshipTypes.findFirst({ where: eq(xrmRelationshipTypes.key, parsed.relationshipType) })
        : undefined;
      if (parsed.relationshipType && !relationshipType) {
        return [];
      }
      const recordCondition =
        parsed.recordId && parsed.direction === "source"
          ? eq(xrmRecordRelationships.sourceRecordId, parsed.recordId)
          : parsed.recordId && parsed.direction === "target"
            ? eq(xrmRecordRelationships.targetRecordId, parsed.recordId)
            : parsed.recordId
              ? or(eq(xrmRecordRelationships.sourceRecordId, parsed.recordId), eq(xrmRecordRelationships.targetRecordId, parsed.recordId))
              : undefined;
      const conditions = [
        relationshipType ? eq(xrmRecordRelationships.relationshipTypeId, relationshipType.id) : undefined,
        recordCondition,
        parsed.includeDeleted ? undefined : isNull(xrmRecordRelationships.deletedAt)
      ].filter((condition): condition is NonNullable<typeof condition> => condition !== undefined);

      return db.query.xrmRecordRelationships.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          relationshipType: true,
          sourceRecord: { with: { objectType: true } },
          targetRecord: { with: { objectType: true } }
        },
        orderBy: [desc(xrmRecordRelationships.updatedAt)],
        limit: parsed.limit
      });
    },

    async listXrmRecordEvents(input: { recordId: string; limit?: number | undefined }) {
      return db.query.activities.findMany({
        where: eq(activities.xrmRecordId, input.recordId),
        with: { lead: true, person: true, company: true, task: true, assignment: true, xrmRecord: true },
        orderBy: [desc(activities.occurredAt)],
        limit: input.limit ?? 100
      });
    },

    async getLinkedApplicationForJob(jobId: string) {
      const relationshipType = await db.query.xrmRelationshipTypes.findFirst({
        where: eq(xrmRelationshipTypes.key, "application_targets_job")
      });
      const relationship = relationshipType
        ? await db.query.xrmRecordRelationships.findFirst({
            where: and(
              eq(xrmRecordRelationships.relationshipTypeId, relationshipType.id),
              eq(xrmRecordRelationships.targetRecordId, jobId),
              isNull(xrmRecordRelationships.deletedAt)
            ),
            with: {
              sourceRecord: true
            },
            orderBy: [desc(xrmRecordRelationships.updatedAt)]
          })
        : undefined;
      if (relationship?.sourceRecord?.id) {
        return this.getXrmRecord(relationship.sourceRecord.id);
      }

      const job = await this.getXrmRecord(jobId);
      const applicationId = xrmField(job, "applicationId", "");
      if (!applicationId) {
        return null;
      }
      return this.getXrmRecord(applicationId);
    },

    async getJobWorkflowState(jobId: string) {
      const job = await this.getXrmRecord(jobId);
      if (!job || job.objectType?.slug !== "job") {
        throw serviceError("job_not_found", 404, "job_not_found");
      }
      const linkedApplication = await this.getLinkedApplicationForJob(jobId);
      return {
        job,
        linkedApplication,
        workflow: allowedJobActions(job, linkedApplication)
      };
    },

    async runJobWorkflowAction(jobId: string, input: unknown) {
      const parsed = runJobWorkflowActionSchema.parse(input);
      const current = await this.getJobWorkflowState(jobId);
      if (!isJobWorkflowActionAllowed(current.workflow, parsed.action)) {
        throw serviceError("job_action_not_allowed", 409, "job_action_not_allowed");
      }

      const now = new Date().toISOString();
      const jobFields = xrmFields(current.job);
      const title = xrmField(current.job, "title", current.job.displayName);
      const company = xrmField(current.job, "company", "Company");
      const jobObjectType = current.job.objectType?.slug ?? "job";

      const updateJob = async (fields: Record<string, unknown>) =>
        this.upsertXrmRecord({
          objectType: jobObjectType,
          recordId: current.job.id,
          displayName: current.job.displayName,
          externalKey: current.job.externalKey ?? undefined,
          fields: { ...jobFields, ...fields, viewedAt: jobFields["viewedAt"] || now },
          status: current.job.status,
          source: current.job.source ?? "job_workflow",
          metadata: current.job.metadata ?? {}
        });

      const updateApplication = async (fields: Record<string, unknown>) => {
        if (!current.linkedApplication) {
          throw serviceError("linked_application_not_found", 409, "linked_application_not_found");
        }
        const appFields = xrmFields(current.linkedApplication);
        return this.upsertXrmRecord({
          objectType: current.linkedApplication.objectType?.slug ?? "application",
          recordId: current.linkedApplication.id,
          displayName: current.linkedApplication.displayName,
          externalKey: current.linkedApplication.externalKey ?? undefined,
          fields: { ...appFields, ...fields, lastTouchAt: now },
          status: current.linkedApplication.status,
          source: current.linkedApplication.source ?? "job_workflow",
          metadata: current.linkedApplication.metadata ?? {}
        });
      };

      switch (parsed.action) {
        case "start_application": {
          if (current.linkedApplication) {
            throw serviceError("duplicate_active_application", 409, "duplicate_active_application");
          }
          const createdApplication = await this.upsertXrmRecord({
            objectType: "application",
            externalKey: `job-application:${jobId}`,
            displayName: `${title} at ${company}`,
            fields: {
              role: title,
              company,
              stage: "Preparing",
              fitRate: jobFields["fitRate"],
              responsiblePerson: jobFields["responsiblePerson"] ?? jobFields["contact"],
              jobId,
              jobUrl: jobFields["url"],
              source: "job_workflow",
              appliedAt: "",
              lastTouchAt: now,
              nextActionAt: now,
              nextAction: "Choose CV, tailor the cover letter, and review before applying.",
              cvVersion: jobFields["recommendedCv"] ?? "",
              coverLetterVersion: ""
            },
            source: "job_workflow",
            metadata: { templateKey: "job_search", source: "job_workflow" }
          });
          if (!createdApplication) {
            throw serviceError("application_create_failed", 500, "application_create_failed");
          }
          await this.linkXrmRecords({
            relationshipType: "application_targets_job",
            sourceRecordId: createdApplication.id,
            targetRecordId: jobId,
            source: "job_workflow",
            metadata: { action: parsed.action }
          });
          await updateJob({
            applicationId: createdApplication.id,
            applicationStage: "Preparing",
            decisionState: "Reviewing",
            lastTouchAt: now,
            nextActionAt: now,
            nextAction: "Continue application draft: choose CV and cover letter."
          });
          break;
        }
        case "save_for_later":
          await updateJob({ decisionState: "Saved", applicationStage: "Not started", lastTouchAt: now });
          break;
        case "remove_from_saved":
        case "reconsider":
          await updateJob({ decisionState: "Reviewing", applicationStage: "Not started", lastTouchAt: now });
          break;
        case "mark_not_fit":
          await updateJob({
            decisionState: "Not a fit",
            applicationStage: "Not started",
            notFitReason: parsed.reason ?? "Marked not a fit",
            lastTouchAt: now,
            nextActionAt: "",
            nextAction: ""
          });
          break;
        case "cancel_draft":
          await updateApplication({ stage: "Closed", closingReason: "Withdrawn", nextActionAt: "", nextAction: "Draft canceled." });
          await updateJob({ applicationStage: "Closed", closingReason: "Withdrawn", decisionState: "Reviewing", lastTouchAt: now });
          break;
        case "withdraw":
          await updateApplication({ stage: "Closed", closingReason: "Withdrawn", nextActionAt: "", nextAction: "Application withdrawn." });
          await updateJob({ applicationStage: "Closed", closingReason: "Withdrawn", decisionState: "Reviewing", lastTouchAt: now });
          break;
        case "archive":
          await updateJob({ decisionState: "Archived", lastTouchAt: now });
          break;
        case "reopen":
          if (current.linkedApplication) {
            await updateApplication({ stage: "Preparing", closingReason: "", nextAction: "Reopened. Review the application packet.", nextActionAt: now });
            await updateJob({ applicationStage: "Preparing", closingReason: "", decisionState: "Reviewing", nextActionAt: now });
          } else {
            await updateJob({ decisionState: "Reviewing", applicationStage: "Not started", closingReason: "", lastTouchAt: now });
          }
          break;
        case "open_application":
        case "continue_application":
        case "view_application":
          await updateJob({ lastTouchAt: now });
          break;
      }

      return this.getJobWorkflowState(jobId);
    },

    async listXrmSemanticFields(input: { limit?: number | undefined } = {}) {
      return db.query.xrmSemanticFields.findMany({
        with: { mappings: { with: { objectType: true, fieldDefinition: true } } },
        orderBy: [asc(xrmSemanticFields.key)],
        limit: input.limit ?? 100
      });
    },

    async upsertXrmSemanticField(input: unknown) {
      const parsed = upsertXrmSemanticFieldSchema.parse(input);
      const [field] = await db
        .insert(xrmSemanticFields)
        .values({
          key: parsed.key,
          label: parsed.label,
          dataType: parsed.dataType,
          description: parsed.description,
          metadata: parsed.metadata ?? {}
        })
        .onConflictDoUpdate({
          target: xrmSemanticFields.key,
          set: {
            label: parsed.label,
            dataType: parsed.dataType,
            description: parsed.description,
            metadata: parsed.metadata ?? {},
            updatedAt: new Date()
          }
        })
        .returning();
      return field;
    },

    async upsertXrmFieldMapping(input: unknown) {
      const parsed = upsertXrmFieldMappingSchema.parse(input);
      return db.transaction(async (tx) => {
        const objectType = await tx.query.xrmObjectTypes.findFirst({ where: eq(xrmObjectTypes.slug, parsed.objectType) });
        if (!objectType) {
          throw new Error(`xrm_object_type_not_found:${parsed.objectType}`);
        }
        const semanticField = await tx.query.xrmSemanticFields.findFirst({ where: eq(xrmSemanticFields.key, parsed.semanticFieldKey) });
        if (!semanticField) {
          throw new Error(`xrm_semantic_field_not_found:${parsed.semanticFieldKey}`);
        }
        const fieldDefinition = await tx.query.xrmFieldDefinitions.findFirst({
          where: and(eq(xrmFieldDefinitions.objectTypeId, objectType.id), eq(xrmFieldDefinitions.key, parsed.fieldKey))
        });

        const [mapping] = await tx
          .insert(xrmFieldMappings)
          .values({
            objectTypeId: objectType.id,
            fieldDefinitionId: fieldDefinition?.id,
            fieldKey: parsed.fieldKey,
            semanticFieldId: semanticField.id,
            confidence: parsed.confidence,
            transform: parsed.transform ?? {},
            metadata: parsed.metadata ?? {}
          })
          .onConflictDoUpdate({
            target: [xrmFieldMappings.objectTypeId, xrmFieldMappings.fieldKey, xrmFieldMappings.semanticFieldId],
            set: {
              fieldDefinitionId: fieldDefinition?.id,
              confidence: parsed.confidence,
              transform: parsed.transform ?? {},
              metadata: parsed.metadata ?? {},
              updatedAt: new Date()
            }
          })
          .returning();
        return mapping;
      });
    },

    async listXrmRecordFiles(input: { recordId: string; limit?: number | undefined }) {
      return db.query.xrmFiles.findMany({
        where: eq(xrmFiles.recordId, input.recordId),
        orderBy: [asc(xrmFiles.kind), asc(xrmFiles.title)],
        limit: input.limit ?? 100
      });
    },

    async createXrmFile(input: unknown) {
      const parsed = createXrmFileSchema.parse(input);
      const [file] = await db
        .insert(xrmFiles)
        .values({
          recordId: parsed.recordId,
          kind: parsed.kind,
          title: parsed.title,
          path: parsed.path,
          mimeType: parsed.mimeType,
          size: parsed.size,
          checksum: parsed.checksum,
          metadata: parsed.metadata ?? {},
          createdByAgentId: parsed.createdByAgentId
        })
        .onConflictDoUpdate({
          target: [xrmFiles.recordId, xrmFiles.path],
          set: {
            kind: parsed.kind,
            title: parsed.title,
            mimeType: parsed.mimeType,
            size: parsed.size,
            checksum: parsed.checksum,
            metadata: parsed.metadata ?? {},
            updatedAt: new Date()
          }
        })
        .returning();
      return file;
    },

    async getWorkspaceLayout(input: unknown = {}) {
      const parsed = workspaceLayoutSchema.parse(input);
      const [objectTypes, views] = await Promise.all([
        this.listXrmObjectTypes({ templateKey: parsed.templateKey, active: true, limit: 100 }),
        this.listViews({ templateKey: parsed.templateKey, limit: 100 })
      ]);

      const visibleViews = views.filter((view) => view.audience !== "hidden" && view.placement !== "hidden");
      const viewResults = await Promise.all(
        visibleViews.map(async (view) => ({
          placement: view.placement,
          displayOrder: view.displayOrder,
          result: await this.runView({ key: view.key, limit: parsed.limit })
        }))
      );
      const sortedViewResults = [...viewResults].sort((a, b) => a.displayOrder - b.displayOrder);

      const summarySource = sortedViewResults.some((entry) => entry.placement === "summary")
        ? sortedViewResults.filter((entry) => entry.placement === "summary")
        : sortedViewResults.filter((entry) => entry.placement === "main" || entry.placement === "secondary").slice(0, 6);
      const summary = summarySource
        .map((entry) => ({
          key: entry.result.view.key,
          label: entry.result.view.name,
          objectType: entry.result.view.objectType,
          value: entry.result.total
        }));

      return {
        mode: parsed.templateKey === "outreach" ? "outreach" : "job_search",
        label: labelFromKey(parsed.templateKey),
        templateKey: parsed.templateKey === "outreach" ? "outreach" : "job_search",
        template: {
          key: parsed.templateKey,
          label: labelFromKey(parsed.templateKey)
        },
        objectTypes,
        summary,
        views: {
          main: sortedViewResults.filter((entry) => entry.placement === "main").map((entry) => entry.result),
          secondary: sortedViewResults.filter((entry) => entry.placement === "secondary").map((entry) => entry.result),
          sidebar: sortedViewResults.filter((entry) => entry.placement === "sidebar").map((entry) => entry.result),
          summary: sortedViewResults.filter((entry) => entry.placement === "summary").map((entry) => entry.result)
        }
      };
    },

    async listLeads(input: { query?: string | undefined; limit?: number | undefined } = {}) {
      const limit = input.limit ?? 100;
      const where = input.query
        ? or(
            ilike(leads.fullName, `%${input.query}%`),
            ilike(leads.company, `%${input.query}%`),
            ilike(leads.title, `%${input.query}%`),
            ilike(leads.linkedinUrl, `%${input.query}%`),
            ilike(leads.salesnavUrl, `%${input.query}%`),
            ilike(leads.email, `%${input.query}%`)
          )
        : undefined;

      return db.query.leads.findMany({
        where,
        with: {
          person: true,
          companyEntity: true,
          leadRecord: true
        },
        orderBy: [desc(leads.updatedAt)],
        limit
      });
    },

    async getLead(id: string) {
      return db.query.leads.findFirst({
        where: eq(leads.id, id),
        with: {
          person: {
            with: {
              emailAddresses: true,
              company: true
            }
          },
          companyEntity: {
            with: {
              domains: true
            }
          },
          leadRecord: true,
          assignments: true,
          activities: true,
          bookings: true,
          tasks: true
        }
      });
    },

    async createLead(input: unknown) {
      const parsed = createLeadSchema.parse(input);
      const { lead } = await db.transaction((tx) => upsertLeadRecord(tx, parsed));
      return lead;
    },

    async updateLead(id: string, input: unknown) {
      const parsed = updateLeadSchema.parse(input);
      const [updated] = await db
        .update(leads)
        .set({
          fullName: parsed.fullName,
          company: parsed.company,
          companyId: undefined,
          title: parsed.title,
          linkedinUrl: normalizeUrl(parsed.linkedinUrl),
          salesnavUrl: normalizeUrl(parsed.salesnavUrl),
          email: normalizeEmail(parsed.email),
          phone: parsed.phone,
          location: parsed.location,
          source: parsed.source,
          ownerAgentId: parsed.ownerAgentId,
          notes: parsed.notes,
          customFields: parsed.customFields,
          updatedAt: new Date()
        })
        .where(eq(leads.id, id))
        .returning();
      return updated;
    },

    async listCompanies(input: { query?: string | undefined; limit?: number | undefined } = {}) {
      const where = input.query
        ? or(
            ilike(companies.name, `%${input.query}%`),
            ilike(companies.normalizedName, `%${input.query}%`),
            ilike(companies.primaryDomain, `%${input.query}%`)
          )
        : undefined;
      return db.query.companies.findMany({
        where,
        with: { domains: true },
        orderBy: [desc(companies.updatedAt)],
        limit: input.limit ?? 100
      });
    },

    async listPeople(input: { query?: string | undefined; limit?: number | undefined } = {}) {
      const where = input.query
        ? or(
            ilike(people.fullName, `%${input.query}%`),
            ilike(people.normalizedFullName, `%${input.query}%`),
            ilike(people.title, `%${input.query}%`)
          )
        : undefined;
      return db.query.people.findMany({
        where,
        with: { emailAddresses: true, company: true },
        orderBy: [desc(people.updatedAt)],
        limit: input.limit ?? 100
      });
    },

    async deleteLead(id: string) {
      const deleted = await db.delete(leads).where(eq(leads.id, id)).returning({ id: leads.id });
      return {
        deleted: deleted.length > 0,
        leadId: id
      };
    },

    async listFlows() {
      return db.query.flows.findMany({
        with: {
          steps: true
        },
        orderBy: [desc(flows.updatedAt)]
      });
    },

    async getSyntheticDataSummary() {
      const syntheticLeadWhere = or(
        eq(leads.source, "cli-smoke"),
        eq(leads.source, "db-smoke"),
        ilike(leads.source, "stress-test-%")
      );
      const syntheticFlowWhere = ilike(flows.name, "Stress Test %");
      const syntheticLeadIds = (await db.select({ id: leads.id }).from(leads).where(syntheticLeadWhere)).map(
        (lead) => lead.id
      );
      const syntheticLeadIdWhere =
        syntheticLeadIds.length > 0 ? inArray(activities.leadId, syntheticLeadIds) : undefined;
      const syntheticAssignmentLeadWhere =
        syntheticLeadIds.length > 0 ? inArray(assignments.leadId, syntheticLeadIds) : undefined;

      return {
        leads: syntheticLeadIds.length,
        assignments: syntheticAssignmentLeadWhere ? await db.$count(assignments, syntheticAssignmentLeadWhere) : 0,
        activities: syntheticLeadIdWhere ? await db.$count(activities, syntheticLeadIdWhere) : 0,
        stressFlows: await db.$count(flows, syntheticFlowWhere)
      };
    },

    async cleanupSyntheticData() {
      const syntheticLeadWhere = or(
        eq(leads.source, "cli-smoke"),
        eq(leads.source, "db-smoke"),
        ilike(leads.source, "stress-test-%")
      );
      const syntheticFlowWhere = ilike(flows.name, "Stress Test %");

      return db.transaction(async (tx) => {
        const deletedLeads = await tx.delete(leads).where(syntheticLeadWhere).returning({ id: leads.id });
        const deletedFlows = await tx.delete(flows).where(syntheticFlowWhere).returning({ id: flows.id });

        return {
          deletedLeads: deletedLeads.length,
          deletedStressFlows: deletedFlows.length
        };
      });
    },

    async createFlow(input: unknown) {
      const parsed = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        steps: z
          .array(
            z.object({
              name: z.string().min(1),
              channel: z.enum(["linkedin", "salesnav", "email", "scheduler", "manual"]).default("manual"),
              defaultDelayDays: z.number().int().optional(),
              template: z.string().optional()
            })
          )
          .default([])
      }).parse(input);

      return db.transaction(async (tx) => {
        const [flow] = await tx
          .insert(flows)
          .values({ name: parsed.name, description: parsed.description })
          .returning();

        if (!flow) {
          throw new Error("Failed to create flow");
        }

        if (parsed.steps.length > 0) {
          await tx.insert(flowSteps).values(
            parsed.steps.map((step, index) => ({
              flowId: flow.id,
              stepOrder: index + 1,
              name: step.name,
              channel: step.channel,
              defaultDelayDays: step.defaultDelayDays,
              template: step.template
            }))
          );
        }

        return flow;
      });
    },

    async listAssignments(input: { status?: string | undefined; limit?: number | undefined } = {}) {
      const status = input.status as typeof assignments.$inferSelect.status | undefined;
      return db.query.assignments.findMany({
        where: status ? eq(assignments.status, status) : undefined,
        orderBy: [desc(assignments.updatedAt)],
        limit: input.limit ?? 100
      });
    },

    async createAssignment(input: unknown) {
      const parsed = createAssignmentSchema.parse(input);
      const [created] = await db
        .insert(assignments)
        .values({
          leadId: parsed.leadId,
          flowId: parsed.flowId,
          currentStepId: parsed.currentStepId,
          status: parsed.status,
          priority: parsed.priority,
          ownerAgentId: parsed.ownerAgentId,
          lastContactedAt: parsed.lastContactedAt ? new Date(parsed.lastContactedAt) : undefined,
          nextActionAt: parsed.nextActionAt ? new Date(parsed.nextActionAt) : undefined
        })
        .returning();
      if (created?.nextActionAt) {
        await db
          .insert(tasks)
          .values({
            title: `Follow up on lead ${created.leadId}`,
            type: "follow_up",
            status: "open",
            priority: created.priority,
            dueAt: created.nextActionAt,
            ownerAgentId: created.ownerAgentId,
            leadId: created.leadId,
            assignmentId: created.id,
            idempotencyKey: `assignment:${created.id}:next-action`
          })
          .onConflictDoUpdate({
            target: tasks.idempotencyKey,
            set: {
              priority: created.priority,
              dueAt: created.nextActionAt,
              ownerAgentId: created.ownerAgentId,
              updatedAt: new Date()
            }
          });
      }
      return created;
    },

    async recordOutreachEvent(input: unknown) {
      const parsed = recordOutreachEventSchema.parse(input);
      const assignmentInput = parsed.assignment ?? {};
      const activityInput = parsed.activity ?? {};
      const activityType = activityInput.type ?? "connection_sent";
      const activityChannel = activityInput.channel ?? "linkedin";
      const activityDirection = activityInput.direction ?? "outbound";
      const assignmentStatus = assignmentInput.status ?? "connection_sent";
      const assignmentPriority = assignmentInput.priority ?? 0;
      const occurredAt = activityInput.occurredAt ? new Date(activityInput.occurredAt) : new Date();
      const profileKey =
        normalizeUrl(parsed.lead.linkedinUrl) ??
        normalizeUrl(parsed.lead.salesnavUrl) ??
        normalizeEmail(parsed.lead.email) ??
        normalizeName(parsed.lead.fullName) ??
        parsed.lead.fullName;
      const externalId =
        parsed.externalKey ?? activityInput.externalId ?? `${activityChannel}:${activityType}:${profileKey}:${occurredAt.toISOString()}`;

      return db.transaction(async (tx) => {
        const existingActivity = await tx.query.activities.findFirst({
          where: or(eq(activities.idempotencyKey, externalId), eq(activities.externalId, externalId))
        });

        if (existingActivity) {
          const [lead, assignment] = await Promise.all([
            existingActivity.leadId
              ? tx.query.leads.findFirst({ where: eq(leads.id, existingActivity.leadId) })
              : Promise.resolve(null),
            existingActivity.assignmentId
              ? tx.query.assignments.findFirst({ where: eq(assignments.id, existingActivity.assignmentId) })
              : Promise.resolve(null)
          ]);
          const task = existingActivity.taskId
            ? await tx.query.tasks.findFirst({ where: eq(tasks.id, existingActivity.taskId) })
            : undefined;

          return {
            idempotent: true,
            lead,
            assignment,
            task,
            activity: existingActivity
          };
        }

        const { lead, person, company } = await upsertLeadRecord(tx, parsed.lead);

        const flowId =
          assignmentInput.flowId ??
          (await tx.query.flows.findFirst({ where: eq(flows.active, true), orderBy: [desc(flows.updatedAt)] }))?.id;

        if (!flowId) {
          throw new Error("No active flow found for outreach event");
        }

        let assignment = await tx.query.assignments.findFirst({
          where: and(eq(assignments.leadId, lead.id), eq(assignments.flowId, flowId))
        });
        const lastContactedAt = assignmentInput.lastContactedAt ? new Date(assignmentInput.lastContactedAt) : occurredAt;

        if (assignment) {
          [assignment] = await tx
            .update(assignments)
            .set({
              currentStepId: assignmentInput.currentStepId,
              status: assignmentStatus,
              priority: assignmentPriority,
              ownerAgentId: assignmentInput.ownerAgentId,
              lastContactedAt,
              nextActionAt: assignmentInput.nextActionAt ? new Date(assignmentInput.nextActionAt) : undefined,
              updatedAt: new Date()
            })
            .where(eq(assignments.id, assignment.id))
            .returning();
        } else {
          [assignment] = await tx
            .insert(assignments)
            .values({
              leadId: lead.id,
              flowId,
              currentStepId: assignmentInput.currentStepId,
              status: assignmentStatus,
              priority: assignmentPriority,
              ownerAgentId: assignmentInput.ownerAgentId,
              lastContactedAt,
              nextActionAt: assignmentInput.nextActionAt ? new Date(assignmentInput.nextActionAt) : undefined
            })
            .returning();
        }

        if (!assignment) {
          throw new Error("Failed to create or update outreach assignment");
        }

        const task = await upsertOutreachNextActionTask(tx, {
          config: parsed.nextActionTask,
          activityType,
          lead,
          personId: person.id,
          companyId: company?.id,
          assignmentId: assignment.id,
          ownerAgentId: assignmentInput.ownerAgentId,
          priority: assignmentPriority,
          occurredAt,
          assignmentNextActionAt: assignment.nextActionAt,
          profileKey
        });
        const metadata = mergeOutreachMetadata(activityInput);

        const [activity] = await tx
          .insert(activities)
          .values({
            leadId: lead.id,
            assignmentId: assignment.id,
            personId: person.id,
            companyId: company?.id,
            taskId: task?.id,
            type: activityType,
            channel: activityChannel,
            direction: activityDirection,
            subject: activityInput.subject,
            body: activityInput.body,
            providerThreadId: activityInput.providerThreadId,
            providerMessageId: activityInput.providerMessageId,
            externalId,
            externalUrl: activityInput.externalUrl,
            idempotencyKey: activityInput.idempotencyKey ?? externalId,
            metadata,
            occurredAt
          })
          .returning();

        if (!activity) {
          throw new Error("Failed to create outreach activity");
        }

        return {
          idempotent: false,
          lead,
          person,
          company,
          assignment,
          task,
          activity
        };
      });
    },

    async backfillLegacyOutreachEvents(input: unknown = {}) {
      const parsed = backfillLegacyOutreachEventsSchema.parse(input);
      const conditions = [
        parsed.activityId ? eq(activities.id, parsed.activityId) : undefined,
        parsed.leadId ? eq(activities.leadId, parsed.leadId) : undefined,
        parsed.channel ? eq(activities.channel, parsed.channel) : undefined,
        or(eq(activities.type, "connection_sent"), eq(activities.type, "connection_request_sent"))
      ].filter((condition): condition is NonNullable<typeof condition> => condition !== undefined);

      const candidates = await db.query.activities.findMany({
        where: and(...conditions),
        with: { lead: true, person: true, company: true, assignment: true, task: true },
        orderBy: [desc(activities.occurredAt)],
        limit: parsed.limit
      });

      const changes: Array<{
        activityId: string;
        before: {
          subject: string | null;
          body: string | null;
          metadata: unknown;
          taskId: string | null;
        };
        after: {
          subject: string;
          body: string | null;
          metadata: Record<string, unknown>;
          taskId?: string | null;
        };
      }> = [];

      for (const candidate of candidates) {
        const parsedBody = parseLegacyOutreachBody(candidate.body, candidate.externalUrl);
        if (!parsedBody) {
          continue;
        }

        const existingMetadata = isRecord(candidate.metadata) ? candidate.metadata : {};
        if (existingMetadata.noteStatus && existingMetadata.originalBody) {
          continue;
        }

        const parsedMetadata = Object.fromEntries(
          Object.entries(parsedBody).filter(([, value]) => value !== undefined && value !== "")
        );
        const metadata = {
          ...existingMetadata,
          ...parsedMetadata,
          normalizedBy: "legacy-outreach-backfill"
        };
        const subject = candidate.subject ?? `Connection request sent: ${candidate.lead?.fullName ?? "unknown lead"}`;
        const body =
          parsedBody.noteStatus === "confirmed_sent" && !parsed.overwriteConfirmedBody
            ? candidate.body
            : parsedBody.noteStatus === "confirmed_sent"
              ? parsedBody.originalBody
              : null;

        changes.push({
          activityId: candidate.id,
          before: {
            subject: candidate.subject,
            body: candidate.body,
            metadata: candidate.metadata,
            taskId: candidate.taskId
          },
          after: {
            subject,
            body,
            metadata,
            taskId: candidate.taskId
          }
        });
      }

      if (parsed.dryRun) {
        return {
          dryRun: true,
          matched: candidates.length,
          changed: changes.length,
          samples: changes.slice(0, 5)
        };
      }

      const applied = await db.transaction(async (tx) => {
        const appliedChanges = [];
        for (const change of changes) {
          const candidate = candidates.find((item) => item.id === change.activityId);
          if (!candidate) {
            continue;
          }

          let linkedTaskId = candidate.taskId;
          if (parsed.createTasks && !linkedTaskId && candidate.lead) {
            const existingMetadata = isRecord(change.after.metadata) ? change.after.metadata : {};
            const profileKey =
              normalizeUrl(String(existingMetadata.profileUrl ?? "")) ??
              normalizeUrl(candidate.lead.linkedinUrl ?? undefined) ??
              normalizeUrl(candidate.lead.salesnavUrl ?? undefined) ??
              normalizeEmail(candidate.lead.email ?? undefined) ??
              normalizeName(candidate.lead.fullName) ??
              candidate.lead.id;
            const task = await upsertOutreachNextActionTask(tx, {
              config: undefined,
              activityType: candidate.type,
              lead: candidate.lead,
              personId: candidate.personId,
              companyId: candidate.companyId,
              assignmentId: candidate.assignmentId,
              ownerAgentId: candidate.assignment?.ownerAgentId,
              priority: candidate.assignment?.priority ?? 0,
              occurredAt: candidate.occurredAt,
              assignmentNextActionAt: candidate.assignment?.nextActionAt,
              profileKey
            });
            linkedTaskId = task?.id ?? linkedTaskId;
          }

          await tx
            .update(activities)
            .set({
              subject: change.after.subject,
              body: change.after.body,
              metadata: change.after.metadata,
              taskId: linkedTaskId ?? undefined
            })
            .where(eq(activities.id, change.activityId));

          appliedChanges.push({
            ...change,
            after: {
              ...change.after,
              taskId: linkedTaskId
            }
          });
        }
        return appliedChanges;
      });

      return {
        dryRun: false,
        matched: candidates.length,
        changed: applied.length,
        samples: applied.slice(0, 5)
      };
    },

    async updateAssignment(id: string, input: unknown) {
      const parsed = updateAssignmentSchema.parse(input);
      const lastContactedAt =
        parsed.lastContactedAt === undefined || parsed.lastContactedAt === null
          ? parsed.lastContactedAt
          : new Date(parsed.lastContactedAt);
      const nextActionAt =
        parsed.nextActionAt === undefined || parsed.nextActionAt === null
          ? parsed.nextActionAt
          : new Date(parsed.nextActionAt);
      const [updated] = await db
        .update(assignments)
        .set({
          currentStepId: parsed.currentStepId,
          status: parsed.status,
          priority: parsed.priority,
          ownerAgentId: parsed.ownerAgentId,
          lastContactedAt,
          nextActionAt,
          updatedAt: new Date()
        })
        .where(eq(assignments.id, id))
        .returning();
      return updated;
    },

    async getDailyQueue(input: { limit?: number | undefined } = {}) {
      return db.query.tasks.findMany({
        where: and(inArray(tasks.status, ["open", "in_progress"]), lte(tasks.dueAt, new Date())),
        with: { lead: true, person: true, company: true, assignment: true, xrmRecord: true },
        orderBy: [desc(tasks.priority), desc(tasks.dueAt)],
        limit: input.limit ?? 25
      });
    },

    async getAssignmentQueue(input: { limit?: number | undefined } = {}) {
      return db.query.assignments.findMany({
        where: lte(assignments.nextActionAt, new Date()),
        orderBy: [desc(assignments.priority), desc(assignments.nextActionAt)],
        limit: input.limit ?? 25
      });
    },

    async getOverdueQueue(input: { limit?: number | undefined } = {}) {
      return db.query.tasks.findMany({
        where: and(inArray(tasks.status, ["open", "in_progress"]), lte(tasks.dueAt, new Date(Date.now() - 24 * 60 * 60 * 1000))),
        with: { lead: true, person: true, company: true, assignment: true, xrmRecord: true },
        orderBy: [desc(tasks.priority), desc(tasks.dueAt)],
        limit: input.limit ?? 25
      });
    },

    async listTasks(input: { status?: string | undefined; query?: string | undefined; limit?: number | undefined } = {}) {
      const status = input.status as typeof tasks.$inferSelect.status | undefined;
      const query = input.query
        ? or(
            ilike(tasks.title, `%${input.query}%`),
            ilike(tasks.description, `%${input.query}%`),
            ilike(tasks.idempotencyKey, `%${input.query}%`)
          )
        : undefined;
      const where = [status ? eq(tasks.status, status) : undefined, query].filter(
        (condition): condition is NonNullable<typeof condition> => condition !== undefined
      );
      return db.query.tasks.findMany({
        where: where.length > 0 ? and(...where) : undefined,
        with: { lead: true, person: true, company: true, assignment: true, xrmRecord: true },
        orderBy: [desc(tasks.priority), desc(tasks.dueAt)],
        limit: input.limit ?? 100
      });
    },

    async getTask(id: string) {
      return db.query.tasks.findFirst({
        where: eq(tasks.id, id),
        with: { lead: true, person: true, company: true, assignment: true, xrmRecord: true, events: true }
      });
    },

    async listLeadTasks(leadId: string, limit = 100) {
      return db.query.tasks.findMany({
        where: eq(tasks.leadId, leadId),
        with: { lead: true, person: true, company: true, assignment: true, xrmRecord: true, events: true },
        orderBy: [desc(tasks.priority), desc(tasks.dueAt)],
        limit
      });
    },

    async createTask(input: unknown) {
      const parsed = createTaskSchema.parse(input);
      return db.transaction(async (tx) => {
        let existing =
          parsed.idempotencyKey !== undefined
            ? await tx.query.tasks.findFirst({ where: eq(tasks.idempotencyKey, parsed.idempotencyKey) })
            : undefined;

        if (!existing) {
          [existing] = await tx
            .insert(tasks)
            .values({
              title: parsed.title,
              description: parsed.description,
              type: parsed.type,
              status: parsed.status,
              priority: parsed.priority,
              dueAt: parsed.dueAt ? new Date(parsed.dueAt) : undefined,
              ownerAgentId: parsed.ownerAgentId,
              personId: parsed.personId,
              companyId: parsed.companyId,
              leadId: parsed.leadId,
              assignmentId: parsed.assignmentId,
              xrmRecordId: parsed.xrmRecordId,
              idempotencyKey: parsed.idempotencyKey,
              metadata: parsed.metadata ?? {}
            })
            .returning();

          if (existing) {
            await tx.insert(taskEvents).values({
              taskId: existing.id,
              type: "created",
              metadata: { source: "service" }
            });
          }
        }

        return existing;
      });
    },

    async updateTask(id: string, input: unknown) {
      const parsed = updateTaskSchema.parse(input);
      const [updated] = await db
        .update(tasks)
        .set({
          title: parsed.title,
          description: parsed.description,
          type: parsed.type,
          status: parsed.status,
          priority: parsed.priority,
          dueAt: parsed.dueAt === undefined || parsed.dueAt === null ? parsed.dueAt : new Date(parsed.dueAt),
          ownerAgentId: parsed.ownerAgentId,
          personId: parsed.personId,
          companyId: parsed.companyId,
          leadId: parsed.leadId,
          assignmentId: parsed.assignmentId,
          xrmRecordId: parsed.xrmRecordId,
          idempotencyKey: parsed.idempotencyKey,
          metadata: parsed.metadata,
          updatedAt: new Date()
        })
        .where(eq(tasks.id, id))
        .returning();

      if (updated) {
        await db.insert(taskEvents).values({
          taskId: updated.id,
          type: parsed.status === "done" ? "completed" : "updated",
          metadata: { patch: parsed }
        });
      }

      return updated;
    },

    async completeTask(id: string, input: { completedAt?: string | undefined } = {}) {
      return this.updateTask(id, {
        status: "done",
        dueAt: null,
        metadata: {
          completedAt: input.completedAt ?? new Date().toISOString()
        }
      });
    },

    async postponeTask(id: string, input: { dueAt: string }) {
      return this.updateTask(id, {
        status: "open",
        dueAt: input.dueAt
      });
    },

    async cancelTask(id: string, input: { reason?: string | undefined } = {}) {
      return this.updateTask(id, {
        status: "canceled",
        metadata: input.reason ? { cancelReason: input.reason } : undefined
      });
    },

    async listActivities(
      input: {
        leadId?: string | undefined;
        personId?: string | undefined;
        companyId?: string | undefined;
        taskId?: string | undefined;
        xrmRecordId?: string | undefined;
        channel?: string | undefined;
        query?: string | undefined;
        limit?: number | undefined;
      } = {}
    ) {
      const query = input.query
        ? or(
            ilike(activities.subject, `%${input.query}%`),
            ilike(activities.body, `%${input.query}%`),
            ilike(activities.providerThreadId, `%${input.query}%`),
            ilike(activities.providerMessageId, `%${input.query}%`),
            ilike(activities.externalId, `%${input.query}%`),
            ilike(activities.externalUrl, `%${input.query}%`)
          )
        : undefined;
      const conditions = [
        input.leadId ? eq(activities.leadId, input.leadId) : undefined,
        input.personId ? eq(activities.personId, input.personId) : undefined,
        input.companyId ? eq(activities.companyId, input.companyId) : undefined,
        input.taskId ? eq(activities.taskId, input.taskId) : undefined,
        input.xrmRecordId ? eq(activities.xrmRecordId, input.xrmRecordId) : undefined,
        input.channel ? eq(activities.channel, input.channel as typeof activities.$inferSelect.channel) : undefined,
        query
      ].filter((condition): condition is NonNullable<typeof condition> => condition !== undefined);

      return db.query.activities.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: { lead: true, person: true, company: true, task: true, assignment: true, xrmRecord: true },
        orderBy: [desc(activities.occurredAt)],
        limit: input.limit ?? 100
      });
    },

    async getActivity(id: string) {
      return db.query.activities.findFirst({
        where: eq(activities.id, id),
        with: { lead: true, person: true, company: true, task: true, assignment: true, xrmRecord: true }
      });
    },

    async addNote(input: {
      leadId?: string | undefined;
      personId?: string | undefined;
      companyId?: string | undefined;
      taskId?: string | undefined;
      xrmRecordId?: string | undefined;
      subject?: string | undefined;
      body: string;
      idempotencyKey?: string | undefined;
      metadata?: Record<string, unknown> | undefined;
      occurredAt?: string | undefined;
    }) {
      return this.logActivity({
        ...input,
        type: "manual_note",
        channel: "manual",
        direction: "internal"
      });
    },

    async search(input: { query: string; limit?: number | undefined }) {
      const limit = input.limit ?? 25;
      const [leadResults, peopleResults, companyResults, taskResults, eventResults] = await Promise.all([
        this.listLeads({ query: input.query, limit }),
        this.listPeople({ query: input.query, limit }),
        this.listCompanies({ query: input.query, limit }),
        this.listTasks({ query: input.query, limit }),
        this.listActivities({ query: input.query, limit })
      ]);

      return {
        query: input.query,
        leads: leadResults,
        people: peopleResults,
        companies: companyResults,
        tasks: taskResults,
        events: eventResults
      };
    },

    async listViews(input: { objectType?: string | undefined; templateKey?: string | undefined; limit?: number | undefined } = {}) {
      const parsedObjectType = input.objectType ? viewObjectTypeSchema.parse(input.objectType) : undefined;
      const parsedTemplateKey = input.templateKey ? templateKeySchema.parse(input.templateKey) : undefined;
      return db.query.viewDefinitions.findMany({
        where: and(
          parsedObjectType ? eq(viewDefinitions.objectType, parsedObjectType) : undefined,
          parsedTemplateKey ? eq(viewDefinitions.templateKey, parsedTemplateKey) : undefined
        ),
        with: { createdByAgent: true },
        orderBy: [desc(viewDefinitions.isDefault), asc(viewDefinitions.displayOrder), desc(viewDefinitions.updatedAt)],
        limit: input.limit ?? 100
      });
    },

    async getView(input: { viewId?: string | undefined; key?: string | undefined }) {
      if (!input.viewId && !input.key) {
        throw new Error("view_identifier_required");
      }

      return db.query.viewDefinitions.findFirst({
        where:
          input.viewId && uuidPattern.test(input.viewId)
            ? eq(viewDefinitions.id, input.viewId)
            : eq(viewDefinitions.key, input.key ?? input.viewId ?? ""),
        with: { createdByAgent: true }
      });
    },

    async createView(input: unknown) {
      const parsed = normalizeViewConfig(viewDefinitionInputSchema.parse(input));
      const [created] = await db
        .insert(viewDefinitions)
        .values({
          key: parsed.key,
          name: parsed.name,
          description: parsed.description,
          objectType: parsed.objectType,
          templateKey: parsed.templateKey,
          layout: parsed.layout,
          columns: parsed.columns,
          filters: parsed.filters,
          sort: parsed.sort,
          groupBy: parsed.groupBy,
          placement: parsed.placement,
          displayOrder: parsed.displayOrder,
          audience: parsed.audience,
          visibleWhen: parsed.visibleWhen,
          isDefault: parsed.isDefault,
          createdByAgentId: parsed.createdByAgentId
        })
        .returning();
      return created;
    },

    async updateView(input: { viewId?: string | undefined; key?: string | undefined; patch: unknown }) {
      const existing = await this.getView(input);
      if (!existing) {
        return undefined;
      }

      const parsed = normalizeViewPatch(viewObjectTypeSchema.parse(existing.objectType), viewDefinitionUpdateSchema.parse(input.patch));
      const [updated] = await db
        .update(viewDefinitions)
        .set({
          name: parsed.name,
          description: parsed.description,
          objectType: parsed.objectType,
          templateKey: parsed.templateKey,
          layout: parsed.layout,
          columns: parsed.columns,
          filters: parsed.filters,
          sort: parsed.sort,
          groupBy: parsed.groupBy,
          placement: parsed.placement,
          displayOrder: parsed.displayOrder,
          audience: parsed.audience,
          visibleWhen: parsed.visibleWhen,
          isDefault: parsed.isDefault,
          updatedAt: new Date()
        })
        .where(eq(viewDefinitions.id, existing.id))
        .returning();
      return updated;
    },

    async deleteView(input: { viewId?: string | undefined; key?: string | undefined }) {
      const existing = await this.getView(input);
      if (!existing) {
        return { deleted: false, viewId: input.viewId ?? null, key: input.key ?? null };
      }

      const deleted = await db.delete(viewDefinitions).where(eq(viewDefinitions.id, existing.id)).returning({ id: viewDefinitions.id });
      return {
        deleted: deleted.length > 0,
        viewId: existing.id,
        key: existing.key
      };
    },

    async runView(input: unknown) {
      const parsed = viewRunInputSchema.parse(input);
      const view = await this.getView(parsed);
      if (!view) {
        throw new Error("view_not_found");
      }

      const objectType = viewObjectTypeSchema.parse(view.objectType);
      const columns = parseViewColumns(view.columns, objectType);
      const filters = [
        ...parseViewFilters(view.filters, objectType),
        ...parseViewFilters(parsed.filters ?? [], objectType)
      ];
      const sort = parsed.sort ? parseViewSort(parsed.sort, objectType) : parseViewSort(view.sort, objectType);
      const limit = parsed.limit ?? 100;
      const sourceLimit = Math.max(limit, 500);
      const rows: unknown[] = await this.getViewRows(objectType, sourceLimit);
      const result = runViewPipeline(rows, filters, sort, limit, parsed.q);

      return {
        view: {
          id: view.id,
          key: view.key,
          name: view.name,
          objectType,
          templateKey: view.templateKey,
          layout: view.layout,
          columns,
          filters,
          sort,
          groupBy: view.groupBy,
          placement: view.placement,
          displayOrder: view.displayOrder,
          audience: view.audience,
          visibleWhen: view.visibleWhen,
          isDefault: view.isDefault
        },
        total: result.total,
        returned: result.rows.length,
        rows: result.rows
      };
    },

    async getViewRows(objectType: ViewObjectType, limit = 500) {
      const objectTypeRecord = await db.query.xrmObjectTypes.findFirst({ where: eq(xrmObjectTypes.slug, objectType) });
      if (objectTypeRecord) {
        const records = await db.query.xrmRecords.findMany({
          where: and(eq(xrmRecords.objectTypeId, objectTypeRecord.id), isNull(xrmRecords.deletedAt)),
          with: {
            objectType: true,
            tasks: true,
            activities: true,
            sourceRelationships: { with: { relationshipType: true, targetRecord: true } },
            targetRelationships: { with: { relationshipType: true, sourceRecord: true } }
          },
          orderBy: [desc(xrmRecords.updatedAt)],
          limit
        });
        if (records.length > 0 || !isLegacyViewObjectType(objectType)) {
          return records.map(toXrmViewRow);
        }
      }

      switch (objectType) {
        case "lead":
          return (await this.listLeads({ limit })).map((row) => withLegacyViewLink(row, "lead"));
        case "person":
          return (await this.listPeople({ limit })).map((row) => withLegacyViewLink(row, "person"));
        case "company":
          return (await this.listCompanies({ limit })).map((row) => withLegacyViewLink(row, "company"));
        case "task":
          return (await this.listTasks({ limit })).map((row) => withLegacyViewLink(row, "task"));
        case "event":
          return (await this.listActivities({ limit })).map((row) => withLegacyViewLink(row, "event"));
        default:
          return [];
      }
    },

    async logActivity(input: unknown) {
      const parsed = createActivitySchema.parse(input);
      return db.transaction(async (tx) => {
        const idempotencyKey = parsed.idempotencyKey ?? parsed.externalId;
        const existing =
          idempotencyKey !== undefined
            ? await tx.query.activities.findFirst({
                where: or(eq(activities.idempotencyKey, idempotencyKey), eq(activities.externalId, idempotencyKey))
              })
            : undefined;

        if (existing) {
          return existing;
        }

        const links = await resolveActivityLinks(tx, parsed);
        const [created] = await tx
          .insert(activities)
          .values({
            leadId: links.leadId,
            personId: links.personId,
            companyId: links.companyId,
            taskId: links.taskId,
            xrmRecordId: links.xrmRecordId,
            assignmentId: parsed.assignmentId,
            type: parsed.type,
            channel: parsed.channel,
            direction: parsed.direction,
            subject: parsed.subject,
            body: parsed.body,
            providerThreadId: parsed.providerThreadId,
            providerMessageId: parsed.providerMessageId,
            externalId: parsed.externalId,
            externalUrl: parsed.externalUrl,
            idempotencyKey,
            metadata: parsed.metadata ?? {},
            occurredAt: parsed.occurredAt ? new Date(parsed.occurredAt) : undefined
          })
          .returning();
        return created;
      });
    },

    async listLeadActivities(leadId: string, limit = 100) {
      return db.query.activities.findMany({
        where: eq(activities.leadId, leadId),
        with: { person: true, company: true, task: true, assignment: true },
        orderBy: [desc(activities.occurredAt)],
        limit
      });
    },

    async listEventTypes() {
      return db.query.eventTypes.findMany({ orderBy: [desc(eventTypes.updatedAt)] });
    },

    async createEventType(input: unknown) {
      const parsed = z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
        durationMinutes: z.number().int().min(5),
        bufferBeforeMinutes: z.number().int().default(0),
        bufferAfterMinutes: z.number().int().default(0),
        bookingWindowDays: z.number().int().default(30)
      }).parse(input);

      const [created] = await db.insert(eventTypes).values(parsed).returning();
      return created;
    },

    async getAvailability(slug: string) {
      const eventType = await db.query.eventTypes.findFirst({
        where: eq(eventTypes.slug, slug)
      });

      if (!eventType) {
        throw new Error("event_type_not_found");
      }

      const now = new Date();
      const windowEnd = new Date(now.getTime() + eventType.bookingWindowDays * 24 * 60 * 60 * 1000);
      const existingBookings = await db.query.bookings.findMany({
        where: and(gte(bookings.startsAt, now), lte(bookings.startsAt, windowEnd))
      });

      const slots: Array<{ startsAt: string; endsAt: string }> = [];
      const durationMs = eventType.durationMinutes * 60 * 1000;
      const bufferBeforeMs = eventType.bufferBeforeMinutes * 60 * 1000;
      const bufferAfterMs = eventType.bufferAfterMinutes * 60 * 1000;

      for (let day = 0; day < eventType.bookingWindowDays && slots.length < 60; day += 1) {
        const date = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);
        const weekday = date.getUTCDay();
        if (weekday === 0 || weekday === 6) {
          continue;
        }

        for (let hour = 9; hour < 17 && slots.length < 60; hour += 1) {
          const startsAt = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour, 0, 0));
          const endsAt = new Date(startsAt.getTime() + durationMs);
          if (startsAt <= now) {
            continue;
          }

          const blocked = existingBookings.some((booking) => {
            const busyStart = new Date(booking.startsAt.getTime() - bufferBeforeMs);
            const busyEnd = new Date(booking.endsAt.getTime() + bufferAfterMs);
            return startsAt < busyEnd && endsAt > busyStart;
          });

          if (!blocked) {
            slots.push({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });
          }
        }
      }

      return {
        eventType,
        slots
      };
    },

    async createBooking(slug: string, input: unknown) {
      const parsed = z.object({
        startsAt: z.string().datetime(),
        attendeeName: z.string().min(1),
        attendeeEmail: z.string().email(),
        leadId: z.string().uuid().optional()
      }).parse(input);

      const eventType = await db.query.eventTypes.findFirst({ where: eq(eventTypes.slug, slug) });
      if (!eventType) {
        throw new Error("event_type_not_found");
      }

      const startsAt = new Date(parsed.startsAt);
      const endsAt = new Date(startsAt.getTime() + eventType.durationMinutes * 60 * 1000);

      return db.transaction(async (tx) => {
        const conflicts = await tx.query.bookings.findMany({
          where: and(gte(bookings.startsAt, startsAt), lte(bookings.startsAt, endsAt))
        });
        if (conflicts.length > 0) {
          throw new Error("slot_conflict");
        }

        const [booking] = await tx
          .insert(bookings)
          .values({
            eventTypeId: eventType.id,
            leadId: parsed.leadId,
            startsAt,
            endsAt,
            attendeeName: parsed.attendeeName,
            attendeeEmail: parsed.attendeeEmail
          })
          .returning();

        if (parsed.leadId && booking) {
          await tx.insert(activities).values({
            leadId: parsed.leadId,
            type: "meeting_booked",
            channel: "scheduler",
            direction: "internal",
            body: `Booked ${eventType.name} with ${parsed.attendeeName} at ${startsAt.toISOString()}`
          });
        }

        return booking;
      });
    },

    async getBackupHealth() {
      const latest = await db.query.backupRuns.findFirst({
        orderBy: [desc(backupRuns.startedAt)]
      });
      const stale =
        !latest?.finishedAt ||
        latest.status !== "succeeded" ||
        Date.now() - latest.finishedAt.getTime() > 26 * 60 * 60 * 1000;

      return {
        required: backupsRequired,
        latestStatus: latest?.status ?? (backupsRequired ? "missing" : "not_configured"),
        latestFinishedAt: latest?.finishedAt ?? null,
        degraded: backupsRequired && stale
      };
    },

    async recordAgentAction(input: {
      agentId?: string | undefined;
      toolName: string;
      inputJson?: unknown;
      resultJson?: unknown;
      approvalId?: string | undefined;
      status: string;
    }) {
      const [created] = await db
        .insert(agentActions)
        .values({
          agentId: input.agentId,
          toolName: input.toolName,
          inputJson: input.inputJson ?? {},
          resultJson: input.resultJson ?? {},
          approvalId: input.approvalId,
          status: input.status
        })
        .returning();
      return created;
    },

    async createApproval(input: unknown) {
      const parsed = z.object({
        agentId: z.string().uuid().optional(),
        operation: z.string().min(1),
        reason: z.string().optional(),
        payloadJson: z.unknown().default({})
      }).parse(input);

      const [created] = await db
        .insert(approvals)
        .values({
          agentId: parsed.agentId,
          operation: parsed.operation,
          reason: parsed.reason,
          payloadJson: parsed.payloadJson
        })
        .returning();
      return created;
    },

    async listBookings() {
      return db.query.bookings.findMany({ orderBy: [desc(bookings.startsAt)] });
    }
  };
}

export type CrmServices = ReturnType<typeof createCrmServices>;
