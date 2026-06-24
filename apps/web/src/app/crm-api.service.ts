import { Injectable } from "@angular/core";
import {
  EventRow,
  HealthResponse,
  JobSearchSetupInput,
  JobSearchSetupSummary,
  JobWorkflowResponse,
  LeadEditForm,
  LeadRow,
  TaskEditForm,
  TaskRow,
  ViewDefinition,
  ViewRunOptions,
  ViewRunResult,
  WorkspaceBootstrap,
  WorkspaceLayout,
  XrmObjectType,
  XrmRecord,
  XrmRecordInput
} from "./models";

@Injectable({ providedIn: "root" })
export class CrmApiService {
  private readonly recordListCache = new Map<string, { expiresAt: number; records: XrmRecord[] }>();

  async health() {
    return this.request<HealthResponse>("/api/health");
  }

  async workspaceBootstrap() {
    return this.request<WorkspaceBootstrap>("/api/workspace/bootstrap");
  }

  async listLeads() {
    return this.request<LeadRow[]>("/api/leads");
  }

  async getLead(id: string) {
    return this.request<LeadRow>(`/api/leads/${id}`);
  }

  async getLeadActivities(id: string) {
    return this.request<EventRow[]>(`/api/leads/${id}/activities`);
  }

  async createLead(input: Partial<LeadEditForm>) {
    return this.request<LeadRow>("/api/leads", {
      method: "POST",
      body: JSON.stringify(cleanPayload(input))
    });
  }

  async updateLead(id: string, input: LeadEditForm) {
    return this.request<LeadRow>(`/api/leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(cleanPayload(input))
    });
  }

  async listTasks() {
    return this.request<TaskRow[]>("/api/tasks");
  }

  async createTask(input: Partial<TaskRow>) {
    return this.request<TaskRow>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(cleanPayload(input))
    });
  }

  async listDueTasks() {
    return this.request<TaskRow[]>("/api/assignments/due");
  }

  async updateTask(id: string, input: TaskEditForm) {
    return this.request<TaskRow>(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...cleanPayload(input),
        priority: Number(input.priority) || 0,
        dueAt: input.dueAt ? new Date(input.dueAt).toISOString() : null
      })
    });
  }

  async listEvents() {
    return this.request<EventRow[]>("/api/events?limit=50");
  }

  async listViews(templateKey?: string) {
    const query = new URLSearchParams({ limit: "100" });
    if (templateKey) {
      query.set("templateKey", templateKey);
    }
    return this.request<ViewDefinition[]>(`/api/views?${query.toString()}`);
  }

  async getWorkspace(templateKey = "job_search") {
    return this.request<WorkspaceLayout>(`/api/xrm/workspace?templateKey=${encodeURIComponent(templateKey)}`);
  }

  async runView(key: string, options: ViewRunOptions | number = {}) {
    const normalized = typeof options === "number" ? { limit: options } : options;
    const query = new URLSearchParams({ limit: String(normalized.limit ?? 100) });
    if (normalized.q) {
      query.set("q", normalized.q);
    }
    if (normalized.sort) {
      query.set("sort", normalized.sort);
      query.set("dir", normalized.dir ?? "asc");
    }
    if (normalized.filters?.length) {
      query.set("filters", JSON.stringify(normalized.filters));
    }
    return this.request<ViewRunResult>(`/api/views/${encodeURIComponent(key)}/run?${query.toString()}`);
  }

  async listObjectTypes(templateKey?: string) {
    const query = new URLSearchParams({ active: "true", limit: "100" });
    if (templateKey) {
      query.set("templateKey", templateKey);
    }
    return this.request<XrmObjectType[]>(`/api/xrm/object-types?${query.toString()}`);
  }

  async listXrmRecords(input: { objectType?: string; q?: string; includeDeleted?: boolean; limit?: number } = {}) {
    const query = new URLSearchParams({ limit: String(input.limit ?? 100) });
    if (input.objectType) {
      query.set("objectType", input.objectType);
    }
    if (input.q) {
      query.set("q", input.q);
    }
    if (input.includeDeleted) {
      query.set("includeDeleted", "true");
    }
    const cacheable = (input.objectType === "cv_version" || input.objectType === "cover_letter") && !input.q && !input.includeDeleted;
    const cacheKey = query.toString();
    const cached = cacheable ? this.recordListCache.get(cacheKey) : undefined;
    if (cached && cached.expiresAt > Date.now()) return cached.records;
    const records = await this.request<XrmRecord[]>(`/api/xrm/records?${query.toString()}`);
    if (cacheable) this.recordListCache.set(cacheKey, { expiresAt: Date.now() + 30_000, records });
    return records;
  }

  async getXrmRecord(id: string) {
    return this.request<XrmRecord>(`/api/xrm/records/${encodeURIComponent(id)}`);
  }

  async getJobWorkflow(id: string) {
    return this.request<JobWorkflowResponse>(`/api/jobs/${encodeURIComponent(id)}/workflow`);
  }

  async runJobAction(id: string, action: string, input: Record<string, unknown> = {}) {
    return this.request<JobWorkflowResponse>(`/api/jobs/${encodeURIComponent(id)}/actions`, {
      method: "POST",
      body: JSON.stringify({ action, ...input })
    });
  }

  async getJobSearchSetup() {
    return this.request<JobSearchSetupSummary>("/api/setup/job-search");
  }

  async configureJobSearchSetup(input: JobSearchSetupInput) {
    return this.request<JobSearchSetupSummary>("/api/setup/job-search", {
      method: "POST",
      body: JSON.stringify(cleanPayload(input))
    });
  }

  async createXrmRecord(input: XrmRecordInput) {
    const record = await this.request<XrmRecord>("/api/xrm/records", {
      method: "POST",
      body: JSON.stringify(cleanPayload(input))
    });
    this.recordListCache.clear();
    return record;
  }

  async updateXrmRecord(input: XrmRecordInput) {
    const record = await this.request<XrmRecord>("/api/xrm/records", {
      method: "POST",
      body: JSON.stringify(cleanPayload(input))
    });
    this.recordListCache.clear();
    return record;
  }

  async deleteXrmRecord(id: string) {
    const result = await this.request<{ deleted: boolean; recordId: string }>(`/api/xrm/records/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    this.recordListCache.clear();
    return result;
  }

  async createXrmRelationship(input: {
    relationshipType: string;
    sourceRecordId: string;
    targetRecordId: string;
    source?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.request("/api/xrm/relationships", {
      method: "POST",
      body: JSON.stringify(cleanPayload(input))
    });
  }

  async selectApplicationDocument(input: {
    applicationId: string;
    kind: "cv" | "cover_letter";
    documentId: string | null;
    metadata?: Record<string, unknown>;
    source?: string;
  }) {
    const { applicationId, ...body } = input;
    return this.request<XrmRecord>(`/api/applications/${encodeURIComponent(applicationId)}/document`, {
      method: "PUT",
      // `null` is meaningful here: it explicitly unlinks the current document.
      body: JSON.stringify(body)
    });
  }

  private async request<T>(path: string, init: RequestInit = {}) {
    const response = await fetch(path, {
      ...init,
      headers: {
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers
      }
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { message?: string; code?: string; error?: string } | null;
      const detail = payload?.message || payload?.code || payload?.error || response.statusText;
      throw new Error(`${response.status} ${detail}`.trim());
    }

    return response.json() as Promise<T>;
  }
}

function cleanPayload(input: object) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}
