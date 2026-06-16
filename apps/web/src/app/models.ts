export interface Metric {
  label: string;
  value: string;
  tone: "neutral" | "good" | "warn";
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
  leadId?: string | null;
  lead?: LeadRow | null;
  person?: { id: string; fullName: string } | null;
  company?: { id: string; name: string } | null;
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
  taskId?: string | null;
  lead?: LeadRow | null;
  task?: TaskRow | null;
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
  isDefault: boolean;
}

export interface ViewRunResult {
  view: ViewDefinition;
  total: number;
  returned: number;
  rows: Array<Record<string, unknown>>;
}

export type NavItem = "Dashboard" | "Views" | "Leads" | "Tasks" | "Events" | "Settings";
export type TaskStatus = "open" | "in_progress" | "blocked" | "done" | "canceled";
export type TaskType = "outreach" | "follow_up" | "research" | "data_cleanup" | "approval" | "manual";

export type DetailSelection =
  | { kind: "lead"; item: LeadRow }
  | { kind: "task"; item: TaskRow }
  | { kind: "event"; item: EventRow };

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
}
