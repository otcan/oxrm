import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AppShellComponent } from "./app-shell.component";
import { CrmApiService } from "./crm-api.service";
import { DetailDrawerComponent } from "./detail-drawer.component";
import { JobApplicationsPageComponent } from "./job-applications-page.component";
import { JobContactRow, JobContactsPageComponent } from "./job-contacts-page.component";
import { JobJobsPageComponent } from "./job-jobs-page.component";
import { OutreachCompaniesPageComponent } from "./outreach-companies-page.component";
import { OutreachPeoplePageComponent } from "./outreach-people-page.component";
import { OutreachPipelinePageComponent } from "./outreach-pipeline-page.component";
import { SettingsPageComponent } from "./settings-page.component";
import { TodayPageComponent } from "./today-page.component";
import {
  DetailSelection,
  EventRow,
  HealthResponse,
  LeadEditForm,
  LeadRow,
  Metric,
  NavDefinition,
  NavItem,
  OutreachCompanyRow,
  OutreachPersonRow,
  OutreachPipelineRow,
  ProductActionItem,
  ProductStageGroup,
  TaskEditForm,
  TaskRow,
  ViewDefinition,
  ViewRow,
  ViewRunResult,
  WorkspaceBootstrap,
  WorkspaceMode,
  WorkspaceUiConfig,
  XrmObjectType,
  XrmRecord,
  XrmRecordInput
} from "./models";

const JOB_NAV: NavDefinition[] = [
  { label: "Today", path: "/today" },
  { label: "Applications", path: "/applications" },
  { label: "Jobs", path: "/jobs" },
  { label: "Contacts", path: "/contacts" }
];

const OUTREACH_NAV: NavDefinition[] = [
  { label: "Today", path: "/today" },
  { label: "Pipeline", path: "/pipeline" },
  { label: "People", path: "/people" },
  { label: "Companies", path: "/companies" }
];

@Component({
  selector: "oc-root",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppShellComponent,
    DetailDrawerComponent,
    JobApplicationsPageComponent,
    JobContactsPageComponent,
    JobJobsPageComponent,
    OutreachCompaniesPageComponent,
    OutreachPeoplePageComponent,
    OutreachPipelinePageComponent,
    SettingsPageComponent,
    TodayPageComponent
  ],
  templateUrl: "./app.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  private readonly api = inject(CrmApiService);
  private readonly router = inject(Router);

  readonly workspaceMode = signal<WorkspaceMode>("job_search");
  readonly selectedNav = signal<NavItem>(this.inferInitialNav());
  readonly backupHealth = signal<"ok" | "degraded" | "optional">("optional");
  readonly queue = signal<TaskRow[]>([]);
  readonly tasks = signal<TaskRow[]>([]);
  readonly events = signal<EventRow[]>([]);
  readonly views = signal<ViewDefinition[]>([]);
  readonly objectTypes = signal<XrmObjectType[]>([]);
  readonly jobApplications = signal<ViewRunResult | null>(null);
  readonly jobJobs = signal<ViewRunResult | null>(null);
  readonly jobInterviews = signal<ViewRunResult | null>(null);
  readonly jobContacts = signal<XrmRecord[]>([]);
  readonly outreachLeadRecords = signal<XrmRecord[]>([]);
  readonly outreachPeopleRecords = signal<XrmRecord[]>([]);
  readonly outreachCompanyRecords = signal<XrmRecord[]>([]);
  readonly selectedDetail = signal<DetailSelection | null>(null);
  readonly leadActivities = signal<EventRow[]>([]);
  readonly detailLoading = signal(false);
  readonly detailError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly recordCreateOpen = signal(false);
  readonly recordForm = signal<Record<string, string>>({});
  readonly selectedRecordObjectType = signal<string | null>(null);
  readonly applicationSearch = signal("");
  readonly applicationStageFilter = signal("all");
  readonly jobSearch = signal("");
  readonly jobMatchFilter = signal("all");
  readonly contactSearch = signal("");
  readonly pipelineSearch = signal("");
  readonly pipelineStageFilter = signal("all");
  readonly peopleSearch = signal("");
  readonly companySearch = signal("");
  readonly pendingRecordId = signal(this.inferInitialRecordId());

  readonly uiConfig = computed<WorkspaceUiConfig>(() => {
    if (this.workspaceMode() === "outreach") {
      return {
        mode: "outreach",
        nav: OUTREACH_NAV,
        primaryAction: { label: "+ Add lead", objectType: "lead" },
        terminology: {
          lead: "Lead",
          nextAction: "Next action",
          activity: "Activity"
        },
        stages: ["New", "Preparing", "Contacted", "Engaged", "Closed"],
        routes: {
          Today: "/today",
          Pipeline: "/pipeline",
          People: "/people",
          Companies: "/companies",
          Settings: "/settings",
          Advanced: "/settings/advanced"
        }
      };
    }

    return {
      mode: "job_search",
      nav: JOB_NAV,
      primaryAction: { label: "+ Add application", objectType: "application" },
      terminology: {
        lead: "Application",
        nextAction: "Next action",
        activity: "Communication"
      },
      stages: ["Saved", "Preparing", "Applied", "Interviewing", "Closed"],
      routes: {
        Today: "/today",
        Applications: "/applications",
        Jobs: "/jobs",
        Contacts: "/contacts",
        Settings: "/settings",
        Advanced: "/settings/advanced"
      }
    };
  });

  readonly navItems = computed(() => this.uiConfig().nav);
  readonly primaryActionLabel = computed(() => this.uiConfig().primaryAction.label);
  readonly sideDetailSelection = computed(() => this.selectedDetail());
  readonly selectedRecordId = computed(() => {
    const selected = this.selectedDetail();
    return selected?.kind === "record" ? selected.item.id : "";
  });

  readonly visibleQueue = computed(() =>
    this.queue().filter((task) => !this.isSmokeTask(task) && this.belongsToActiveTemplate("task", task))
  );
  readonly visibleTasks = computed(() =>
    this.tasks().filter((task) => !this.isSmokeTask(task) && task.status !== "done" && this.belongsToActiveTemplate("task", task))
  );
  readonly visibleEvents = computed(() =>
    this.events().filter((event) => !this.isSmokeEvent(event) && this.belongsToActiveTemplate("event", event))
  );

  readonly jobApplicationRows = computed(() => this.jobApplications()?.rows ?? []);
  readonly jobRows = computed(() => this.jobJobs()?.rows ?? []);
  readonly jobInterviewRows = computed(() => this.jobInterviews()?.rows ?? []);

  readonly filteredApplicationRows = computed(() => {
    const query = this.applicationSearch().trim().toLowerCase();
    const stage = this.applicationStageFilter();
    return this.jobApplicationRows().filter((row) => {
      const stageBucket = this.applicationStageBucket(row["stage"]);
      const matchesStage = stage === "all" || stageBucket === stage;
      const text = `${this.rowText(row, "role")} ${this.rowText(row, "company")} ${this.rowText(row, "responsiblePerson")}`.toLowerCase();
      return matchesStage && (!query || text.includes(query));
    });
  });

  readonly applicationStageGroups = computed<ProductStageGroup[]>(() => {
    const rows = this.filteredApplicationRows();
    return ["Saved", "Preparing", "Applied", "Interviewing", "Closed"].map((label) => ({
      label,
      rows: rows.filter((row) => this.applicationStageBucket(row["stage"]) === label)
    }));
  });

  readonly filteredJobRows = computed(() => {
    const query = this.jobSearch().trim().toLowerCase();
    const match = this.jobMatchFilter();
    return this.jobRows().filter((row) => {
      const text = `${this.rowText(row, "title")} ${this.rowText(row, "company")} ${this.rowText(row, "location")} ${this.rowText(row, "platform")}`.toLowerCase();
      const matchBucket = this.matchBucket(row);
      return (!query || text.includes(query)) && (match === "all" || matchBucket === match);
    });
  });

  readonly contactRows = computed<JobContactRow[]>(() => {
    const applicationsByContact = new Map<string, ViewRow[]>();
    for (const row of this.jobApplicationRows()) {
      const name = this.rowText(row, "responsiblePerson", "").trim();
      if (!name) continue;
      const list = applicationsByContact.get(name) ?? [];
      list.push(row);
      applicationsByContact.set(name, list);
    }

    const records = this.jobContacts().map((record) => {
      const linked = applicationsByContact.get(record.displayName) ?? [];
      const latest = linked
        .map((row) => (typeof row["lastTouchAt"] === "string" ? row["lastTouchAt"] : null))
        .filter(Boolean)
        .sort()
        .at(-1);
      return {
        id: record.id,
        name: record.displayName,
        title: this.recordField(record, "title", "Recruiting contact"),
        company: linked[0] ? this.rowText(linked[0], "company") : this.recordField(record, "company", "Unknown company"),
        lastContact: latest,
        linkedApplications: linked.length,
        fallbackApplicationId: linked[0] ? this.rowText(linked[0], "id") : undefined
      };
    });

    const existingNames = new Set(records.map((record) => record.name));
    const derived = [...applicationsByContact.entries()]
      .filter(([name]) => !existingNames.has(name))
      .map(([name, linked]) => ({
        name,
        title: "Recruiting contact",
        company: this.rowText(linked[0] ?? {}, "company", "Unknown company"),
        lastContact: linked
          .map((row) => (typeof row["lastTouchAt"] === "string" ? row["lastTouchAt"] : null))
          .filter(Boolean)
          .sort()
          .at(-1),
        linkedApplications: linked.length,
        fallbackApplicationId: linked[0] ? this.rowText(linked[0], "id") : undefined
      }));

    const query = this.contactSearch().trim().toLowerCase();
    return [...records, ...derived]
      .filter((contact) => `${contact.name} ${contact.title} ${contact.company}`.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly outreachPipelineRows = computed<OutreachPipelineRow[]>(() =>
    this.outreachLeadRecords()
      .map((record) => {
        const stage = this.outreachStage(this.recordField(record, "stage", this.recordField(record, "status", "new")));
        const lastContact = this.dateField(record, "lastContactAt", this.lastEventDate(record.id) || "Not contacted");
        return {
          id: record.id,
          name: this.recordField(record, "fullName", record.displayName),
          role: this.recordField(record, "title", this.recordField(record, "role", "Contact")),
          company: this.recordField(record, "company", "Unknown company"),
          stage,
          nextAction: this.recordField(record, "nextAction", "Decide next step"),
          lastContact,
          channel: this.humanLabel(this.recordField(record, "channel", "linkedin")),
          badges: this.outreachBadges(record),
          record
        };
      })
      .sort((a, b) => this.stageIndex(a.stage) - this.stageIndex(b.stage) || a.name.localeCompare(b.name))
  );

  readonly filteredOutreachPipelineRows = computed(() => {
    const query = this.pipelineSearch().trim().toLowerCase();
    const stage = this.pipelineStageFilter();
    return this.outreachPipelineRows().filter((row) => {
      const text = `${row.name} ${row.company} ${row.role} ${row.nextAction}`.toLowerCase();
      return (stage === "all" || row.stage === stage) && (!query || text.includes(query));
    });
  });

  readonly outreachPipelineGroups = computed<ProductStageGroup[]>(() => {
    const rows = this.filteredOutreachPipelineRows();
    return this.uiConfig().stages.map((label) => ({
      label,
      rows: rows.filter((row) => row.stage === label)
    }));
  });

  readonly outreachPeopleRows = computed<OutreachPersonRow[]>(() => {
    const leads = this.outreachPipelineRows();
    const rows = this.outreachPeopleRecords().map((record) => {
      const name = this.recordField(record, "fullName", record.displayName);
      const activeOutreach = leads.filter((lead) => lead.name === name && lead.stage !== "Closed").length;
      return {
        id: record.id,
        name,
        role: this.recordField(record, "title", "Contact"),
        company: this.recordField(record, "company", "Unknown company"),
        lastContact: this.dateField(record, "lastContactAt", this.lastEventDate(record.id) || "Not contacted"),
        activeOutreach,
        record
      };
    });
    const existing = new Set(rows.map((row) => row.name));
    const derived = leads
      .filter((lead) => !existing.has(lead.name))
      .map((lead) => ({
        id: lead.id,
        name: lead.name,
        role: lead.role,
        company: lead.company,
        lastContact: lead.lastContact,
        activeOutreach: lead.stage === "Closed" ? 0 : 1,
        record: lead.record
      }));
    return [...rows, ...derived].sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly filteredOutreachPeopleRows = computed(() => {
    const query = this.peopleSearch().trim().toLowerCase();
    return this.outreachPeopleRows().filter((row) => `${row.name} ${row.company} ${row.role}`.toLowerCase().includes(query));
  });

  readonly outreachCompanyRows = computed<OutreachCompanyRow[]>(() => {
    const leads = this.outreachPipelineRows();
    const rows = this.outreachCompanyRecords().map((record) => {
      const company = this.recordField(record, "name", record.displayName);
      const companyLeads = leads.filter((lead) => lead.company === company);
      return {
        id: record.id,
        company,
        domain: this.recordField(record, "domain", ""),
        activePeople: new Set(companyLeads.map((lead) => lead.name)).size,
        activeLeads: companyLeads.filter((lead) => lead.stage !== "Closed").length,
        lastContact: this.dateField(record, "lastContactAt", companyLeads.map((lead) => lead.lastContact).find((value) => value !== "Not contacted") ?? "Not contacted"),
        nextAction: companyLeads[0]?.nextAction ?? "Add a next action",
        record
      };
    });
    const existing = new Set(rows.map((row) => row.company));
    const derived = [...new Set(leads.map((lead) => lead.company))]
      .filter((company) => !existing.has(company))
      .map((company) => {
        const companyLeads = leads.filter((lead) => lead.company === company);
        return {
          id: companyLeads[0]?.id ?? company,
          company,
          domain: "",
          activePeople: new Set(companyLeads.map((lead) => lead.name)).size,
          activeLeads: companyLeads.filter((lead) => lead.stage !== "Closed").length,
          lastContact: companyLeads.map((lead) => lead.lastContact).find((value) => value !== "Not contacted") ?? "Not contacted",
          nextAction: companyLeads[0]?.nextAction ?? "Add a next action",
          record: companyLeads[0]?.record as XrmRecord
        };
      });
    return [...rows, ...derived].sort((a, b) => a.company.localeCompare(b.company));
  });

  readonly filteredOutreachCompanyRows = computed(() => {
    const query = this.companySearch().trim().toLowerCase();
    return this.outreachCompanyRows().filter((row) => `${row.company} ${row.domain} ${row.nextAction}`.toLowerCase().includes(query));
  });

  readonly outreachPipelineSummary = computed(() => {
    const rows = this.outreachPipelineRows();
    return {
      active: rows.filter((row) => row.stage !== "Closed").length,
      waiting: rows.filter((row) => row.stage === "Contacted").length,
      engaged: rows.filter((row) => row.stage === "Engaged").length
    };
  });

  readonly outreachRecentlyEngaged = computed<ViewRow[]>(() =>
    this.visibleEvents()
      .filter((event) => event.direction === "inbound" || event.type === "message_received" || event.type === "connection_accepted")
      .slice(0, 2)
      .map((event) => ({
        id: event.id,
        subject: event.subject || this.humanLabel(event.type),
        occurredLabel: this.formatDate(event.occurredAt, "date")
      }))
  );

  readonly jobTodayActions = computed<ProductActionItem[]>(() => {
    const taskItems = this.visibleQueue().map((task) => this.taskActionItem(task));
    const applicationItems = this.jobApplicationRows()
      .filter((row) => this.rowText(row, "nextActionAt") !== "-")
      .map((row) => ({
        kind: "application" as const,
        id: this.rowText(row, "id"),
        title: this.rowText(row, "nextAction", "Review next application step"),
        context: `${this.rowText(row, "role")} at ${this.rowText(row, "company")}`,
        dueAt: typeof row["nextActionAt"] === "string" ? row["nextActionAt"] : null,
        sortDate: this.sortDate(row["nextActionAt"]),
        sortBucket: this.dueBucket(row["nextActionAt"])
      }));
    return this.sortedUniqueActions([...taskItems, ...applicationItems]).slice(0, 5);
  });

  readonly outreachTodayActions = computed<ProductActionItem[]>(() => {
    const taskItems = this.visibleQueue().map((task) => this.taskActionItem(task));
    const leadItems = this.outreachLeadRecords()
      .filter((record) => this.recordField(record, "nextActionAt", "") !== "")
      .map((record) => {
        const dueAt = this.recordField(record, "nextActionAt", "");
        return {
          kind: "lead" as const,
          id: record.id,
          title: this.recordField(record, "nextAction", "Review next outreach action"),
          context: `${this.recordField(record, "fullName", record.displayName)} at ${this.recordField(record, "company", "Unknown company")}`,
          dueAt,
          badge: this.recordField(record, "draftStatus", "") === "proposed" ? "Draft ready" : undefined,
          sortDate: this.sortDate(dueAt),
          sortBucket: this.dueBucket(dueAt)
        };
      });
    return this.sortedUniqueActions([...taskItems, ...leadItems]).slice(0, 5);
  });

  readonly todayActions = computed(() => (this.workspaceMode() === "outreach" ? this.outreachTodayActions() : this.jobTodayActions()));

  readonly todaySummary = computed<Metric[]>(() => {
    if (this.workspaceMode() === "outreach") {
      const due = this.outreachTodayActions().filter((item) => item.sortBucket <= 1).length;
      const summary = this.outreachPipelineSummary();
      return [
        { label: "Due today", value: String(due), tone: due ? "warn" : "good" },
        { label: "Active leads", value: String(summary.active), tone: "neutral" },
        { label: "Waiting for reply", value: String(summary.waiting), tone: summary.waiting ? "warn" : "neutral" }
      ];
    }

    return [
      {
        label: "Due today",
        value: String(this.jobTodayActions().filter((item) => item.sortBucket <= 1).length),
        tone: this.jobTodayActions().some((item) => item.sortBucket <= 1) ? "warn" : "good"
      },
      {
        label: "Active applications",
        value: String(this.jobApplicationRows().filter((row) => this.applicationStageBucket(row["stage"]) !== "Closed").length),
        tone: "neutral"
      },
      {
        label: "Interviews",
        value: String(this.jobInterviewRows().length),
        tone: this.jobInterviewRows().length ? "good" : "neutral"
      }
    ];
  });

  readonly upcomingInterview = computed(() => {
    const now = Date.now();
    return [...this.jobInterviewRows()]
      .filter((row) => this.sortDate(row["scheduledAt"]) >= now)
      .sort((a, b) => this.sortDate(a["scheduledAt"]) - this.sortDate(b["scheduledAt"]))[0] ?? this.jobInterviewRows()[0] ?? null;
  });

  readonly applicationCounts = computed(() => {
    const rows = this.jobApplicationRows();
    return {
      active: rows.filter((row) => this.applicationStageBucket(row["stage"]) !== "Closed").length,
      waiting: rows.filter((row) => String(row["stage"] ?? "").toLowerCase().includes("applied")).length,
      interviewing: rows.filter((row) => this.applicationStageBucket(row["stage"]) === "Interviewing").length
    };
  });

  readonly selectedObjectType = computed(() => {
    const slug = this.selectedRecordObjectType();
    return this.objectTypes().find((objectType) => objectType.slug === slug) ?? null;
  });

  readonly createFields = computed(() => {
    const objectType = this.selectedObjectType();
    if (!objectType) return [];
    if (this.workspaceMode() === "outreach" && objectType.slug === "lead") {
      return [
        { key: "fullName", label: "Name", required: true },
        { key: "company", label: "Company" },
        { key: "title", label: "Role" },
        { key: "linkedinUrl", label: "Profile URL" },
        { key: "email", label: "Email" },
        { key: "source", label: "Source" },
        { key: "channel", label: "Preferred channel" },
        { key: "notes", label: "Notes" }
      ];
    }
    return objectType.fields ?? [];
  });

  readonly subtitle = computed(() => {
    const mode = this.workspaceMode();
    switch (this.selectedNav()) {
      case "Today":
        return mode === "outreach"
          ? "Who should I contact or follow up with now?"
          : "What needs attention now, what is coming up, and where each application stands.";
      case "Applications":
        return "Track each application by stage, contact, fit, and next action.";
      case "Jobs":
        return "Review saved roles and decide which opportunities are worth applying to.";
      case "Contacts":
        return "Recruiters, hiring managers, and warm contacts linked to applications.";
      case "Pipeline":
        return "Move leads from new to prepared, contacted, engaged, or closed.";
      case "People":
        return "People involved in current outreach, with last touch and active work.";
      case "Companies":
        return "Accounts and organizations connected to your active outreach.";
      case "Advanced":
        return "Schema, saved views, recent activity, and administration details.";
      case "Settings":
        return "Instance health and local runtime status.";
      default:
        return "Self-hosted outreach workspace.";
    }
  });

  constructor() {
    this.applyWorkspaceModeMetadata(this.workspaceMode());
    void this.refresh();
  }

  async refresh() {
    const bootstrap = await this.api.workspaceBootstrap().catch(() => this.fallbackBootstrap());
    this.workspaceMode.set(bootstrap.mode);
    this.applyWorkspaceModeMetadata(bootstrap.mode);
    this.ensureAllowedNav();

    const templateKey = bootstrap.templateKey;
    const [
      health,
      queue,
      tasks,
      events,
      views,
      objectTypes,
      jobApplications,
      jobJobs,
      jobInterviews,
      jobContacts,
      outreachLeads,
      outreachPeople,
      outreachCompanies
    ] = await Promise.all([
      this.api.health().catch(() => ({ status: "degraded" as const, backup: { required: true } } as HealthResponse)),
      this.api.listDueTasks().catch(() => []),
      this.api.listTasks().catch(() => []),
      this.api.listEvents().catch(() => []),
      this.api.listViews(templateKey).catch(() => []),
      this.api.listObjectTypes(templateKey).catch(() => []),
      templateKey === "job_search" ? this.api.runView("job_search.applications").catch(() => null) : Promise.resolve(null),
      templateKey === "job_search" ? this.api.runView("job_search.jobs").catch(() => null) : Promise.resolve(null),
      templateKey === "job_search" ? this.api.runView("job_search.interviews").catch(() => null) : Promise.resolve(null),
      templateKey === "job_search" ? this.api.listXrmRecords({ objectType: "job_contact", limit: 100 }).catch(() => []) : Promise.resolve([]),
      this.api.listXrmRecords({ objectType: "lead", limit: 100 }).catch(() => []),
      this.api.listXrmRecords({ objectType: "person", limit: 100 }).catch(() => []),
      this.api.listXrmRecords({ objectType: "company", limit: 100 }).catch(() => [])
    ]);

    this.backupHealth.set(health.backup?.required === false ? "optional" : health.status === "ok" ? "ok" : "degraded");
    this.queue.set(queue);
    this.tasks.set(tasks);
    this.events.set(events);
    this.views.set(views);
    this.objectTypes.set(objectTypes);
    this.jobApplications.set(jobApplications);
    this.jobJobs.set(jobJobs);
    this.jobInterviews.set(jobInterviews);
    this.jobContacts.set(jobContacts);
    this.outreachLeadRecords.set(outreachLeads.filter((record) => this.recordBelongsToMode(record, "outreach")));
    this.outreachPeopleRecords.set(outreachPeople.filter((record) => this.recordBelongsToMode(record, "outreach")));
    this.outreachCompanyRecords.set(outreachCompanies.filter((record) => this.recordBelongsToMode(record, "outreach")));

    if (!this.selectedRecordObjectType()) {
      this.selectedRecordObjectType.set(this.uiConfig().primaryAction.objectType);
    }

    const pending = this.pendingRecordId();
    if (pending) {
      this.pendingRecordId.set(null);
      await this.selectRecordById(pending, false);
    }
    this.syncSelectedFromLists();
  }

  selectNav(item: NavItem) {
    if (!this.isAllowedNav(item)) {
      item = "Today";
    }
    this.selectedNav.set(item);
    void this.navigateToNav(item);
  }

  selectSettings() {
    this.selectNav("Settings");
  }

  startCreatePrimary() {
    this.startCreateRecord(this.uiConfig().primaryAction.objectType);
  }

  startCreateRecord(slug: string) {
    this.selectedRecordObjectType.set(slug);
    this.openCreateRecord();
  }

  openCreateRecord() {
    const objectType = this.selectedObjectType();
    if (!objectType) return;
    this.recordForm.set(Object.fromEntries(this.createFields().map((field) => [field.key, ""])));
    this.recordCreateOpen.set(true);
  }

  closeCreateRecord() {
    this.recordCreateOpen.set(false);
    this.recordForm.set({});
    this.saveError.set(null);
  }

  setRecordField(key: string, value: string) {
    this.recordForm.update((form) => ({ ...form, [key]: value }));
  }

  async createRecord() {
    const objectType = this.selectedObjectType();
    if (!objectType) return;
    const fields = Object.fromEntries(Object.entries(this.recordForm()).filter(([, value]) => value.trim() !== ""));
    const displayName = String(fields[objectType.displayField] ?? fields["fullName"] ?? fields["title"] ?? fields["name"] ?? fields["company"] ?? "Record");
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const created = await this.api.createXrmRecord({
        objectType: objectType.slug,
        displayName,
        fields,
        source: "web",
        metadata: { templateKey: this.workspaceMode(), draftOnly: this.workspaceMode() === "outreach" }
      });
      if (this.workspaceMode() === "outreach" && objectType.slug === "lead") {
        await this.createDraftOnlyTask(created, "research");
      }
      this.closeCreateRecord();
      await this.refresh();
      await this.selectRecordById(created.id);
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : "Could not create record.");
    } finally {
      this.saving.set(false);
    }
  }

  async createFollowUpForRecord(record: XrmRecord) {
    this.saving.set(true);
    this.saveError.set(null);
    try {
      await this.createDraftOnlyTask(record, "follow_up");
      await this.refresh();
      await this.selectRecordById(record.id, false);
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : "Could not create follow-up.");
    } finally {
      this.saving.set(false);
    }
  }

  async markDraftApproved(record: XrmRecord) {
    await this.updateRecordFields(record, { draftStatus: "approved" });
  }

  async dismissDraft(record: XrmRecord) {
    await this.updateRecordFields(record, { draftStatus: "rejected" });
  }

  async resetDraft(record: XrmRecord) {
    await this.updateRecordFields(record, { draftStatus: "proposed" });
  }

  async saveXrmRecord(input: XrmRecordInput) {
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const updated = await this.api.updateXrmRecord(input);
      await this.refresh();
      await this.selectRecordById(updated.id, false);
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : "Could not save record.");
    } finally {
      this.saving.set(false);
    }
  }

  async saveLead(form: LeadEditForm) {
    const selected = this.selectedDetail();
    if (selected?.kind !== "lead") return;
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const updated = await this.api.updateLead(selected.item.id, form);
      await this.selectLead({ ...selected.item, ...updated });
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : "Could not save lead.");
    } finally {
      this.saving.set(false);
    }
  }

  async saveTask(form: TaskEditForm) {
    const selected = this.selectedDetail();
    if (selected?.kind !== "task") return;
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const updated = await this.api.updateTask(selected.item.id, form);
      this.selectedDetail.set({ kind: "task", item: { ...selected.item, ...updated } });
      await this.refresh();
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : "Could not save task.");
    } finally {
      this.saving.set(false);
    }
  }

  async selectLead(lead: LeadRow) {
    this.selectedDetail.set({ kind: "lead", item: lead });
    this.leadActivities.set([]);
    this.detailError.set(null);
    this.saveError.set(null);
    this.detailLoading.set(true);
    try {
      const [detail, activities] = await Promise.all([this.api.getLead(lead.id), this.api.getLeadActivities(lead.id)]);
      this.selectedDetail.set({ kind: "lead", item: detail });
      this.leadActivities.set(activities);
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

  async selectRecordById(id: string, syncUrl = true) {
    this.detailLoading.set(true);
    this.detailError.set(null);
    this.saveError.set(null);
    try {
      const record = await this.api.getXrmRecord(id);
      this.selectedDetail.set({ kind: "record", item: record });
      if (record.objectType?.slug) {
        this.selectedRecordObjectType.set(record.objectType.slug);
      }
      if (syncUrl) {
        await this.navigate(this.recordRoute(record));
      }
    } catch (error) {
      this.detailError.set(error instanceof Error ? error.message : "Could not load record detail.");
    } finally {
      this.detailLoading.set(false);
    }
  }

  closeDetail() {
    this.selectedDetail.set(null);
    this.leadActivities.set([]);
    this.detailError.set(null);
    this.saveError.set(null);
    const selected = this.selectedNav();
    if (selected !== "Settings" && selected !== "Advanced") {
      void this.navigateToNav(selected);
    }
  }

  isSelected(kind: DetailSelection["kind"], id: string) {
    const selected = this.selectedDetail();
    return selected?.kind === kind && selected.item.id === id;
  }

  async openTodayAction(item: ProductActionItem) {
    if (item.kind === "task") {
      const task = this.tasks().find((candidate) => candidate.id === item.id) ?? this.queue().find((candidate) => candidate.id === item.id);
      if (task?.xrmRecordId) {
        await this.selectRecordById(task.xrmRecordId);
        return;
      }
      if (task) {
        this.selectTask(task);
      }
      return;
    }
    await this.selectRecordById(item.id);
  }

  openTodaySecondary() {
    this.selectNav(this.workspaceMode() === "outreach" ? "Pipeline" : "Applications");
  }

  async openUpcomingInterview() {
    const interview = this.upcomingInterview();
    if (interview) {
      await this.selectRecordRow(interview);
    }
  }

  openRecentActivity(row: ViewRow) {
    const event = this.events().find((item) => item.id === row["id"]);
    if (event) {
      this.selectEvent(event);
    }
  }

  async selectRecordRow(row: Record<string, unknown>) {
    const id = typeof row["id"] === "string" ? row["id"] : undefined;
    if (id) {
      await this.selectRecordById(id);
    }
  }

  async openContact(contact: JobContactRow) {
    if (contact.id) {
      await this.selectRecordById(contact.id);
    } else if (contact.fallbackApplicationId) {
      await this.selectRecordById(contact.fallbackApplicationId);
    }
  }

  async openOutreachPipeline(row: OutreachPipelineRow) {
    await this.selectRecordById(row.record.id);
  }

  async openOutreachPerson(row: OutreachPersonRow) {
    await this.selectRecordById(row.record.id);
  }

  async openOutreachCompany(row: OutreachCompanyRow) {
    await this.selectRecordById(row.record.id);
  }

  setApplicationSearch(value: string) {
    this.applicationSearch.set(value);
  }

  setApplicationStageFilter(value: string) {
    this.applicationStageFilter.set(value);
  }

  setJobSearch(value: string) {
    this.jobSearch.set(value);
  }

  setJobMatchFilter(value: string) {
    this.jobMatchFilter.set(value);
  }

  setContactSearch(value: string) {
    this.contactSearch.set(value);
  }

  setPipelineSearch(value: string) {
    this.pipelineSearch.set(value);
  }

  setPipelineStageFilter(value: string) {
    this.pipelineStageFilter.set(value);
  }

  setPeopleSearch(value: string) {
    this.peopleSearch.set(value);
  }

  setCompanySearch(value: string) {
    this.companySearch.set(value);
  }

  rowText(row: Record<string, unknown>, key: string, fallback = "-") {
    const value = row[key];
    if (value === undefined || value === null || value === "") return fallback;
    return typeof value === "object" ? JSON.stringify(value) : String(value);
  }

  rowDate(row: Record<string, unknown>, key: string) {
    const value = row[key];
    return typeof value === "string" && value ? this.formatDate(value, "date") : "-";
  }

  applicationStageBucket(value: unknown) {
    const stage = String(value || "").toLowerCase();
    if (stage.includes("reject") || stage.includes("archive") || stage.includes("closed")) return "Closed";
    if (stage.includes("interview") || stage.includes("intro")) return "Interviewing";
    if (stage.includes("applied") || stage.includes("waiting")) return "Applied";
    if (stage.includes("fit") || stage.includes("draft") || stage.includes("prep") || stage.includes("contact")) return "Preparing";
    return "Saved";
  }

  matchBucket(row: Record<string, unknown>) {
    const value = Number(row["fitRate"] ?? 0);
    if (!Number.isFinite(value) || !value) return "not";
    if (value >= 85) return "strong";
    if (value >= 65) return "possible";
    return "weak";
  }

  recordField(record: XrmRecord, key: string, fallback = "-") {
    const value = record.fields?.[key];
    if (value === undefined || value === null || value === "") return fallback;
    return typeof value === "object" ? JSON.stringify(value) : String(value);
  }

  dateField(record: XrmRecord, key: string, fallback = "-") {
    const value = this.recordField(record, key, "");
    if (!value) return fallback;
    return this.formatDate(value, value.includes("T") ? "datetime" : "date");
  }

  private async createDraftOnlyTask(record: XrmRecord, type: "research" | "follow_up") {
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + (type === "follow_up" ? 1 : 0));
    await this.api.createTask({
      title: type === "follow_up" ? `Follow up with ${record.displayName}` : `Research and prepare first message: ${record.displayName}`,
      description:
        type === "follow_up"
          ? "Review the relationship context, prepare a draft-only follow-up, and wait for human approval."
          : "Check context, prepare a draft-only first message, and wait for human approval.",
      type,
      status: "open",
      priority: type === "follow_up" ? 3 : 2,
      dueAt: dueAt.toISOString(),
      xrmRecordId: record.id,
      idempotencyKey: `web:outreach:${type}:${record.id}`,
      metadata: { templateKey: "outreach", source: "web", draftOnly: true }
    });
  }

  private async updateRecordFields(record: XrmRecord, fields: Record<string, unknown>) {
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const updated = await this.api.updateXrmRecord({
        objectType: record.objectType?.slug ?? "lead",
        recordId: record.id,
        displayName: record.displayName,
        fields: { ...record.fields, ...fields },
        status: record.status,
        source: record.source ?? "web",
        metadata: record.metadata ?? null
      });
      await this.refresh();
      await this.selectRecordById(updated.id, false);
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : "Could not update record.");
    } finally {
      this.saving.set(false);
    }
  }

  private taskActionItem(task: TaskRow): ProductActionItem {
    return {
      kind: "task",
      id: task.id,
      title: task.title.replace(/^Next action:\s*/i, ""),
      context: this.taskTarget(task),
      dueAt: task.dueAt ?? null,
      badge: task.type === "approval" ? "Needs review" : undefined,
      sortDate: this.sortDate(task.dueAt),
      sortBucket: this.dueBucket(task.dueAt)
    };
  }

  private sortedUniqueActions(items: ProductActionItem[]) {
    const unique = new Map<string, ProductActionItem>();
    for (const item of items) {
      unique.set(`${item.kind}:${item.kind === "task" ? item.context : item.id}:${item.title}`, item);
    }
    return [...unique.values()].sort((a, b) => a.sortBucket - b.sortBucket || a.sortDate - b.sortDate || a.title.localeCompare(b.title));
  }

  private taskTarget(task: TaskRow) {
    return task.lead?.fullName || task.person?.fullName || task.company?.name || task.xrmRecord?.displayName || this.humanLabel(task.type);
  }

  private outreachBadges(record: XrmRecord) {
    return [
      this.recordField(record, "channel", "") ? this.humanLabel(this.recordField(record, "channel")) : undefined,
      this.recordField(record, "warmIntro", "") === "true" ? "Warm intro" : undefined,
      this.recordField(record, "draftStatus", "") === "proposed" ? "Needs review" : undefined
    ].filter((value): value is string => Boolean(value));
  }

  private outreachStage(value: unknown) {
    const stage = String(value ?? "").toLowerCase();
    if (["new"].includes(stage)) return "New";
    if (stage.includes("prepar") || stage.includes("research") || stage.includes("queued") || stage.includes("context")) return "Preparing";
    if (stage.includes("contact") || stage.includes("sent") || stage.includes("waiting") || stage.includes("messaged")) return "Contacted";
    if (stage.includes("engaged") || stage.includes("reply") || stage.includes("replied") || stage.includes("connected") || stage.includes("meeting")) return "Engaged";
    if (stage.includes("closed") || stage.includes("won") || stage.includes("lost") || stage.includes("do_not")) return "Closed";
    return this.uiConfig().stages.includes(String(value)) ? String(value) : "New";
  }

  private stageIndex(stage: string) {
    const index = this.uiConfig().stages.indexOf(stage);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  }

  private lastEventDate(recordId: string) {
    const event = this.events()
      .filter((item) => item.xrmRecordId === recordId)
      .sort((a, b) => this.sortDate(b.occurredAt) - this.sortDate(a.occurredAt))[0];
    return event ? this.formatDate(event.occurredAt, "date") : "";
  }

  private recordBelongsToMode(record: XrmRecord, mode: WorkspaceMode) {
    const metadata = record.metadata ?? {};
    if (metadata["templateKey"] === mode) return true;
    if (mode === "outreach" && metadata["scenario"] === "linkedin-outreach") return true;
    if (mode === "job_search" && metadata["scenario"] === "job-search") return true;
    return record.objectType?.templateKey === mode;
  }

  private templateForTask(task: TaskRow) {
    const metadata = task.metadata ?? {};
    const recordMetadata = task.xrmRecord?.metadata ?? {};
    const idempotencyKey = task.idempotencyKey ?? "";
    if (metadata["templateKey"] === "outreach" || metadata["scenario"] === "linkedin-outreach" || String(metadata["source"] ?? "").includes("outreach")) {
      return "outreach";
    }
    if (metadata["templateKey"] === "job_search" || recordMetadata["templateKey"] === "job_search" || idempotencyKey.startsWith("job-search:")) {
      return "job_search";
    }
    if (task.leadId || task.lead) return "outreach";
    return undefined;
  }

  private templateForEvent(event: EventRow) {
    const metadata = event.metadata ?? {};
    const recordMetadata = event.xrmRecord?.metadata ?? {};
    const key = `${event.externalId ?? ""} ${event.providerThreadId ?? ""}`;
    if (metadata["templateKey"] === "outreach" || metadata["scenario"] === "linkedin-outreach" || String(metadata["source"] ?? "").includes("outreach")) {
      return "outreach";
    }
    if (metadata["templateKey"] === "job_search" || recordMetadata["templateKey"] === "job_search" || key.includes("job-search:")) {
      return "job_search";
    }
    if (event.leadId || event.lead) return "outreach";
    return undefined;
  }

  private belongsToActiveTemplate(kind: "task" | "event", item: TaskRow | EventRow) {
    const template = kind === "task" ? this.templateForTask(item as TaskRow) : this.templateForEvent(item as EventRow);
    return template === undefined || template === this.workspaceMode();
  }

  private isSmokeTask(task: TaskRow) {
    const text = `${task.title} ${task.description ?? ""}`.toLowerCase();
    return text.includes("cli smoke") || text.includes("db smoke");
  }

  private isSmokeEvent(event: EventRow) {
    const text = `${event.subject ?? ""} ${event.body ?? ""} ${event.lead?.fullName ?? ""}`.toLowerCase();
    return text.includes("cli smoke") || text.includes("db smoke");
  }

  private isAllowedNav(item: NavItem) {
    return item === "Settings" || item === "Advanced" || this.uiConfig().nav.some((nav) => nav.label === item);
  }

  private ensureAllowedNav() {
    if (this.isAllowedNav(this.selectedNav())) return;
    this.selectedNav.set("Today");
    void this.navigateToNav("Today");
  }

  private async navigateToNav(item: NavItem) {
    const path = this.uiConfig().routes[item] ?? "/today";
    await this.navigate(path);
  }

  private async navigate(path: string) {
    await this.router.navigateByUrl(path);
  }

  private recordRoute(record: XrmRecord) {
    const slug = record.objectType?.slug;
    const path =
      slug === "lead"
        ? "/pipeline"
        : slug === "person"
          ? "/people"
          : slug === "company"
            ? "/companies"
            : slug === "application"
              ? "/applications"
              : slug === "job"
                ? "/jobs"
                : slug === "job_contact"
                  ? "/contacts"
                  : "/settings/advanced";
    return `${path}?record=${encodeURIComponent(record.id)}`;
  }

  private fallbackBootstrap(): WorkspaceBootstrap {
    return {
      mode: "job_search",
      label: "Job Search",
      templateKey: "job_search"
    };
  }

  private applyWorkspaceModeMetadata(mode: WorkspaceMode) {
    if (typeof document === "undefined") return;
    document.documentElement.dataset["oxrmMode"] = mode;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="oxrm-workspace-mode"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "oxrm-workspace-mode";
      document.head.appendChild(meta);
    }
    meta.content = mode;
  }

  private inferInitialNav(): NavItem {
    if (typeof window === "undefined") return "Today";
    const path = window.location.pathname;
    if (path.startsWith("/pipeline") || path === "/records/lead") return "Pipeline";
    if (path.startsWith("/people") || path === "/records/person") return "People";
    if (path.startsWith("/companies") || path === "/records/company") return "Companies";
    if (path.startsWith("/applications") || path === "/records/application") return "Applications";
    if (path.startsWith("/jobs") || path === "/records/job") return "Jobs";
    if (path.startsWith("/contacts") || path === "/records/job_contact") return "Contacts";
    if (path.startsWith("/settings/advanced") || path.startsWith("/views") || path.startsWith("/records") || path.startsWith("/timeline")) return "Advanced";
    if (path.startsWith("/settings")) return "Settings";
    return "Today";
  }

  private inferInitialRecordId() {
    if (typeof window === "undefined") return null;
    const queryRecord = new URLSearchParams(window.location.search).get("record");
    if (queryRecord) return queryRecord;
    const match = window.location.pathname.match(/^\/records\/[^/]+\/([^/]+)/);
    return match ? decodeURIComponent(match[1] ?? "") : null;
  }

  private sortDate(value: unknown) {
    if (typeof value !== "string" || !value) return Number.MAX_SAFE_INTEGER;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
  }

  private dueBucket(value: unknown) {
    const timestamp = this.sortDate(value);
    if (timestamp === Number.MAX_SAFE_INTEGER) return 3;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    if (timestamp < start.getTime()) return 0;
    if (timestamp < end.getTime()) return 1;
    return 2;
  }

  private formatDate(value: string, mode: "date" | "datetime") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return mode === "datetime"
      ? date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
      : date.toLocaleDateString([], { dateStyle: "medium" });
  }

  private humanLabel(value: unknown) {
    const text = String(value ?? "").trim();
    if (!text) return "-";
    if (text.toLowerCase() === "linkedin") return "LinkedIn";
    return text
      .replace(/[_.-]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private syncSelectedFromLists() {
    const selected = this.selectedDetail();
    if (!selected || selected.kind === "lead") return;
    if (selected.kind === "task") {
      const task = this.tasks().find((item) => item.id === selected.item.id) ?? this.queue().find((item) => item.id === selected.item.id);
      if (task) this.selectedDetail.set({ kind: "task", item: task });
    }
    if (selected.kind === "event") {
      const event = this.events().find((item) => item.id === selected.item.id);
      if (event) this.selectedDetail.set({ kind: "event", item: event });
    }
  }
}
