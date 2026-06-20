import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { CrmApiService } from "./crm-api.service";
import { DetailPanelComponent } from "./detail-panel.component";
import { XrmRecordDetailComponent } from "./xrm-record-detail.component";
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
  ViewRow,
  ViewRunResult,
  WorkspaceLayout,
  XrmObjectType,
  XrmRecord,
  XrmRecordInput
} from "./models";

interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  status: string;
  complete: boolean;
  actionLabel: string;
  viewKey?: string;
  nav?: NavItem;
}

interface NextActionItem {
  kind: "task" | "suggestion" | "application";
  id: string;
  title: string;
  context: string;
  dueAt: string | null | undefined;
  badge?: string | undefined;
  sortDate: number;
  sortBucket: number;
}

interface ContactSummary {
  id?: string | undefined;
  name: string;
  title: string;
  company: string;
  lastContact: string | null | undefined;
  linkedApplications: number;
  fallbackApplicationId: string | undefined;
}

@Component({
  selector: "oc-root",
  standalone: true,
  imports: [CommonModule, DetailPanelComponent, FormsModule, XrmRecordDetailComponent],
  templateUrl: "./app.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  private readonly api = inject(CrmApiService);
  private readonly router = inject(Router);
  private readonly legacyViewObjectTypes = new Set(["lead", "person", "company", "task", "event"]);

  readonly navItems: NavItem[] = ["Today", "Applications", "Jobs", "Contacts"];
  readonly selectedNav = signal<NavItem>(this.inferInitialNav());
  readonly activeTemplateKey = signal(this.inferInitialTemplateKey());
  readonly backupHealth = signal<"ok" | "degraded" | "optional">("optional");
  readonly leads = signal<LeadRow[]>([]);
  readonly tasks = signal<TaskRow[]>([]);
  readonly queue = signal<TaskRow[]>([]);
  readonly events = signal<EventRow[]>([]);
  readonly views = signal<ViewDefinition[]>([]);
  readonly objectTypes = signal<XrmObjectType[]>([]);
  readonly workspaceLayout = signal<WorkspaceLayout | null>(null);
  readonly selectedViewKey = signal<string | null>(this.inferInitialViewKey());
  readonly viewSearch = signal(this.initialQueryParam("q"));
  readonly viewSortField = signal(this.initialQueryParam("sort"));
  readonly viewSortDirection = signal<"asc" | "desc">(this.initialQueryParam("dir") === "desc" ? "desc" : "asc");
  readonly columnFilters = signal<Record<string, string>>(this.inferInitialColumnFilters());
  readonly viewResult = signal<ViewRunResult | null>(null);
  readonly jobApplications = signal<ViewRunResult | null>(null);
  readonly jobAlerts = signal<ViewRunResult | null>(null);
  readonly jobJobs = signal<ViewRunResult | null>(null);
  readonly jobInterviews = signal<ViewRunResult | null>(null);
  readonly jobReferrals = signal<ViewRunResult | null>(null);
  readonly jobCvVersions = signal<ViewRunResult | null>(null);
  readonly jobCoverLetters = signal<ViewRunResult | null>(null);
  readonly jobContacts = signal<XrmRecord[]>([]);
  readonly actionBlueprints = signal<ViewRunResult | null>(null);
  readonly actionSuggestions = signal<ViewRunResult | null>(null);
  readonly setupPlaybook = signal<ViewRunResult | null>(null);
  readonly viewLoading = signal(false);
  readonly viewError = signal<string | null>(null);
  readonly selectedDetail = signal<DetailSelection | null>(null);
  readonly leadActivities = signal<EventRow[]>([]);
  readonly detailLoading = signal(false);
  readonly detailError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly records = signal<XrmRecord[]>([]);
  readonly recordsLoading = signal(false);
  readonly recordsError = signal<string | null>(null);
  readonly recordSearch = signal("");
  readonly selectedRecordObjectType = signal<string | null>(this.inferInitialRecordObjectType());
  readonly recordCreateOpen = signal(false);
  readonly recordForm = signal<Record<string, string>>({});
  readonly pendingRecordId = signal(this.inferInitialRecordId());
  readonly copiedPrompt = signal<string | null>(null);
  readonly onboardingAutoRouted = signal(false);
  readonly applicationSearch = signal("");
  readonly applicationStageFilter = signal("all");
  readonly jobSearch = signal("");
  readonly jobMatchFilter = signal("all");
  readonly contactSearch = signal("");
  readonly leadForm = {
    fullName: "",
    company: "",
    email: "",
    linkedinUrl: ""
  };

  readonly overdueTasks = computed(() => {
    const now = Date.now();
    return this.visibleTasks().filter((task) => task.status !== "done" && task.dueAt && new Date(task.dueAt).getTime() < now);
  });
  readonly approvalTasks = computed(() => this.visibleTasks().filter((task) => task.status !== "done" && task.type === "approval"));
  readonly openFollowUps = computed(() => this.visibleTasks().filter((task) => task.status !== "done" && task.type === "follow_up"));
  readonly visibleQueue = computed(() =>
    this.queue().filter((task) => !this.isSmokeTask(task) && this.belongsToActiveTemplate("task", task))
  );
  readonly visibleTasks = computed(() =>
    this.tasks().filter((task) => !this.isSmokeTask(task) && task.status !== "done" && this.belongsToActiveTemplate("task", task))
  );
  readonly visibleEvents = computed(() =>
    this.events().filter((event) => !this.isSmokeEvent(event) && this.belongsToActiveTemplate("event", event))
  );
  readonly actionBlueprintRows = computed(() => this.actionBlueprints()?.rows ?? []);
  readonly actionSuggestionRows = computed(() => this.actionSuggestions()?.rows ?? []);
  readonly setupPlaybookRows = computed(() => this.setupPlaybook()?.rows ?? []);
  readonly openActionSuggestionRows = computed(() =>
    this.actionSuggestionRows()
      .filter((row) => !["approved", "rejected", "done", "completed"].includes(String(row["status"] ?? "").toLowerCase()))
      .slice(0, 6)
  );

  readonly metrics = computed<Metric[]>(() => [
    { label: "Due today", value: String(this.visibleQueue().length), tone: this.visibleQueue().length ? "warn" : "good" },
    { label: "Overdue", value: String(this.overdueTasks().length), tone: this.overdueTasks().length ? "warn" : "good" },
    { label: "Next actions", value: String(this.openFollowUps().length), tone: "neutral" },
    { label: "Agent suggestions", value: String(this.openActionSuggestionRows().length), tone: this.openActionSuggestionRows().length ? "warn" : "good" },
    { label: "Needs approval", value: String(this.approvalTasks().length), tone: this.approvalTasks().length ? "warn" : "good" }
  ]);

  readonly todayActions = computed<NextActionItem[]>(() => {
    const taskItems = this.visibleQueue().map((task) => ({
      kind: "task" as const,
      id: task.id,
      title: task.title,
      context: this.taskTarget(task),
      dueAt: task.dueAt,
      sortDate: this.sortDate(task.dueAt),
      sortBucket: this.dueBucket(task.dueAt)
    }));

    const suggestionItems = this.openActionSuggestionRows().map((row) => ({
      kind: "suggestion" as const,
      id: this.rowText(row, "id"),
      title: this.rowText(row, "title", "Suggested next step"),
      context: this.rowText(row, "recommendedAction", this.rowText(row, "targetRecord", "Review the suggested action.")),
      dueAt: typeof row["dueAt"] === "string" ? row["dueAt"] : null,
      badge: "Suggested",
      sortDate: this.sortDate(row["dueAt"]),
      sortBucket: this.dueBucket(row["dueAt"])
    }));

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

    const unique = new Map<string, NextActionItem>();
    for (const item of [...taskItems, ...suggestionItems, ...applicationItems]) {
      unique.set(`${item.kind}:${item.id}`, item);
    }
    return [...unique.values()]
      .sort((a, b) => a.sortBucket - b.sortBucket || a.sortDate - b.sortDate || a.title.localeCompare(b.title))
      .slice(0, 5);
  });

  readonly todaySummary = computed<Metric[]>(() => [
    {
      label: "Due today",
      value: String(this.todayActions().filter((item) => item.sortBucket <= 1).length),
      tone: this.todayActions().some((item) => item.sortBucket <= 1) ? "warn" : "good"
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
  ]);

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

  readonly applicationStageGroups = computed(() => {
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

  readonly contactRows = computed<ContactSummary[]>(() => {
    const applicationsByContact = new Map<string, Array<Record<string, unknown>>>();
    for (const row of this.jobApplicationRows()) {
      const name = this.rowText(row, "responsiblePerson", "").trim();
      if (!name) {
        continue;
      }
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
        title: this.recordField(record, "title"),
        company: linked[0] ? this.rowText(linked[0], "company") : this.recordField(record, "company", "Recruiting contact"),
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
      .filter((contact) => {
        const text = `${contact.name} ${contact.title} ${contact.company}`.toLowerCase();
        return !query || text.includes(query);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly groupedViews = computed(() => {
    const activeViews = this.views().filter((view) => view.templateKey === this.activeTemplateKey());
    const groups = [
      { label: "Job Search", views: this.sortViews(activeViews.filter((view) => view.templateKey === "job_search")) },
      { label: "Outreach", views: this.sortViews(activeViews.filter((view) => view.templateKey === "outreach")) },
      { label: "Other", views: this.sortViews(activeViews.filter((view) => view.templateKey !== "job_search" && view.templateKey !== "outreach")) }
    ];
    return groups.filter((group) => group.views.length > 0);
  });

  readonly selectedView = computed(() => this.views().find((view) => view.key === this.selectedViewKey()) ?? this.views()[0] ?? null);
  readonly visibleViewRows = computed(() => this.viewResult()?.rows ?? []);
  readonly visibleViewColumns = computed(() => this.viewResult()?.view.columns ?? this.selectedView()?.columns ?? []);
  readonly visibleObjectTypes = computed(() => this.objectTypes().filter((objectType) => objectType.templateKey === this.activeTemplateKey()));
  readonly selectedObjectType = computed(() => this.objectTypes().find((objectType) => objectType.slug === this.selectedRecordObjectType()) ?? this.visibleObjectTypes()[0] ?? null);
  readonly selectedRecordDetail = computed(() => {
    const selected = this.selectedDetail();
    return selected?.kind === "record" ? selected.item : null;
  });
  readonly sideDetailSelection = computed(() =>
    this.selectedNav() === "Records" && this.selectedRecordDetail() ? null : this.selectedDetail()
  );
  readonly workspaceSummaryItems = computed(() => {
    const summary = this.workspaceLayout()?.summary ?? [];
    if (summary.length > 0) {
      return summary;
    }
    return [
      { key: "applications", label: "Applications", objectType: "application", value: this.jobApplicationRows().length },
      { key: "jobs", label: "Job Postings", objectType: "job", value: this.jobRows().length },
      { key: "alerts", label: "Incoming Alerts", objectType: "job_alert", value: this.jobAlertRows().length },
      { key: "interviews", label: "Interviews", objectType: "interview", value: this.jobInterviewRows().length }
    ];
  });
  readonly workspaceMainViews = computed(() => this.workspaceLayout()?.views.main ?? []);
  readonly workspaceSecondaryViews = computed(() => this.workspaceLayout()?.views.secondary ?? []);
  readonly workspaceSidebarViews = computed(() => this.workspaceLayout()?.views.sidebar ?? []);
  readonly isJobSearchTemplate = computed(() => this.activeTemplateKey() === "job_search");
  readonly workspaceFieldStats = computed(() => {
    const objectTypes = this.workspaceLayout()?.objectTypes ?? [];
    const fieldCount = objectTypes.reduce((total, objectType) => total + (objectType.fields?.length ?? 0), 0);
    const mappingCount = objectTypes.reduce((total, objectType) => total + (objectType.fieldMappings?.length ?? 0), 0);
    return { objectTypes: objectTypes.length, fieldCount, mappingCount };
  });
  readonly jobApplicationRows = computed(() => this.jobApplications()?.rows ?? []);
  readonly jobAlertRows = computed(() => this.jobAlerts()?.rows ?? []);
  readonly jobRows = computed(() => this.jobJobs()?.rows ?? []);
  readonly jobInterviewRows = computed(() => this.jobInterviews()?.rows ?? []);
  readonly jobReferralRows = computed(() => this.jobReferrals()?.rows ?? []);
  readonly jobCvRows = computed(() => this.jobCvVersions()?.rows ?? []);
  readonly jobCoverLetterRows = computed(() => this.jobCoverLetters()?.rows ?? []);
  readonly selectedViewBlueprintRows = computed(() => {
    const view = this.viewResult()?.view ?? this.selectedView();
    if (!view) {
      return this.actionBlueprintRows().filter((row) => this.rowListIncludes(row["appliesToViewKey"], "*")).slice(0, 4);
    }
    return this.actionBlueprintRows()
      .filter((row) =>
        this.rowListIncludes(row["appliesToViewKey"], "*") ||
        this.rowListIncludes(row["appliesToViewKey"], view.key) ||
        this.rowListIncludes(row["appliesToObjectType"], view.objectType)
      )
      .slice(0, 4);
  });
  readonly selectedViewSuggestionRows = computed(() => {
    const view = this.viewResult()?.view ?? this.selectedView();
    if (!view) {
      return [];
    }
    return this.actionSuggestionRows()
      .filter((row) => row["targetViewKey"] === view.key || row["targetObjectType"] === view.objectType)
      .slice(0, 4);
  });
  readonly jobApplicationsByStage = computed(() => {
    const rows = this.jobApplicationRows();
    return [
      { label: "Saved / drafting", tone: "warn", rows: rows.filter((row) => this.stageGroup(row["stage"]) === "drafting") },
      { label: "Applied", tone: "neutral", rows: rows.filter((row) => this.stageGroup(row["stage"]) === "applied") },
      { label: "Contacted", tone: "good", rows: rows.filter((row) => this.stageGroup(row["stage"]) === "contacted") },
      { label: "Rejected", tone: "muted", rows: rows.filter((row) => this.stageGroup(row["stage"]) === "rejected") }
    ].filter((group) => group.rows.length > 0);
  });
  readonly selectedViewIsRecordBacked = computed(() => {
    const objectType = this.viewResult()?.view.objectType ?? this.selectedView()?.objectType;
    return Boolean(objectType && !this.legacyViewObjectTypes.has(objectType));
  });
  readonly onboardingCommand = computed(() =>
    this.activeTemplateKey() === "job_search" ? "./oxrm init --template job-search" : "./oxrm init --template outreach"
  );
  readonly onboardingPrompt = computed(() =>
    this.activeTemplateKey() === "job_search" ? this.jobSearchCodexPrompt() : this.outreachCodexPrompt()
  );
  readonly onboardingSteps = computed<OnboardingStep[]>(() => {
    if (this.activeTemplateKey() === "outreach") {
      const sources = this.viewCount("outreach.sources");
      const leads = this.viewCount("lead.all");
      const people = this.viewCount("person.all");
      const companies = this.viewCount("company.all");
      const tasks = this.viewCount("task.open");
      const events = this.viewCount("event.recent");
      return [
        {
          key: "outreach-source",
          title: "Add lead sources",
          description: "Register where leads come from: Sales Navigator lists, CSV imports, warm intros, inbound mail, website forms, or manual research.",
          status: sources ? `${sources} sources configured` : "No sources configured",
          complete: sources > 0,
          actionLabel: "Open sources",
          viewKey: "outreach.sources"
        },
        {
          key: "outreach-normalize",
          title: "Normalize people and companies",
          description: "Create People, Companies, and Leads so the same company/account fields can map across record types.",
          status: `${people} people · ${companies} companies · ${leads} leads`,
          complete: leads > 0 || people > 0 || companies > 0,
          actionLabel: "Open leads",
          viewKey: "lead.all"
        },
        {
          key: "outreach-queue",
          title: "Review the queue",
          description: "Every useful outreach system needs a next action: research, draft, wait, approve, follow up, or archive.",
          status: tasks ? `${tasks} open tasks` : "No open tasks yet",
          complete: tasks > 0,
          actionLabel: "Open queue",
          nav: "Queue"
        },
        {
          key: "outreach-draft",
          title: "Draft messages only",
          description: "Ask Codex to summarize context and propose messages. Keep sending and connection requests outside oXRM until a human approves.",
          status: this.setupPlaybookRows().length ? "Playbook available" : "Use the prompt below",
          complete: this.setupPlaybookRows().length > 0,
          actionLabel: "Open playbook",
          viewKey: "outreach.playbook"
        },
        {
          key: "outreach-ledger",
          title: "Record external actions",
          description: "After you send outside oXRM, record the message, reply, outcome, and follow-up task so the local ledger stays useful.",
          status: events ? `${events} timeline events` : "No timeline events yet",
          complete: events > 0,
          actionLabel: "Open timeline",
          nav: "Timeline"
        }
      ];
    }

    const sources = this.viewCount("job_search.sources");
    const timers = this.viewCount("job_search.timers");
    const jobs = this.jobRows().length;
    const cvs = this.jobCvRows().length;
    const coverLetters = this.jobCoverLetterRows().length;
    const fits = this.viewCount("job_search.job_fits");
    const applications = this.jobApplicationRows().length;
    const suggestions = this.openActionSuggestionRows().length;
    const events = this.visibleEvents().length;
    return [
      {
        key: "job-source",
        title: "Add job sources",
        description: "Register job boards, company career pages, recruiter inboxes, referrals, and manual URLs before asking an agent to import postings.",
        status: sources ? `${sources} sources configured` : "No sources configured",
        complete: sources > 0,
        actionLabel: "Open sources",
        viewKey: "job_search.sources"
      },
      {
        key: "job-documents",
        title: "Add base CV and cover letter",
        description: "Use the document editor for the canonical CV and cover letter template. Derived versions should stay linked to applications.",
        status: `${cvs} CV versions · ${coverLetters} cover letters`,
        complete: cvs > 0 && coverLetters > 0,
        actionLabel: "Open CVs",
        viewKey: "job_search.documents"
      },
      {
        key: "job-postings",
        title: "Import or paste job postings",
        description: "Store the original URL, raw description, company, platform, contact, and current phase in XRM records.",
        status: jobs ? `${jobs} postings tracked` : "No postings tracked",
        complete: jobs > 0,
        actionLabel: "Open postings",
        viewKey: "job_search.jobs"
      },
      {
        key: "job-fit",
        title: "Run disciplined fit scoring",
        description: "Let an LLM score fit from the posting, your CV, and constraints. It should explain tradeoffs and suggest apply, wait, tailor, or archive.",
        status: fits ? `${fits} fit records` : "No fit records yet",
        complete: fits > 0,
        actionLabel: "Open fit records",
        viewKey: "job_search.job_fits"
      },
      {
        key: "job-drafts",
        title: "Create draft application packets",
        description: "For high-fit jobs, derive a CV version and cover letter, then create an approval task. oXRM should not send or upload automatically.",
        status: applications || suggestions ? `${applications} applications · ${suggestions} suggestions` : "No packets or suggestions yet",
        complete: applications > 0 || suggestions > 0,
        actionLabel: "Open suggestions",
        viewKey: "job_search.action_suggestions"
      },
      {
        key: "job-timers",
        title: "Set daily timers",
        description: "Use timers for import/scoring in the morning and drafts/follow-ups in the afternoon. Keep approvals explicit.",
        status: timers ? `${timers} timers configured` : "No timers configured",
        complete: timers > 0,
        actionLabel: "Open timers",
        viewKey: "job_search.timers"
      },
      {
        key: "job-ledger",
        title: "Record the communication ledger",
        description: "After applying or emailing externally, record what happened, who owns the next action, and when follow-up is due.",
        status: events ? `${events} timeline events` : "No timeline events yet",
        complete: events > 0,
        actionLabel: "Open timeline",
        nav: "Timeline"
      }
    ];
  });
  readonly onboardingProgress = computed(() => {
    const steps = this.onboardingSteps();
    const complete = steps.filter((step) => step.complete).length;
    return {
      complete,
      total: steps.length,
      label: `${complete}/${steps.length} ready`
    };
  });

  readonly subtitle = computed(() => {
    switch (this.selectedNav()) {
      case "Today":
        return "What needs attention now, what is coming up, and where each application stands.";
      case "Applications":
        return "Track each application by stage, contact, match, and next action.";
      case "Jobs":
        return "Review saved roles and decide which opportunities are worth applying to.";
      case "Contacts":
        return "Recruiters, hiring managers, and warm contacts linked to applications.";
      case "Advanced":
        return "Administration, raw records, saved views, activity, and automation internals.";
      case "Dashboard":
        return "Who needs follow-up today, what happened last, and what should happen next.";
      case "Start":
        return "Guided setup for a local job-search or outreach workspace.";
      case "Workspace":
        return "Template-owned XRM records, relationships, tasks, documents, and timeline in one local workspace.";
      case "Views":
        return "Configured table views over generic object types and template-owned records.";
      case "Records":
        return "Identity and outreach records that can be linked into XRM templates.";
      case "Queue":
        return "Follow-ups, approvals, research, and cleanup work linked to records.";
      case "Timeline":
        return "Append-only activity history for messages, emails, notes, meetings, and decisions.";
      case "Settings":
        return "Instance health and Docker runtime status.";
    }
  });

  constructor() {
    if (typeof window !== "undefined" && window.location.pathname === "/") {
      void this.navigateToNav("Today");
    }
    void this.refresh();
  }

  selectNav(item: NavItem) {
    this.selectedNav.set(item);
    void this.navigateToNav(item);
    if (item === "Views" && !this.viewResult()) {
      void this.runSelectedView();
    }
    if (item === "Records") {
      void this.loadRecords();
    }
  }

  selectSettings() {
    this.selectNav("Settings");
  }

  async refresh() {
    const [
      health,
      leads,
      queue,
      tasks,
      events,
      views,
      objectTypes,
      workspaceLayout,
      jobApplications,
      jobAlerts,
      jobJobs,
      jobInterviews,
      jobReferrals,
      jobCvVersions,
      jobCoverLetters,
      jobContacts,
      actionBlueprints,
      actionSuggestions,
      setupPlaybook
    ] = await Promise.all([
      this.api.health().catch(() => ({ status: "degraded" as const, backup: { required: true, latestStatus: "unknown", latestFinishedAt: null, degraded: true } })),
      this.api.listLeads().catch(() => []),
      this.api.listDueTasks().catch(() => []),
      this.api.listTasks().catch(() => []),
      this.api.listEvents().catch(() => []),
      this.api.listViews(this.activeTemplateKey()).catch(() => []),
      this.api.listObjectTypes(this.activeTemplateKey()).catch(() => []),
      this.api.getWorkspace(this.activeTemplateKey()).catch(() => null),
      this.api.runView("job_search.applications").catch(() => null),
      this.api.runView("job_search.job_alerts").catch(() => null),
      this.api.runView("job_search.jobs").catch(() => null),
      this.api.runView("job_search.interviews").catch(() => null),
      this.api.runView("job_search.referrals").catch(() => null),
      this.api.runView("job_search.documents").catch(() => null),
      this.api.runView("job_search.cover_letters").catch(() => null),
      this.api.listXrmRecords({ objectType: "job_contact", limit: 100 }).catch(() => []),
      this.activeTemplateKey() === "job_search" ? this.api.runView("job_search.action_blueprints").catch(() => null) : Promise.resolve(null),
      this.activeTemplateKey() === "job_search" ? this.api.runView("job_search.action_suggestions").catch(() => null) : Promise.resolve(null),
      this.api.runView(this.activeTemplateKey() === "job_search" ? "job_search.playbook" : "outreach.playbook").catch(() => null)
    ]);

    this.backupHealth.set(health.backup?.required === false ? "optional" : health.status === "ok" ? "ok" : "degraded");
    this.leads.set(leads);
    this.queue.set(queue);
    this.tasks.set(tasks);
    this.events.set(events);
    this.views.set(views);
    this.objectTypes.set(objectTypes);
    this.workspaceLayout.set(workspaceLayout);
    this.jobApplications.set(jobApplications);
    this.jobAlerts.set(jobAlerts);
    this.jobJobs.set(jobJobs);
    this.jobInterviews.set(jobInterviews);
    this.jobReferrals.set(jobReferrals);
    this.jobCvVersions.set(jobCvVersions);
    this.jobCoverLetters.set(jobCoverLetters);
    this.jobContacts.set(jobContacts);
    this.actionBlueprints.set(actionBlueprints);
    this.actionSuggestions.set(actionSuggestions);
    this.setupPlaybook.set(setupPlaybook);
    if (!this.onboardingAutoRouted() && this.shouldAutoOpenStart()) {
      this.onboardingAutoRouted.set(true);
      this.selectedNav.set("Start");
      await this.navigateToNav("Start");
    }
    if (!this.selectedViewKey() && views.length > 0) {
      const templateViews = views.filter((view) => view.templateKey === this.activeTemplateKey());
      this.selectedViewKey.set(
        templateViews.find((view) => view.placement === "main")?.key ??
          templateViews[0]?.key ??
          views.find((view) => view.key === "job_search.applications")?.key ??
          views[0]?.key ??
          null
      );
    }
    if (this.selectedViewKey() && (!this.viewResult() || this.selectedNav() === "Views")) {
      await this.runSelectedView();
    }
    if (!this.selectedRecordObjectType() && objectTypes.length > 0) {
      this.selectedRecordObjectType.set(objectTypes[0]?.slug ?? null);
    }
    if (this.selectedNav() === "Records" || this.pendingRecordId()) {
      await this.loadRecords();
    }
    if (this.pendingRecordId()) {
      await this.selectRecordById(this.pendingRecordId() ?? "");
      this.pendingRecordId.set(null);
    }
    this.syncSelectedFromLists();
  }

  selectView(view: ViewDefinition) {
    this.selectedViewKey.set(view.key);
    this.selectedNav.set("Views");
    this.closeDetail();
    void this.navigateToView(view.key);
    void this.runSelectedView();
  }

  openViewByKey(key: string) {
    const view = this.views().find((item) => item.key === key);
    if (view) {
      this.selectView(view);
      return;
    }
    this.selectedViewKey.set(key);
    this.selectedNav.set("Views");
    this.closeDetail();
    void this.navigateToView(key);
    void this.runSelectedView();
  }

  templateViewKey(kind: "playbook" | "sources" | "timers") {
    const prefix = this.activeTemplateKey() === "job_search" ? "job_search" : "outreach";
    return `${prefix}.${kind}`;
  }

  selectTemplate(templateKey: "job_search" | "outreach") {
    if (this.activeTemplateKey() === templateKey) {
      return;
    }
    this.activeTemplateKey.set(templateKey);
    this.selectedViewKey.set(null);
    this.viewResult.set(null);
    this.closeDetail();
    void this.refresh();
    if (this.selectedNav() === "Start") {
      void this.navigateToNav("Start");
    }
  }

  openOnboardingStep(step: OnboardingStep) {
    if (step.viewKey) {
      this.openViewByKey(step.viewKey);
      return;
    }
    if (step.nav) {
      this.selectNav(step.nav);
    }
  }

  async copyOnboardingPrompt() {
    await this.copyText(this.onboardingPrompt(), "prompt");
  }

  async copyOnboardingCommand() {
    await this.copyText(this.onboardingCommand(), "command");
  }

  async runSelectedView() {
    const key = this.selectedViewKey() ?? this.views()[0]?.key;
    if (!key) {
      return;
    }

    this.viewLoading.set(true);
    this.viewError.set(null);
    try {
      this.viewResult.set(await this.api.runView(key, this.currentViewOptions()));
    } catch (error) {
      this.viewError.set(error instanceof Error ? error.message : "Could not run view.");
    } finally {
      this.viewLoading.set(false);
    }
  }

  async selectViewRow(row: Record<string, unknown>) {
    await this.openLinkedRow(row);
  }

  async selectWorkspaceRow(result: ViewRunResult, row: Record<string, unknown>) {
    await this.openLinkedRow(row);
  }

  isViewResultRecordBacked(result: ViewRunResult) {
    return Boolean(result.view.objectType && !this.legacyViewObjectTypes.has(result.view.objectType));
  }

  async selectRecordRow(row: Record<string, unknown>) {
    const id = typeof row["id"] === "string" ? row["id"] : undefined;
    if (!id) {
      return;
    }
    await this.selectRecordById(id);
  }

  async openLinkedRow(row: Record<string, unknown>) {
    const link = (row as ViewRow)._links?.self;
    if (link?.kind === "record") {
      await this.selectRecordById(link.id);
      return;
    }
    if (link?.kind === "lead") {
      const lead = this.leads().find((item) => item.id === link.id) ?? ({ id: link.id, fullName: this.viewRecordTitle(this.viewResult() ?? { view: this.selectedView() as ViewDefinition, rows: [], total: 0, returned: 0 }, row), updatedAt: String(row["updatedAt"] ?? new Date().toISOString()) } as LeadRow);
      await this.selectLead(lead);
      return;
    }
    if (link?.kind === "task") {
      const task = this.tasks().find((item) => item.id === link.id) ?? this.queue().find((item) => item.id === link.id);
      if (task) {
        this.selectTask(task);
      }
      return;
    }
    if (link?.kind === "event") {
      const event = this.events().find((item) => item.id === link.id);
      if (event) {
        this.selectEvent(event);
      }
      return;
    }
    await this.selectRecordRow(row);
  }

  async selectRecordById(id: string) {
    this.detailLoading.set(true);
    this.detailError.set(null);
    this.saveError.set(null);
    try {
      const record = await this.api.getXrmRecord(id);
      this.selectedDetail.set({ kind: "record", item: record });
      if (record.objectType?.slug) {
        this.selectedRecordObjectType.set(record.objectType.slug);
        const isRawRecordRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/records");
        if (this.selectedNav() === "Records" || isRawRecordRoute) {
          this.selectedNav.set("Records");
          void this.navigate(`/records/${encodeURIComponent(record.objectType.slug)}/${encodeURIComponent(record.id)}`);
        }
      }
    } catch (error) {
      this.detailError.set(error instanceof Error ? error.message : "Could not load record detail.");
    } finally {
      this.detailLoading.set(false);
    }
  }

  rowText(row: Record<string, unknown>, key: string, fallback = "-") {
    const value = this.viewCell(row, key);
    return value === "-" ? fallback : value;
  }

  rowDate(row: Record<string, unknown>, key: string) {
    const value = row[key];
    return typeof value === "string" && value ? this.formatDate(value, "date") : "-";
  }

  viewRows(result: ViewRunResult, limit = 5) {
    return result.rows.slice(0, limit);
  }

  viewPreviewColumns(result: ViewRunResult) {
    return result.view.columns.filter((column) => column !== "id").slice(0, 4);
  }

  viewRecordTitle(result: ViewRunResult, row: Record<string, unknown>) {
    const preferred = ["displayName", "subject", "role", "title", "fullName", "name", "company", "source"];
    for (const key of preferred) {
      const value = this.viewCell(row, key);
      if (value !== "-") {
        return value;
      }
    }
    for (const column of result.view.columns) {
      const value = this.viewCell(row, column);
      if (column !== "id" && value !== "-") {
        return value;
      }
    }
    return "Record";
  }

  viewRecordSummary(result: ViewRunResult, row: Record<string, unknown>) {
    const parts = this.viewPreviewColumns(result)
      .filter((column) => !["displayName", "role", "title", "name"].includes(column))
      .map((column) => `${this.columnLabel(column)}: ${this.viewCell(row, column)}`)
      .filter((part) => !part.endsWith(": -"))
      .slice(0, 3);
    return parts.join(" · ") || result.view.objectType;
  }

  stageLabel(value: unknown) {
    return this.humanLabel(value || "unknown");
  }

  stageTone(value: unknown) {
    const stage = String(value || "").toLowerCase();
    if (stage.includes("rejected") || stage.includes("archived")) {
      return "muted";
    }
    if (stage.includes("saved") || stage.includes("draft") || stage.includes("review")) {
      return "warn";
    }
    if (stage.includes("contacted") || stage.includes("intro") || stage.includes("interview")) {
      return "good";
    }
    return "neutral";
  }

  stageGroup(value: unknown) {
    const stage = String(value || "").toLowerCase();
    if (stage.includes("rejected") || stage.includes("archived")) {
      return "rejected";
    }
    if (stage.includes("contacted") || stage.includes("intro") || stage.includes("interview") || stage.includes("referral")) {
      return "contacted";
    }
    if (stage.includes("applied") || stage.includes("waiting")) {
      return "applied";
    }
    return "drafting";
  }

  fitRate(row: Record<string, unknown>) {
    const value = Number(row["fitRate"] ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  fitLabel(row: Record<string, unknown>) {
    const bucket = this.matchBucket(row);
    if (bucket === "strong") {
      return "Strong match";
    }
    if (bucket === "possible") {
      return "Possible match";
    }
    if (bucket === "weak") {
      return "Weak match";
    }
    return "Not assessed";
  }

  fitTone(row: Record<string, unknown>) {
    const value = this.fitRate(row);
    if (value >= 85) {
      return "good";
    }
    if (value >= 65) {
      return "warn";
    }
    return "muted";
  }

  blueprintTarget(row: Record<string, unknown>) {
    const view = this.rowText(row, "appliesToViewKey", "Any view");
    const objectType = this.rowText(row, "appliesToObjectType", "Any record");
    if (view === "*" && objectType === "*") {
      return "Any saved view";
    }
    return `${this.humanLabel(objectType)} · ${view}`;
  }

  automationTone(row: Record<string, unknown>) {
    const level = String(row["automationLevel"] ?? row["status"] ?? "").toLowerCase();
    if (level.includes("draft") || level.includes("required") || level.includes("decision")) {
      return "warn";
    }
    if (level.includes("manual") || level.includes("read")) {
      return "muted";
    }
    return "good";
  }

  suggestionMeta(row: Record<string, unknown>) {
    const status = this.stageLabel(row["status"]);
    return status === "-" ? "Suggested" : status;
  }

  suggestionDue(row: Record<string, unknown>) {
    return this.rowDate(row, "dueAt") !== "-" ? `Due ${this.rowDate(row, "dueAt")}` : "No due date";
  }

  actionDueLabel(item: NextActionItem) {
    if (!item.dueAt) {
      return "Review";
    }
    return this.relativeDateLabel(item.dueAt);
  }

  async openTodayAction(item: NextActionItem) {
    if (item.kind === "task") {
      const task = this.tasks().find((candidate) => candidate.id === item.id) ?? this.queue().find((candidate) => candidate.id === item.id);
      if (task) {
        this.selectTask(task);
      }
      return;
    }
    await this.selectRecordById(item.id);
  }

  async openContact(contact: ContactSummary) {
    if (contact.id) {
      await this.selectRecordById(contact.id);
      return;
    }
    if (contact.fallbackApplicationId) {
      await this.selectRecordById(contact.fallbackApplicationId);
    }
  }

  startCreateRecord(slug: string) {
    this.selectedRecordObjectType.set(slug);
    this.openCreateRecord();
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

  applicationStageBucket(value: unknown) {
    const stage = String(value || "").toLowerCase();
    if (stage.includes("reject") || stage.includes("archive") || stage.includes("closed")) {
      return "Closed";
    }
    if (stage.includes("interview") || stage.includes("intro")) {
      return "Interviewing";
    }
    if (stage.includes("applied") || stage.includes("waiting")) {
      return "Applied";
    }
    if (stage.includes("fit") || stage.includes("draft") || stage.includes("prep") || stage.includes("contact")) {
      return "Preparing";
    }
    return "Saved";
  }

  applicationNextAction(row: Record<string, unknown>) {
    const action = this.rowText(row, "nextAction", "");
    if (!action) {
      return "Decide next step";
    }
    return this.truncate(action, 88);
  }

  applicationContact(row: Record<string, unknown>) {
    return this.rowText(row, "responsiblePerson", "No contact assigned");
  }

  matchBucket(row: Record<string, unknown>) {
    const value = this.fitRate(row);
    if (!value) {
      return "not";
    }
    if (value >= 85) {
      return "strong";
    }
    if (value >= 65) {
      return "possible";
    }
    return "weak";
  }

  recordField(record: XrmRecord, key: string, fallback = "-") {
    const value = record.fields?.[key];
    if (value === undefined || value === null || value === "") {
      return fallback;
    }
    return typeof value === "object" ? JSON.stringify(value) : String(value);
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
    return this.humanLabel(event.type);
  }

  eventSubtitle(event: EventRow) {
    const metadata = event.metadata ?? {};
    return this.uniqueParts([
      this.humanLabel(event.channel),
      this.humanLabel(event.direction),
      event.lead?.fullName,
      event.person?.fullName,
      event.company?.name,
      event.xrmRecord?.displayName,
      metadata.noteStatus ? `note ${String(metadata.noteStatus).replaceAll("_", " ")}` : undefined,
      metadata.sourceQuery ? `query ${metadata.sourceQuery}` : undefined,
      event.taskId ? "task linked" : undefined
    ]).join(" · ");
  }

  eventSnippet(event: EventRow) {
    const metadata = event.metadata ?? {};
    const text = event.body || metadata.proposedNote || metadata.rowText || metadata.linkedinResult || "";
    return this.truncate(String(text), 150);
  }

  taskTarget(task: TaskRow) {
    return task.lead?.fullName || task.person?.fullName || task.company?.name || task.xrmRecord?.displayName || this.humanLabel(task.type);
  }

  taskLastTouch(task: TaskRow) {
    const leadId = task.leadId ?? task.lead?.id;
    const recordId = task.xrmRecordId ?? task.xrmRecord?.id;
    const event = this.visibleEvents().find(
      (item) => (leadId && item.leadId === leadId) || (recordId && item.xrmRecordId === recordId) || item.taskId === task.id
    );
    if (!event) {
      return "No recorded touch yet";
    }
    return `${this.eventTitle(event)} · ${new Date(event.occurredAt).toLocaleDateString()}`;
  }

  taskNextAction(task: TaskRow) {
    if (task.type === "approval") {
      return "Review before external action";
    }
    if (task.type === "follow_up") {
      return "Draft follow-up and wait for approval";
    }
    if (task.type === "research") {
      return "Research context before drafting";
    }
    return task.description || "Review and decide the next step";
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
    if (typeof value === "string" && this.looksLikeDate(value)) {
      return this.formatDate(value, column.toLowerCase().endsWith("at") ? "datetime" : "date");
    }
    if (typeof value === "string" && this.shouldHumanizeColumn(column, value)) {
      return this.humanLabel(value);
    }
    return String(value);
  }

  currentViewOptions() {
    const filters = Object.entries(this.columnFilters())
      .filter(([, value]) => value.trim().length > 0)
      .map(([field, value]) => ({ field, operator: "contains", value }));
    return {
      ...(this.viewSearch() ? { q: this.viewSearch() } : {}),
      ...(this.viewSortField() ? { sort: this.viewSortField(), dir: this.viewSortDirection() } : {}),
      filters,
      limit: 100
    };
  }

  setViewSearch(value: string) {
    this.viewSearch.set(value);
    void this.navigateToView(this.selectedViewKey() ?? this.views()[0]?.key ?? "");
    void this.runSelectedView();
  }

  setColumnFilter(column: string, value: string) {
    this.columnFilters.update((filters) => ({ ...filters, [column]: value }));
    void this.navigateToView(this.selectedViewKey() ?? this.views()[0]?.key ?? "");
    void this.runSelectedView();
  }

  clearViewFilters() {
    this.viewSearch.set("");
    this.columnFilters.set({});
    void this.navigateToView(this.selectedViewKey() ?? this.views()[0]?.key ?? "");
    void this.runSelectedView();
  }

  toggleSort(column: string) {
    if (this.viewSortField() === column) {
      this.viewSortDirection.set(this.viewSortDirection() === "asc" ? "desc" : "asc");
    } else {
      this.viewSortField.set(column);
      this.viewSortDirection.set("asc");
    }
    void this.navigateToView(this.selectedViewKey() ?? this.views()[0]?.key ?? "");
    void this.runSelectedView();
  }

  setSortField(column: string) {
    this.viewSortField.set(column);
    if (!column) {
      this.viewSortDirection.set("asc");
    }
    void this.navigateToView(this.selectedViewKey() ?? this.views()[0]?.key ?? "");
    void this.runSelectedView();
  }

  toggleSortDirection() {
    if (!this.viewSortField()) {
      return;
    }
    this.viewSortDirection.set(this.viewSortDirection() === "asc" ? "desc" : "asc");
    void this.navigateToView(this.selectedViewKey() ?? this.views()[0]?.key ?? "");
    void this.runSelectedView();
  }

  sortIndicator(column: string) {
    return this.viewSortField() === column ? (this.viewSortDirection() === "asc" ? "up" : "down") : "";
  }

  async loadRecords() {
    const objectType = this.selectedObjectType();
    if (!objectType) {
      this.records.set([]);
      return;
    }
    this.recordsLoading.set(true);
    this.recordsError.set(null);
    try {
      this.records.set(await this.api.listXrmRecords({ objectType: objectType.slug, q: this.recordSearch(), limit: 100 }));
    } catch (error) {
      this.recordsError.set(error instanceof Error ? error.message : "Could not load records.");
    } finally {
      this.recordsLoading.set(false);
    }
  }

  selectRecordObjectType(slug: string) {
    this.selectedRecordObjectType.set(slug);
    this.selectedNav.set("Records");
    this.closeDetail();
    void this.navigate(`/records/${encodeURIComponent(slug)}`);
    void this.loadRecords();
  }

  showRecordList() {
    const slug = this.selectedRecordObjectType() ?? this.selectedRecordDetail()?.objectType?.slug;
    this.closeDetail();
    if (slug) {
      void this.navigate(`/records/${encodeURIComponent(slug)}`);
      void this.loadRecords();
      return;
    }
    void this.navigate("/records");
  }

  setRecordSearch(value: string) {
    this.recordSearch.set(value);
    void this.loadRecords();
  }

  openCreateRecord() {
    const objectType = this.selectedObjectType();
    if (!objectType) {
      return;
    }
    this.recordForm.set(
      Object.fromEntries((objectType.fields ?? []).map((field) => [field.key, ""]))
    );
    this.recordCreateOpen.set(true);
  }

  closeCreateRecord() {
    this.recordCreateOpen.set(false);
    this.recordForm.set({});
  }

  setRecordField(key: string, value: string) {
    this.recordForm.update((form) => ({ ...form, [key]: value }));
  }

  async createRecord() {
    const objectType = this.selectedObjectType();
    if (!objectType) {
      return;
    }
    const fields = Object.fromEntries(Object.entries(this.recordForm()).filter(([, value]) => value.trim() !== ""));
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const created = await this.api.createXrmRecord({
        objectType: objectType.slug,
        fields,
        source: "web"
      });
      this.closeCreateRecord();
      await this.loadRecords();
      await this.selectRecordById(created.id);
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : "Could not create record.");
    } finally {
      this.saving.set(false);
    }
  }

  async saveXrmRecord(input: XrmRecordInput) {
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const updated = await this.api.updateXrmRecord(input);
      await this.loadRecords();
      await this.selectRecordById(updated.id);
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : "Could not save record.");
    } finally {
      this.saving.set(false);
    }
  }

  async deleteRecord(record: XrmRecord) {
    if (!confirm(`Delete ${record.displayName}?`)) {
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    try {
      await this.api.deleteXrmRecord(record.id);
      if (this.selectedDetail()?.kind === "record" && this.selectedDetail()?.item.id === record.id) {
        this.closeDetail();
      }
      await this.loadRecords();
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : "Could not delete record.");
    } finally {
      this.saving.set(false);
    }
  }

  recordValue(record: XrmRecord, key: string) {
    const value = record.fields?.[key];
    if (value === undefined || value === null || value === "") {
      return "-";
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    if (typeof value === "string" && this.looksLikeDate(value)) {
      return this.formatDate(value, key.toLowerCase().endsWith("at") ? "datetime" : "date");
    }
    return typeof value === "string" && this.shouldHumanizeColumn(key, value) ? this.humanLabel(value) : String(value);
  }

  recordSummary(record: XrmRecord) {
    return (this.selectedObjectType()?.fields ?? [])
      .slice(0, 3)
      .map((field) => `${this.columnLabel(field.key)}: ${this.recordValue(record, field.key)}`)
      .join(" · ");
  }

  private async navigateToNav(item: NavItem) {
    const path = {
      Today: "/today",
      Applications: "/applications",
      Jobs: "/jobs",
      Contacts: "/contacts",
      Advanced: "/settings/advanced",
      Settings: "/settings",
      Start: `/start?template=${encodeURIComponent(this.activeTemplateKey())}`,
      Dashboard: "/today",
      Workspace: "/applications",
      Views: `/views/${encodeURIComponent(this.selectedViewKey() ?? this.views()[0]?.key ?? "lead.all")}`,
      Records: this.selectedRecordObjectType() ? `/records/${encodeURIComponent(this.selectedRecordObjectType() ?? "")}` : "/records",
      Queue: "/today",
      Timeline: "/settings/advanced/activity"
    }[item];
    await this.navigate(path);
  }

  private async navigateToView(key: string) {
    if (!key) {
      return;
    }
    await this.navigate(`/views/${encodeURIComponent(key)}${this.viewQueryString()}`);
  }

  private async navigate(path: string) {
    await this.router.navigateByUrl(path);
  }

  private viewQueryString() {
    const query = new URLSearchParams();
    query.set("template", this.activeTemplateKey());
    if (this.viewSearch()) {
      query.set("q", this.viewSearch());
    }
    if (this.viewSortField()) {
      query.set("sort", this.viewSortField());
      query.set("dir", this.viewSortDirection());
    }
    const filters = Object.fromEntries(Object.entries(this.columnFilters()).filter(([, value]) => value.trim() !== ""));
    if (Object.keys(filters).length > 0) {
      query.set("filters", JSON.stringify(filters));
    }
    const value = query.toString();
    return value ? `?${value}` : "";
  }

  private initialQueryParam(key: string) {
    if (typeof window === "undefined") {
      return "";
    }
    return new URLSearchParams(window.location.search).get(key) ?? "";
  }

  private inferInitialColumnFilters() {
    const raw = this.initialQueryParam("filters");
    if (!raw) {
      return {};
    }
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, String(value)])) : {};
    } catch {
      return {};
    }
  }

  private inferInitialNav(): NavItem {
    if (typeof window === "undefined") {
      return "Today";
    }
    const path = window.location.pathname;
    if (path.startsWith("/start")) return "Today";
    if (path.startsWith("/today") || path.startsWith("/dashboard") || path.startsWith("/queue")) return "Today";
    if (path.startsWith("/applications") || path.startsWith("/workspace") || path === "/records/application") return "Applications";
    if (path.startsWith("/jobs") || path === "/records/job") return "Jobs";
    if (path.startsWith("/contacts") || path === "/records/job_contact") return "Contacts";
    if (path.startsWith("/views")) return "Views";
    if (path.startsWith("/records")) return "Records";
    if (path.startsWith("/settings/advanced") || path.startsWith("/timeline")) return "Advanced";
    if (path.startsWith("/settings")) return "Settings";
    return "Today";
  }

  private viewCount(key: string) {
    const layout = this.workspaceLayout()?.views;
    const result = [...(layout?.summary ?? []), ...(layout?.main ?? []), ...(layout?.secondary ?? []), ...(layout?.sidebar ?? [])].find(
      (item) => item.view.key === key
    );
    if (result) {
      return result.total;
    }
    if (key === "job_search.applications") return this.jobApplicationRows().length;
    if (key === "job_search.jobs") return this.jobRows().length;
    if (key === "job_search.job_alerts") return this.jobAlertRows().length;
    if (key === "job_search.documents") return this.jobCvRows().length;
    if (key === "job_search.cover_letters") return this.jobCoverLetterRows().length;
    if (key === "lead.all") return this.leads().length;
    if (key === "task.open") return this.visibleTasks().length;
    if (key === "event.recent") return this.visibleEvents().length;
    return 0;
  }

  private shouldAutoOpenStart() {
    return false;
  }

  private jobSearchCodexPrompt() {
    return `I am using oXRM for job search.

Inspect the Job Search Playbook, Job Sources, Job Search Timers, Job Postings, Incoming Job Alerts, Job Fits, Applications, CV Versions, Cover Letters, Action Blueprints, and Action Suggestions.

Use only local/synthetic data unless I explicitly provide real data.

Help me:
1. configure job sources,
2. import or paste job postings,
3. run disciplined fit scoring,
4. derive CV and cover letter drafts from the base templates,
5. create approval tasks for high-fit applications,
6. record communication ledger entries after I send or apply externally.

Do not send emails, LinkedIn messages, applications, or uploads. Draft only and wait for human approval.`;
  }

  private outreachCodexPrompt() {
    return `I am using oXRM for high-context outreach.

Inspect the Outreach Playbook, Outreach Sources, Outreach Timers, All Leads, All People, All Companies, Open Tasks, and Recent Events.

Use only local/synthetic data unless I explicitly provide real data.

Help me:
1. configure lead sources,
2. normalize people, companies, and leads,
3. deduplicate records,
4. summarize relationship context,
5. draft next outreach messages,
6. create follow-up tasks and ledger entries after I confirm external actions.

Do not send emails, LinkedIn messages, connection requests, or external actions. Draft only and wait for human approval.`;
  }

  private async copyText(text: string, key: string) {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      this.copiedPrompt.set(key);
      window.setTimeout(() => this.copiedPrompt.set(null), 1800);
    } catch {
      this.copiedPrompt.set("failed");
      window.setTimeout(() => this.copiedPrompt.set(null), 2200);
    }
  }

  private inferInitialViewKey() {
    if (typeof window === "undefined") {
      return null;
    }
    const match = window.location.pathname.match(/^\/views\/([^/]+)/);
    return match ? decodeURIComponent(match[1] ?? "") : null;
  }

  private inferInitialRecordObjectType() {
    if (typeof window === "undefined") {
      return null;
    }
    const match = window.location.pathname.match(/^\/records\/([^/]+)/);
    return match ? decodeURIComponent(match[1] ?? "") : null;
  }

  private inferInitialRecordId() {
    if (typeof window === "undefined") {
      return null;
    }
    const match = window.location.pathname.match(/^\/records\/[^/]+\/([^/]+)/);
    return match ? decodeURIComponent(match[1] ?? "") : null;
  }

  private truncate(value: string, maxLength: number) {
    const compacted = value.trim().replace(/\s+/g, " ");
    return compacted.length > maxLength ? `${compacted.slice(0, maxLength - 1)}...` : compacted;
  }

  private rowListIncludes(value: unknown, target: string) {
    return String(value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .includes(target);
  }

  private isSmokeTask(task: TaskRow) {
    const text = `${task.title} ${task.description ?? ""}`.toLowerCase();
    return text.includes("cli smoke") || text.includes("db smoke");
  }

  private isSmokeEvent(event: EventRow) {
    const text = `${event.subject ?? ""} ${event.body ?? ""} ${event.lead?.fullName ?? ""}`.toLowerCase();
    return text.includes("cli smoke") || text.includes("db smoke");
  }

  private templateForTask(task: TaskRow) {
    const metadata = task.metadata ?? {};
    const recordMetadata = task.xrmRecord?.metadata ?? {};
    const idempotencyKey = task.idempotencyKey ?? "";
    if (metadata["scenario"] === "linkedin-outreach" || String(metadata["source"] ?? "").includes("outreach")) {
      return "outreach";
    }
    if (metadata["templateKey"] === "job_search" || recordMetadata["templateKey"] === "job_search" || idempotencyKey.startsWith("job-search:")) {
      return "job_search";
    }
    if (task.leadId || task.lead) {
      return "outreach";
    }
    return undefined;
  }

  private templateForEvent(event: EventRow) {
    const metadata = event.metadata ?? {};
    const recordMetadata = event.xrmRecord?.metadata ?? {};
    const key = `${event.externalId ?? ""} ${event.providerThreadId ?? ""}`;
    if (metadata["scenario"] === "linkedin-outreach" || String(metadata["source"] ?? "").includes("outreach")) {
      return "outreach";
    }
    if (metadata["templateKey"] === "job_search" || recordMetadata["templateKey"] === "job_search" || key.includes("job-search:")) {
      return "job_search";
    }
    if (event.leadId || event.lead) {
      return "outreach";
    }
    return undefined;
  }

  private belongsToActiveTemplate(kind: "task" | "event", item: TaskRow | EventRow) {
    const template = kind === "task" ? this.templateForTask(item as TaskRow) : this.templateForEvent(item as EventRow);
    return template === undefined || template === this.activeTemplateKey();
  }

  private sortViews(views: ViewDefinition[]) {
    const order = [
      "job_search.playbook",
      "job_search.sources",
      "job_search.timers",
      "job_search.jobs",
      "job_search.applications",
      "job_search.followups_due",
      "job_search.waiting_for_reply",
      "job_search.job_alerts",
      "job_search.job_fits",
      "job_search.action_suggestions",
      "job_search.action_blueprints",
      "job_search.approvals",
      "job_search.action_runs",
      "job_search.interviews",
      "job_search.referrals",
      "job_search.documents",
      "job_search.cover_letters",
      "outreach.playbook",
      "outreach.sources",
      "outreach.timers",
      "lead.all",
      "person.all",
      "company.all",
      "task.open",
      "event.recent"
    ];
    return [...views].sort((a, b) => {
      const aIndex = order.indexOf(a.key);
      const bIndex = order.indexOf(b.key);
      if (aIndex !== -1 || bIndex !== -1) {
        return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex);
      }
      return a.name.localeCompare(b.name);
    });
  }

  private inferInitialTemplateKey() {
    if (typeof window === "undefined") {
      return "job_search";
    }
    const template = new URLSearchParams(window.location.search).get("template");
    if (template === "outreach" || template === "job_search") {
      return template;
    }
    return window.location.hostname.startsWith("linkedin-outreach-demo.") ? "outreach" : "job_search";
  }

  private humanLabel(value: unknown) {
    const text = String(value ?? "").trim();
    if (!text) {
      return "-";
    }
    if (text.toLowerCase() === "linkedin") {
      return "LinkedIn";
    }
    return text
      .replace(/[_.-]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private shouldHumanizeColumn(column: string, value: string) {
    if (/^https?:\/\//.test(value)) {
      return false;
    }
    const normalizedColumn = column.toLowerCase();
    if (/(status|stage|type|channel|direction|priority|segment|source)$/.test(normalizedColumn)) {
      return true;
    }
    return /^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(value);
  }

  private looksLikeDate(value: string) {
    return /^\d{4}-\d{2}-\d{2}(?:T|\b)/.test(value) && !Number.isNaN(new Date(value).getTime());
  }

  private sortDate(value: unknown) {
    if (typeof value !== "string" || !value) {
      return Number.MAX_SAFE_INTEGER;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
  }

  private dueBucket(value: unknown) {
    const timestamp = this.sortDate(value);
    if (timestamp === Number.MAX_SAFE_INTEGER) {
      return 3;
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    if (timestamp < start.getTime()) {
      return 0;
    }
    if (timestamp < end.getTime()) {
      return 1;
    }
    return 2;
  }

  private relativeDateLabel(value: string) {
    const bucket = this.dueBucket(value);
    if (bucket === 0) {
      return "Overdue";
    }
    if (bucket === 1) {
      return "Due today";
    }
    const date = new Date(value);
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    if (date.getTime() >= tomorrow.getTime() && date.getTime() < dayAfterTomorrow.getTime()) {
      return "Tomorrow";
    }
    return this.formatDate(value, value.includes("T") ? "datetime" : "date");
  }

  private formatDate(value: string, mode: "date" | "datetime") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return mode === "datetime"
      ? date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
      : date.toLocaleDateString([], { dateStyle: "medium" });
  }

  private uniqueParts(parts: Array<string | undefined | null>) {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const part of parts) {
      const value = part?.trim();
      if (!value || seen.has(value.toLowerCase())) {
        continue;
      }
      seen.add(value.toLowerCase());
      result.push(value);
    }
    return result;
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
