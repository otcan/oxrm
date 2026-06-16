import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CrmApiService } from "./crm-api.service";
import { DetailPanelComponent } from "./detail-panel.component";
import {
  DetailSelection,
  EventRow,
  LeadEditForm,
  LeadRow,
  Metric,
  NavItem,
  TaskEditForm,
  TaskRow,
  ViewDefinition,
  ViewRunResult
} from "./models";

@Component({
  selector: "oc-root",
  standalone: true,
  imports: [CommonModule, DetailPanelComponent, FormsModule],
  templateUrl: "./app.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  private readonly api = inject(CrmApiService);

  readonly navItems: NavItem[] = ["Dashboard", "Views", "Leads", "Tasks", "Events", "Settings"];
  readonly selectedNav = signal<NavItem>("Dashboard");
  readonly backupHealth = signal<"ok" | "degraded">("degraded");
  readonly leads = signal<LeadRow[]>([]);
  readonly tasks = signal<TaskRow[]>([]);
  readonly queue = signal<TaskRow[]>([]);
  readonly events = signal<EventRow[]>([]);
  readonly views = signal<ViewDefinition[]>([]);
  readonly selectedViewKey = signal<string | null>(null);
  readonly viewResult = signal<ViewRunResult | null>(null);
  readonly viewLoading = signal(false);
  readonly viewError = signal<string | null>(null);
  readonly selectedDetail = signal<DetailSelection | null>(null);
  readonly leadActivities = signal<EventRow[]>([]);
  readonly detailLoading = signal(false);
  readonly detailError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly leadForm = {
    fullName: "",
    company: "",
    email: "",
    linkedinUrl: ""
  };

  readonly metrics = computed<Metric[]>(() => [
    { label: "Due tasks", value: String(this.queue().length), tone: this.queue().length ? "warn" : "good" },
    { label: "Active leads", value: String(this.leads().length), tone: "neutral" },
    { label: "Open tasks", value: String(this.tasks().filter((task) => task.status === "open").length), tone: "neutral" },
    { label: "Events", value: String(this.events().length), tone: "good" }
  ]);

  readonly selectedView = computed(() => this.views().find((view) => view.key === this.selectedViewKey()) ?? this.views()[0] ?? null);
  readonly visibleViewRows = computed(() => this.viewResult()?.rows ?? []);
  readonly visibleViewColumns = computed(() => this.viewResult()?.view.columns ?? this.selectedView()?.columns ?? []);

  readonly subtitle = computed(() => {
    switch (this.selectedNav()) {
      case "Dashboard":
        return "oXRM state at a glance: due work, recent records, and event timeline.";
      case "Views":
        return "Configured table views over generic object types and template-owned records.";
      case "Leads":
        return "Identity-resolved people and company workflow records.";
      case "Tasks":
        return "Actionable CRM work owned by this instance.";
      case "Events":
        return "Append-only timeline for messages, emails, connection requests, notes, and meetings.";
      case "Settings":
        return "Instance health and Docker runtime status.";
    }
  });

  constructor() {
    void this.refresh();
  }

  selectNav(item: NavItem) {
    this.selectedNav.set(item);
    if (item === "Views" && !this.viewResult()) {
      void this.runSelectedView();
    }
  }

  async refresh() {
    const [health, leads, queue, tasks, events, views] = await Promise.all([
      this.api.health().catch(() => ({ status: "degraded" as const })),
      this.api.listLeads().catch(() => []),
      this.api.listDueTasks().catch(() => []),
      this.api.listTasks().catch(() => []),
      this.api.listEvents().catch(() => []),
      this.api.listViews().catch(() => [])
    ]);

    this.backupHealth.set(health.status === "ok" ? "ok" : "degraded");
    this.leads.set(leads);
    this.queue.set(queue);
    this.tasks.set(tasks);
    this.events.set(events);
    this.views.set(views);
    if (!this.selectedViewKey() && views.length > 0) {
      this.selectedViewKey.set(views[0]?.key ?? null);
    }
    if (this.selectedViewKey() && (!this.viewResult() || this.selectedNav() === "Views")) {
      await this.runSelectedView();
    }
    this.syncSelectedFromLists();
  }

  selectView(view: ViewDefinition) {
    this.selectedViewKey.set(view.key);
    this.selectedNav.set("Views");
    void this.runSelectedView();
  }

  async runSelectedView() {
    const key = this.selectedViewKey() ?? this.views()[0]?.key;
    if (!key) {
      return;
    }

    this.viewLoading.set(true);
    this.viewError.set(null);
    try {
      this.viewResult.set(await this.api.runView(key));
    } catch (error) {
      this.viewError.set(error instanceof Error ? error.message : "Could not run view.");
    } finally {
      this.viewLoading.set(false);
    }
  }

  async createLead() {
    if (!this.leadForm.fullName.trim()) {
      return;
    }

    await this.api.createLead({
      fullName: this.leadForm.fullName,
      company: this.leadForm.company,
      email: this.leadForm.email,
      linkedinUrl: this.leadForm.linkedinUrl,
      source: "web"
    });

    this.leadForm.fullName = "";
    this.leadForm.company = "";
    this.leadForm.email = "";
    this.leadForm.linkedinUrl = "";
    await this.refresh();
  }

  async selectLead(lead: LeadRow) {
    this.selectedDetail.set({ kind: "lead", item: lead });
    this.leadActivities.set([]);
    this.detailError.set(null);
    this.saveError.set(null);
    this.detailLoading.set(true);

    try {
      const [detail, activities] = await Promise.all([this.api.getLead(lead.id), this.api.getLeadActivities(lead.id)]);
      if (this.selectedDetail()?.kind === "lead" && this.selectedDetail()?.item.id === lead.id) {
        this.selectedDetail.set({ kind: "lead", item: detail });
        this.leadActivities.set(activities);
      }
    } catch (error) {
      this.detailError.set(error instanceof Error ? error.message : "Could not load lead detail.");
    } finally {
      this.detailLoading.set(false);
    }
  }

  selectTask(task: TaskRow) {
    this.selectedDetail.set({ kind: "task", item: task });
    this.leadActivities.set([]);
    this.detailError.set(null);
    this.saveError.set(null);
  }

  selectEvent(event: EventRow) {
    this.selectedDetail.set({ kind: "event", item: event });
    this.leadActivities.set([]);
    this.detailError.set(null);
    this.saveError.set(null);
  }

  closeDetail() {
    this.selectedDetail.set(null);
    this.leadActivities.set([]);
    this.detailError.set(null);
    this.saveError.set(null);
  }

  isSelected(kind: DetailSelection["kind"], id: string) {
    const selected = this.selectedDetail();
    return selected?.kind === kind && selected.item.id === id;
  }

  eventTitle(event: EventRow) {
    if (event.subject) {
      return event.subject;
    }
    const leadName = event.lead?.fullName;
    if ((event.type === "connection_sent" || event.type === "connection_request_sent") && leadName) {
      return `Connection request sent: ${leadName}`;
    }
    return event.type.replaceAll("_", " ");
  }

  eventSubtitle(event: EventRow) {
    const metadata = event.metadata ?? {};
    return [
      event.channel,
      event.direction,
      event.lead?.fullName,
      metadata.noteStatus ? `note ${String(metadata.noteStatus).replaceAll("_", " ")}` : undefined,
      metadata.sourceQuery ? `query ${metadata.sourceQuery}` : undefined,
      event.taskId ? "task linked" : "task unlinked"
    ]
      .filter(Boolean)
      .join(" · ");
  }

  eventSnippet(event: EventRow) {
    const metadata = event.metadata ?? {};
    const text = event.body || metadata.proposedNote || metadata.rowText || metadata.linkedinResult || "";
    return this.truncate(String(text), 150);
  }

  columnLabel(column: string) {
    return column
      .replace(/^fields\./, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_.-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  viewCell(row: Record<string, unknown>, column: string) {
    const value = column.split(".").reduce<unknown>((current, segment) => {
      if (!current || typeof current !== "object") {
        return undefined;
      }
      return (current as Record<string, unknown>)[segment];
    }, row);

    if (value === undefined || value === null || value === "") {
      return "-";
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return new Date(value).toLocaleString();
    }
    return String(value);
  }

  private truncate(value: string, maxLength: number) {
    const compacted = value.trim().replace(/\s+/g, " ");
    return compacted.length > maxLength ? `${compacted.slice(0, maxLength - 1)}...` : compacted;
  }

  async saveLead(form: LeadEditForm) {
    const selected = this.selectedDetail();
    if (selected?.kind !== "lead") {
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    try {
      const updated = await this.api.updateLead(selected.item.id, form);
      this.leads.update((items) => items.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      await this.selectLead({ ...selected.item, ...updated });
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : "Could not save lead.");
    } finally {
      this.saving.set(false);
    }
  }

  async saveTask(form: TaskEditForm) {
    const selected = this.selectedDetail();
    if (selected?.kind !== "task") {
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    try {
      const updated = await this.api.updateTask(selected.item.id, form);
      this.tasks.update((items) => items.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      this.queue.update((items) => items.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      this.selectedDetail.set({ kind: "task", item: { ...selected.item, ...updated } });
      await this.refresh();
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : "Could not save task.");
    } finally {
      this.saving.set(false);
    }
  }

  private syncSelectedFromLists() {
    const selected = this.selectedDetail();
    if (!selected || selected.kind === "lead") {
      return;
    }

    if (selected.kind === "task") {
      const task = this.tasks().find((item) => item.id === selected.item.id) ?? this.queue().find((item) => item.id === selected.item.id);
      if (task) {
        this.selectedDetail.set({ kind: "task", item: task });
      }
    }

    if (selected.kind === "event") {
      const event = this.events().find((item) => item.id === selected.item.id);
      if (event) {
        this.selectedDetail.set({ kind: "event", item: event });
      }
    }
  }
}
