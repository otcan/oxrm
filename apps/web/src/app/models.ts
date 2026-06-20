export interface Metric {
  label: string;
  value: string;
  tone: "neutral" | "good" | "warn";
}

export type WorkspaceMode = "job_search" | "outreach";

export interface NavDefinition {
  label: NavItem;
  path: string;
}

export interface WorkspaceUiConfig {
  mode: WorkspaceMode;
  nav: NavDefinition[];
  primaryAction: {
    label: string;
    objectType: string;
  };
  terminology: Record<string, string>;
  stages: string[];
  routes: Record<string, string>;
}

export interface WorkspaceBootstrap {
  mode: WorkspaceMode;
  label: string;
  templateKey: WorkspaceMode;
}

export interface ProductActionItem {
  kind: "task" | "suggestion" | "application" | "lead";
  id: string;
  title: string;
  context: string;
  dueAt?: string | null | undefined;
  badge?: string | undefined;
  sortDate: number;
  sortBucket: number;
}

export interface ProductStageGroup {
  label: string;
  rows: Array<Record<string, unknown>>;
}

export interface OutreachPipelineRow extends Record<string, unknown> {
  id: string;
  name: string;
  role: string;
  company: string;
  stage: string;
  nextAction: string;
  lastContact: string;
  channel: string;
  badges: string[];
  record: XrmRecord;
}

export interface OutreachPersonRow {
  id: string;
  name: string;
  role: string;
  company: string;
  lastContact: string;
  activeOutreach: number;
  record: XrmRecord;
}

export interface OutreachCompanyRow {
  id: string;
  company: string;
  domain: string;
  activePeople: number;
  activeLeads: number;
  lastContact: string;
  nextAction: string;
  record: XrmRecord;
}

export interface LeadRow {
  id: string;
  fullName: string;
  company?: string | null;
  title?: string | null;
  linkedinUrl?: string | null;
  salesnavUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  source?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt: string;
  tasks?: TaskRow[];
}

export interface TaskRow {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  type: TaskType;
  priority: number;
  dueAt?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  leadId?: string | null;
  personId?: string | null;
  companyId?: string | null;
  assignmentId?: string | null;
  xrmRecordId?: string | null;
  lead?: LeadRow | null;
  person?: { id: string; fullName: string } | null;
  company?: { id: string; name: string } | null;
  xrmRecord?: Pick<XrmRecord, "id" | "displayName" | "externalKey" | "fields" | "metadata"> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface EventRow {
  id: string;
  type: string;
  channel: string;
  direction: string;
  subject?: string | null;
  body?: string | null;
  providerThreadId?: string | null;
  providerMessageId?: string | null;
  externalId?: string | null;
  externalUrl?: string | null;
  metadata?: EventMetadata | null;
  occurredAt: string;
  leadId?: string | null;
  personId?: string | null;
  companyId?: string | null;
  taskId?: string | null;
  xrmRecordId?: string | null;
  lead?: LeadRow | null;
  task?: TaskRow | null;
  person?: { id: string; fullName: string } | null;
  company?: { id: string; name: string } | null;
  xrmRecord?: Pick<XrmRecord, "id" | "displayName" | "externalKey" | "fields" | "metadata"> | null;
}

export interface EventMetadata extends Record<string, unknown> {
  noteStatus?: "confirmed_sent" | "no_note" | "unconfirmed";
  proposedNote?: string;
  linkedinResult?: string;
  sourceQuery?: string;
  searchPage?: number;
  auditDirectory?: string;
  rowText?: string;
  profileUrl?: string;
  nextActionKind?: string;
}

export interface ViewDefinition {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  objectType: string;
  templateKey?: string | null;
  layout: "table" | "cards" | "timeline";
  columns: string[];
  filters: Array<Record<string, unknown>>;
  sort: Array<Record<string, unknown>>;
  groupBy?: string | null;
  placement?: "summary" | "main" | "secondary" | "sidebar" | "hidden";
  displayOrder?: number;
  audience?: "default" | "power" | "hidden" | "mcp";
  visibleWhen?: Record<string, unknown>;
  isDefault: boolean;
}

export interface ViewRunResult {
  view: ViewDefinition;
  total: number;
  returned: number;
  rows: Array<ViewRow>;
}

export interface ViewRow extends Record<string, unknown> {
  _links?: {
    self?: {
      kind: DetailSelection["kind"] | "person" | "company";
      id: string;
      objectType?: string;
    };
  };
}

export interface ViewRunOptions {
  q?: string;
  sort?: string;
  dir?: "asc" | "desc";
  filters?: Array<Record<string, unknown>>;
  limit?: number;
}

export interface XrmObjectType {
  id: string;
  slug: string;
  label: string;
  pluralLabel?: string | null;
  displayField: string;
  templateKey?: string | null;
  fields?: Array<{
    key: string;
    label: string;
    dataType: string;
    required?: boolean;
    indexed?: boolean;
    searchable?: boolean;
    displayOrder?: number;
    summaryRank?: number | null;
    isPrimary?: boolean;
    options?: Array<Record<string, unknown>>;
    config?: Record<string, unknown>;
  }>;
  fieldMappings?: XrmFieldMapping[];
}

export interface XrmRecordInput {
  objectType: string;
  recordId?: string;
  displayName?: string;
  externalKey?: string;
  fields: Record<string, unknown>;
  status?: string;
  source?: string;
  metadata?: Record<string, unknown> | null;
}

export interface XrmFieldMapping {
  id: string;
  fieldKey: string;
  confidence: number;
  semanticField?: {
    key: string;
    label: string;
    dataType: string;
  } | null;
}

export interface XrmRelationshipRow {
  id: string;
  relationshipType?: { key: string; label: string; inverseLabel?: string | null } | null;
  sourceRecord?: Pick<XrmRecord, "id" | "displayName" | "objectType"> | null;
  targetRecord?: Pick<XrmRecord, "id" | "displayName" | "objectType"> | null;
}

export interface XrmRecord {
  id: string;
  objectType?: XrmObjectType | null;
  displayName: string;
  externalKey?: string | null;
  fields: Record<string, unknown>;
  status: string;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
  sourceRelationships?: XrmRelationshipRow[];
  targetRelationships?: XrmRelationshipRow[];
  files?: XrmFile[];
  tasks?: TaskRow[];
  activities?: EventRow[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface XrmFile {
  id: string;
  recordId: string;
  kind: string;
  title: string;
  path: string;
  mimeType?: string | null;
  size?: number | null;
  checksum?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface WorkspaceLayout {
  mode?: WorkspaceMode;
  label?: string;
  templateKey?: WorkspaceMode;
  template: {
    key: string;
    label: string;
  };
  objectTypes: XrmObjectType[];
  summary: Array<{ key: string; label: string; objectType: string; value: number }>;
  views: {
    summary: ViewRunResult[];
    main: ViewRunResult[];
    secondary: ViewRunResult[];
    sidebar: ViewRunResult[];
  };
}

export type NavItem =
  | "Today"
  | "Applications"
  | "Jobs"
  | "Contacts"
  | "Pipeline"
  | "People"
  | "Companies"
  | "Settings"
  | "Advanced"
  | "Views"
  | "Records"
  | "Start"
  | "Dashboard"
  | "Workspace"
  | "Queue"
  | "Timeline";
export type TaskStatus = "open" | "in_progress" | "blocked" | "done" | "canceled";
export type TaskType = "outreach" | "follow_up" | "research" | "data_cleanup" | "approval" | "manual";

export type DetailSelection =
  | { kind: "lead"; item: LeadRow }
  | { kind: "task"; item: TaskRow }
  | { kind: "event"; item: EventRow }
  | { kind: "record"; item: XrmRecord };

export interface LeadEditForm {
  fullName: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  salesnavUrl: string;
  source: string;
  notes: string;
}

export interface TaskEditForm {
  title: string;
  description: string;
  status: TaskStatus;
  type: TaskType;
  priority: number;
  dueAt: string;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  backup?: {
    required: boolean;
    latestStatus: string;
    latestFinishedAt: string | null;
    degraded: boolean;
  };
}
