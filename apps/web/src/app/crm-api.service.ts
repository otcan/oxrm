import { Injectable } from "@angular/core";
import { EventRow, HealthResponse, LeadEditForm, LeadRow, TaskEditForm, TaskRow, ViewDefinition, ViewRunResult } from "./models";

@Injectable({ providedIn: "root" })
export class CrmApiService {
  async health() {
    return this.request<HealthResponse>("/api/health");
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

  async runView(key: string, limit = 100) {
    return this.request<ViewRunResult>(`/api/views/${encodeURIComponent(key)}/run?limit=${limit}`);
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
