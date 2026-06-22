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
    return this.request<XrmRecord[]>(`/api/xrm/records?${query.toString()}`);
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
    return this.request<XrmRecord>("/api/xrm/records", {
      method: "POST",
      body: JSON.stringify(cleanPayload(input))
    });
  }

  async updateXrmRecord(input: XrmRecordInput) {
    return this.request<XrmRecord>("/api/xrm/records", {
      method: "POST",
      body: JSON.stringify(cleanPayload(input))
    });
  }

  async deleteXrmRecord(id: string) {
    return this.request<{ deleted: boolean; recordId: string }>(`/api/xrm/records/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  }

  private async request<T>(path: string, init: RequestInit = {}) {
    const response = await fetch(path, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...init.headers
      }
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`.trim());
    }

    return response.json() as Promise<T>;
  }
}

function cleanPayload(input: object) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}
