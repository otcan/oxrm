import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AddApplicationModalComponent } from "./add-application-modal.component";
import { AddJobModalComponent } from "./add-job-modal.component";
import { AppShellComponent } from "./app-shell.component";
import { CrmApiService } from "./crm-api.service";
import { ConnectAiModalComponent } from "./connect-ai-modal.component";
import { CvLibraryModalComponent } from "./cv-library-modal.component";
import { DemoWelcomePageComponent } from "./demo-welcome-page.component";
import { DetailDrawerComponent } from "./detail-drawer.component";
import { GuidedTourComponent } from "./guided-tour.component";
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
  FilterChange,
  FilterControl,
  HealthResponse,
  LeadEditForm,
  LeadRow,
  Metric,
  NavDefinition,
  NavItem,
  OutreachCompanyRow,
  OutreachPersonRow,
  OutreachPipelineRow,
  PageResult,
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
    AddApplicationModalComponent,
    AddJobModalComponent,
    AppShellComponent,
    ConnectAiModalComponent,
    CvLibraryModalComponent,
    DemoWelcomePageComponent,
    DetailDrawerComponent,
    GuidedTourComponent,
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

  readonly bootstrap = signal<WorkspaceBootstrap | null>(null);
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
  readonly cvRecords = signal<XrmRecord[]>([]);
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
  readonly addApplicationOpen = signal(false);
  readonly addJobOpen = signal(false);
  readonly cvLibraryOpen = signal(false);
  readonly connectAiOpen = signal(false);
  readonly demoWelcomeOpen = signal(false);
  readonly guidedTourOpen = signal(false);
  readonly applicationPrefill = signal<Record<string, string> | null>(null);
  readonly recordForm = signal<Record<string, string>>({});
  readonly selectedRecordObjectType = signal<string | null>(null);
  readonly applicationSearch = signal("");
  readonly applicationTimeFilter = signal("any");
  readonly applicationCompanyFilter = signal("all");
  readonly applicationMatchFilter = signal("all");
  readonly applicationCvFilter = signal("any");
  readonly applicationContactFilter = signal("any");
  readonly applicationSourceFilter = signal("all");
  readonly applicationShowClosedFilter = signal("no");
  readonly applicationShowNotFitFilter = signal("no");
  readonly applicationSort = signal("next_action");
  readonly jobSearch = signal("");
  readonly jobDateFilter = signal("any");
  readonly jobCompanyFilter = signal("all");
  readonly jobSourceFilter = signal("all");
  readonly jobMatchFilter = signal("all");
  readonly jobApplicationStatusFilter = signal("all");
  readonly jobLocationFilter = signal("all");
  readonly jobRemoteOnlyFilter = signal("any");
  readonly jobCvAssessedFilter = signal("any");
  readonly jobHasContactFilter = signal("any");
  readonly jobSort = signal("newest");
  readonly jobPage = signal(1);
  readonly jobPageSize = signal(25);
  readonly contactSearch = signal("");
  readonly pipelineSearch = signal("");
  readonly pipelineLastContactFilter = signal("any");
  readonly pipelineNextActionFilter = signal("any");
  readonly pipelineCompanyFilter = signal("all");
  readonly pipelineChannelFilter = signal("all");
  readonly pipelineWaitingFilter = signal("any");
  readonly pipelineDraftFilter = signal("any");
  readonly pipelineNeedsReviewFilter = signal("any");
  readonly pipelineShowClosedFilter = signal("no");
  readonly pipelineSort = signal("overdue");
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
      stages: ["Saved", "Preparing", "Applied", "Interviewing", "Not a fit", "Closed"],
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
    const filtered = this.jobApplicationRows().filter((row) => {
      const stageBucket = this.applicationStageBucket(row["stage"]);
      const text = `${this.rowText(row, "role")} ${this.rowText(row, "company")} ${this.rowText(row, "responsiblePerson")}`.toLowerCase();
      if (query && !text.includes(query)) return false;
      if (!this.matchesTimeFilter(row, this.applicationTimeFilter())) return false;
      if (!this.matchesTextFilter(this.rowText(row, "company", ""), this.applicationCompanyFilter())) return false;
      if (this.applicationMatchFilter() !== "all" && this.matchBucket(row) !== this.applicationMatchFilter()) return false;
      if (this.applicationCvFilter() === "attached" && !this.rowText(row, "cvVersion", "")) return false;
      if (this.applicationCvFilter() === "missing" && this.rowText(row, "cvVersion", "")) return false;
      if (this.applicationContactFilter() === "assigned" && !this.rowText(row, "responsiblePerson", "")) return false;
      if (!this.matchesTextFilter(this.rowText(row, "source", this.rowText(row, "platform", "")), this.applicationSourceFilter())) return false;
      if (this.applicationShowClosedFilter() !== "yes" && stageBucket === "Closed") return false;
      if (this.applicationShowNotFitFilter() !== "yes" && stageBucket === "Not a fit") return false;
      return true;
    });
    return this.sortApplications(filtered, this.applicationSort());
  });

  readonly applicationStageGroups = computed<ProductStageGroup[]>(() => {
    const rows = this.filteredApplicationRows();
    return this.uiConfig().stages.map((label) => ({
      label,
      rows: rows.filter((row) => this.applicationStageBucket(row["stage"]) === label)
    }));
  });

  readonly applicationFilterControls = computed<FilterControl[]>(() => [
    {
      key: "updated",
      label: "Time",
      value: this.applicationTimeFilter(),
      defaultValue: "any",
      options: [
        { value: "any", label: "Any time" },
        { value: "today", label: "Needs action today" },
        { value: "7d", label: "Updated in last 7 days" },
        { value: "30d", label: "Updated in last 30 days" }
      ]
    },
    {
      key: "company",
      label: "Company",
      value: this.applicationCompanyFilter(),
      defaultValue: "all",
      options: this.optionList("Any company", this.jobApplicationRows().map((row) => this.rowText(row, "company", "")))
    },
    {
      key: "match",
      label: "Match",
      value: this.applicationMatchFilter(),
      defaultValue: "all",
      options: [
        { value: "all", label: "Any match" },
        { value: "strong", label: "Strong" },
        { value: "possible", label: "Possible" },
        { value: "weak", label: "Weak" },
        { value: "not", label: "Not assessed" }
      ]
    },
    {
      key: "cv",
      label: "CV",
      value: this.applicationCvFilter(),
      defaultValue: "any",
      options: [
        { value: "any", label: "Any" },
        { value: "attached", label: "CV attached" },
        { value: "missing", label: "CV missing" }
      ]
    },
    {
      key: "contact",
      label: "Contact assigned",
      value: this.applicationContactFilter(),
      defaultValue: "any",
      more: true,
      options: [
        { value: "any", label: "Any" },
        { value: "assigned", label: "Contact assigned" }
      ]
    },
    {
      key: "source",
      label: "Source",
      value: this.applicationSourceFilter(),
      defaultValue: "all",
      more: true,
      options: this.optionList("Any source", this.jobApplicationRows().map((row) => this.rowText(row, "source", this.rowText(row, "platform", ""))))
    },
    {
      key: "closed",
      label: "Show closed",
      value: this.applicationShowClosedFilter(),
      defaultValue: "no",
      more: true,
      options: [
        { value: "no", label: "Hide closed" },
        { value: "yes", label: "Show closed" }
      ]
    },
    {
      key: "not_fit",
      label: "Show not a fit",
      value: this.applicationShowNotFitFilter(),
      defaultValue: "no",
      more: true,
      options: [
        { value: "no", label: "Hide not a fit" },
        { value: "yes", label: "Show not a fit" }
      ]
    },
    {
      key: "sort",
      label: "Sort",
      value: this.applicationSort(),
      defaultValue: "next_action",
      more: true,
      options: [
        { value: "next_action", label: "Next action due" },
        { value: "updated", label: "Recently updated" },
        { value: "company", label: "Company" },
        { value: "newest", label: "Newest" }
      ]
    }
  ]);

  readonly filteredJobRows = computed(() => {
    const query = this.jobSearch().trim().toLowerCase();
    const filtered = this.jobRows().filter((row) => {
      const text = `${this.rowText(row, "title")} ${this.rowText(row, "company")} ${this.rowText(row, "location")} ${this.rowText(row, "platform")}`.toLowerCase();
      if (query && !text.includes(query)) return false;
      if (!this.matchesDateAdded(row, this.jobDateFilter())) return false;
      if (!this.matchesTextFilter(this.rowText(row, "company", ""), this.jobCompanyFilter())) return false;
      if (!this.matchesTextFilter(this.rowText(row, "platform", this.rowText(row, "source", "")), this.jobSourceFilter())) return false;
      if (this.jobMatchFilter() !== "all" && this.matchBucket(row) !== this.jobMatchFilter()) return false;
      if (this.jobApplicationStatusFilter() !== "all" && this.applicationStageBucket(row["applicationStage"]) !== this.jobApplicationStatusFilter()) return false;
      if (!this.matchesTextFilter(this.rowText(row, "location", ""), this.jobLocationFilter())) return false;
      if (this.jobRemoteOnlyFilter() === "remote" && !this.rowText(row, "location", "").toLowerCase().includes("remote")) return false;
      if (this.jobCvAssessedFilter() === "yes" && this.matchBucket(row) === "not") return false;
      if (this.jobHasContactFilter() === "yes" && !this.rowText(row, "responsiblePerson", this.rowText(row, "contact", ""))) return false;
      return true;
    });
    return this.sortJobs(filtered, this.jobSort());
  });

  readonly jobFilterControls = computed<FilterControl[]>(() => [
    {
      key: "date",
      label: "Date added",
      value: this.jobDateFilter(),
      defaultValue: "any",
      options: [
        { value: "any", label: "Any date" },
        { value: "today", label: "Today" },
        { value: "7d", label: "Last 7 days" },
        { value: "30d", label: "Last 30 days" }
      ]
    },
    {
      key: "company",
      label: "Company",
      value: this.jobCompanyFilter(),
      defaultValue: "all",
      options: this.optionList("Any company", this.jobRows().map((row) => this.rowText(row, "company", "")))
    },
    {
      key: "source",
      label: "Source",
      value: this.jobSourceFilter(),
      defaultValue: "all",
      options: this.optionList("Any source", this.jobRows().map((row) => this.rowText(row, "platform", this.rowText(row, "source", ""))))
    },
    {
      key: "match",
      label: "Match",
      value: this.jobMatchFilter(),
      defaultValue: "all",
      options: [
        { value: "all", label: "Any match" },
        { value: "strong", label: "Strong" },
        { value: "possible", label: "Possible" },
        { value: "weak", label: "Weak" },
        { value: "not", label: "Not assessed" }
      ]
    },
    {
      key: "status",
      label: "Application status",
      value: this.jobApplicationStatusFilter(),
      defaultValue: "all",
      options: [
        { value: "all", label: "Any status" },
        { value: "Saved", label: "Not started" },
        { value: "Preparing", label: "Preparing" },
        { value: "Applied", label: "Applied" },
        { value: "Interviewing", label: "Interviewing" },
        { value: "Not a fit", label: "Not a fit" },
        { value: "Closed", label: "Closed" }
      ]
    },
    {
      key: "location",
      label: "Location",
      value: this.jobLocationFilter(),
      defaultValue: "all",
      more: true,
      options: this.optionList("Any location", this.jobRows().map((row) => this.rowText(row, "location", "")))
    },
    {
      key: "remote",
      label: "Remote only",
      value: this.jobRemoteOnlyFilter(),
      defaultValue: "any",
      more: true,
      options: [
        { value: "any", label: "Any" },
        { value: "remote", label: "Remote only" }
      ]
    },
    {
      key: "cv_match",
      label: "CV match assessed",
      value: this.jobCvAssessedFilter(),
      defaultValue: "any",
      more: true,
      options: [
        { value: "any", label: "Any" },
        { value: "yes", label: "Assessed" }
      ]
    },
    {
      key: "contact",
      label: "Has contact",
      value: this.jobHasContactFilter(),
      defaultValue: "any",
      more: true,
      options: [
        { value: "any", label: "Any" },
        { value: "yes", label: "Has contact" }
      ]
    },
    {
      key: "sort",
      label: "Sort",
      value: this.jobSort(),
      defaultValue: "newest",
      more: true,
      options: [
        { value: "newest", label: "Newest first" },
        { value: "best_match", label: "Best match" },
        { value: "company", label: "Company" },
        { value: "updated", label: "Recently updated" }
      ]
    }
  ]);

  readonly jobPageResult = computed<PageResult<Record<string, unknown>>>(() => {
    const rows = this.filteredJobRows();
    const pageSize = this.jobPageSize();
    const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
    const page = Math.min(Math.max(1, this.jobPage()), pageCount);
    const startIndex = (page - 1) * pageSize;
    const items = rows.slice(startIndex, startIndex + pageSize);
    return {
      items,
      total: this.jobRows().length,
      shown: rows.length,
      page,
      pageSize,
      pageCount,
      start: rows.length ? startIndex + 1 : 0,
      end: startIndex + items.length,
      hasNext: page < pageCount
    };
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
    const filtered = this.outreachPipelineRows().filter((row) => {
      const text = `${row.name} ${row.company} ${row.role} ${row.nextAction}`.toLowerCase();
      if (query && !text.includes(query)) return false;
      if (!this.matchesLastContact(row, this.pipelineLastContactFilter())) return false;
      if (!this.matchesNextAction(row, this.pipelineNextActionFilter())) return false;
      if (!this.matchesTextFilter(row.company, this.pipelineCompanyFilter())) return false;
      if (!this.matchesTextFilter(row.channel, this.pipelineChannelFilter())) return false;
      if (this.pipelineWaitingFilter() === "yes" && row.stage !== "Contacted") return false;
      if (this.pipelineDraftFilter() === "yes" && this.recordField(row.record, "draftStatus", "") !== "proposed") return false;
      if (this.pipelineNeedsReviewFilter() === "yes" && !row.badges.includes("Needs review")) return false;
      if (this.pipelineShowClosedFilter() !== "yes" && row.stage === "Closed") return false;
      return true;
    });
    return this.sortOutreachRows(filtered, this.pipelineSort());
  });

  readonly outreachPipelineGroups = computed<ProductStageGroup[]>(() => {
    const rows = this.filteredOutreachPipelineRows();
    return this.uiConfig().stages.map((label) => ({
      label,
      rows: rows.filter((row) => row.stage === label)
    }));
  });

  readonly outreachPipelineFilterControls = computed<FilterControl[]>(() => [
    {
      key: "last_contacted",
      label: "Last contacted",
      value: this.pipelineLastContactFilter(),
      defaultValue: "any",
      options: [
        { value: "any", label: "Any time" },
        { value: "today", label: "Today" },
        { value: "7d", label: "Last 7 days" },
        { value: "30d", label: "Last 30 days" },
        { value: "never", label: "Never contacted" }
      ]
    },
    {
      key: "next_action",
      label: "Next action",
      value: this.pipelineNextActionFilter(),
      defaultValue: "any",
      options: [
        { value: "any", label: "Any" },
        { value: "overdue", label: "Overdue" },
        { value: "today", label: "Today" },
        { value: "week", label: "This week" },
        { value: "none", label: "No next action" }
      ]
    },
    {
      key: "company",
      label: "Company",
      value: this.pipelineCompanyFilter(),
      defaultValue: "all",
      options: this.optionList("Any company", this.outreachPipelineRows().map((row) => row.company))
    },
    {
      key: "channel",
      label: "Channel",
      value: this.pipelineChannelFilter(),
      defaultValue: "all",
      options: this.optionList("Any channel", this.outreachPipelineRows().map((row) => row.channel))
    },
    {
      key: "waiting",
      label: "Waiting for reply",
      value: this.pipelineWaitingFilter(),
      defaultValue: "any",
      more: true,
      options: [
        { value: "any", label: "Any" },
        { value: "yes", label: "Waiting for reply" }
      ]
    },
    {
      key: "draft",
      label: "Draft available",
      value: this.pipelineDraftFilter(),
      defaultValue: "any",
      more: true,
      options: [
        { value: "any", label: "Any" },
        { value: "yes", label: "Draft available" }
      ]
    },
    {
      key: "review",
      label: "Needs review",
      value: this.pipelineNeedsReviewFilter(),
      defaultValue: "any",
      more: true,
      options: [
        { value: "any", label: "Any" },
        { value: "yes", label: "Needs review" }
      ]
    },
    {
      key: "closed",
      label: "Show closed",
      value: this.pipelineShowClosedFilter(),
      defaultValue: "no",
      more: true,
      options: [
        { value: "no", label: "Hide closed" },
        { value: "yes", label: "Show closed" }
      ]
    },
    {
      key: "sort",
      label: "Sort",
      value: this.pipelineSort(),
      defaultValue: "overdue",
      more: true,
      options: [
        { value: "overdue", label: "Overdue next action" },
        { value: "next_action", label: "Next action date" },
        { value: "last_contacted", label: "Last contacted" },
        { value: "name", label: "Name" }
      ]
    }
  ]);

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
      .filter((row) => {
        const stage = this.applicationStageBucket(row["stage"]);
        return this.rowText(row, "nextActionAt") !== "-" && stage !== "Closed" && stage !== "Not a fit";
      })
      .map((row) => ({
        kind: "application" as const,
        id: this.rowText(row, "id"),
        title: this.rowText(row, "nextAction", "Review next application step"),
        context: `${this.rowText(row, "role")} at ${this.rowText(row, "company")}`,
        dueAt: typeof row["nextActionAt"] === "string" ? row["nextActionAt"] : null,
        sortDate: this.sortDate(row["nextActionAt"]),
        sortBucket: this.dueBucket(row["nextActionAt"])
      }));
    const missingCvItems = this.jobApplicationRows()
      .filter((row) => this.applicationStageBucket(row["stage"]) === "Preparing" && !this.rowText(row, "cvVersion", ""))
      .map((row) => ({
        kind: "application" as const,
        id: this.rowText(row, "id"),
        title: `Choose a CV for ${this.rowText(row, "company")} ${this.rowText(row, "role")}`,
        context: `${this.rowText(row, "role")} at ${this.rowText(row, "company")}`,
        dueAt: typeof row["nextActionAt"] === "string" ? row["nextActionAt"] : null,
        badge: "CV missing",
        sortDate: this.sortDate(row["nextActionAt"]),
        sortBucket: 0
      }));
    return this.sortedUniqueActions([...taskItems, ...missingCvItems, ...applicationItems]).slice(0, 5);
  });

  readonly outreachTodayActions = computed<ProductActionItem[]>(() => {
    const leadRecords = this.outreachLeadRecords();
    const taskItems = this.visibleQueue().map((task) => {
      const record = task.xrmRecordId ? leadRecords.find((candidate) => candidate.id === task.xrmRecordId) : undefined;
      if (!record) {
        return this.taskActionItem(task);
      }
      return {
        kind: "task" as const,
        id: task.id,
        title: this.recordField(record, "nextAction", task.title.replace(/^Next action:\s*/i, "")),
        context: `${this.recordField(record, "fullName", record.displayName)} at ${this.recordField(record, "company", "Unknown company")}`,
        dueAt: (task.dueAt ?? this.recordField(record, "nextActionAt", "")) || null,
        badge: this.recordField(record, "draftStatus", "") === "proposed" ? "Draft ready" : undefined,
        sortDate: this.sortDate(task.dueAt ?? this.recordField(record, "nextActionAt", "")),
        sortBucket: this.dueBucket(task.dueAt ?? this.recordField(record, "nextActionAt", ""))
      };
    });
    const taskRecordIds = new Set(this.visibleQueue().map((task) => task.xrmRecordId).filter((id): id is string => Boolean(id)));
    const leadItems = this.outreachLeadRecords()
      .filter((record) => this.recordField(record, "nextActionAt", "") !== "" && !taskRecordIds.has(record.id))
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
        value: String(this.jobApplicationRows().filter((row) => !["Closed", "Not a fit"].includes(this.applicationStageBucket(row["stage"]))).length),
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
      active: rows.filter((row) => !["Closed", "Not a fit"].includes(this.applicationStageBucket(row["stage"]))).length,
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
    this.loadFiltersFromUrl();
    if (typeof window !== "undefined") {
      window.addEventListener("popstate", () => {
        this.selectedNav.set(this.inferInitialNav());
        this.loadFiltersFromUrl();
        this.applyDocumentMetadata();
      });
    }
    this.applyWorkspaceModeMetadata(this.workspaceMode());
    void this.refresh();
  }

  async refresh() {
    const bootstrap = this.normalizeBootstrap(await this.api.workspaceBootstrap().catch(() => this.fallbackBootstrap()));
    this.bootstrap.set(bootstrap);
    this.workspaceMode.set(bootstrap.mode);
    this.applyWorkspaceModeMetadata(bootstrap.mode);
    this.applyDocumentMetadata();
    this.initializeDemoGuide(bootstrap);
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
      cvRecords,
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
      templateKey === "job_search" ? this.api.listXrmRecords({ objectType: "cv_version", limit: 100 }).catch(() => []) : Promise.resolve([]),
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
    this.cvRecords.set(cvRecords.filter((record) => this.recordBelongsToMode(record, "job_search")));
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
    this.applyDocumentMetadata();
    void this.navigateToNav(item);
  }

  selectSettings() {
    this.selectNav("Settings");
  }

  startCreatePrimary() {
    this.startCreateRecord(this.uiConfig().primaryAction.objectType);
  }

  startCreateRecord(slug: string) {
    if (slug === "application") {
      this.startCreateApplication();
      return;
    }
    if (slug === "job") {
      this.startCreateJob();
      return;
    }
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
    this.syncUrlForCurrentNav();
  }

  setApplicationFilter(change: FilterChange) {
    this.setFilterSignal(change.key, change.value, {
      updated: this.applicationTimeFilter,
      company: this.applicationCompanyFilter,
      match: this.applicationMatchFilter,
      cv: this.applicationCvFilter,
      contact: this.applicationContactFilter,
      source: this.applicationSourceFilter,
      closed: this.applicationShowClosedFilter,
      not_fit: this.applicationShowNotFitFilter,
      sort: this.applicationSort
    });
    this.syncUrlForCurrentNav();
  }

  clearApplicationFilters() {
    this.applicationSearch.set("");
    this.applicationTimeFilter.set("any");
    this.applicationCompanyFilter.set("all");
    this.applicationMatchFilter.set("all");
    this.applicationCvFilter.set("any");
    this.applicationContactFilter.set("any");
    this.applicationSourceFilter.set("all");
    this.applicationShowClosedFilter.set("no");
    this.applicationShowNotFitFilter.set("no");
    this.applicationSort.set("next_action");
    this.syncUrlForCurrentNav();
  }

  setJobSearch(value: string) {
    this.jobSearch.set(value);
    this.jobPage.set(1);
    this.syncUrlForCurrentNav();
  }

  setJobFilter(change: FilterChange) {
    this.setFilterSignal(change.key, change.value, {
      date: this.jobDateFilter,
      company: this.jobCompanyFilter,
      source: this.jobSourceFilter,
      match: this.jobMatchFilter,
      status: this.jobApplicationStatusFilter,
      location: this.jobLocationFilter,
      remote: this.jobRemoteOnlyFilter,
      cv_match: this.jobCvAssessedFilter,
      contact: this.jobHasContactFilter,
      sort: this.jobSort
    });
    this.jobPage.set(1);
    this.syncUrlForCurrentNav();
  }

  clearJobFilters() {
    this.jobSearch.set("");
    this.jobDateFilter.set("any");
    this.jobCompanyFilter.set("all");
    this.jobSourceFilter.set("all");
    this.jobMatchFilter.set("all");
    this.jobApplicationStatusFilter.set("all");
    this.jobLocationFilter.set("all");
    this.jobRemoteOnlyFilter.set("any");
    this.jobCvAssessedFilter.set("any");
    this.jobHasContactFilter.set("any");
    this.jobSort.set("newest");
    this.jobPage.set(1);
    this.syncUrlForCurrentNav();
  }

  setJobPage(value: number) {
    this.jobPage.set(Math.max(1, value));
    this.syncUrlForCurrentNav();
  }

  setJobPageSize(value: number) {
    this.jobPageSize.set(value || 25);
    this.jobPage.set(1);
    this.syncUrlForCurrentNav();
  }

  setContactSearch(value: string) {
    this.contactSearch.set(value);
  }

  setPipelineSearch(value: string) {
    this.pipelineSearch.set(value);
    this.syncUrlForCurrentNav();
  }

  setPipelineFilter(change: FilterChange) {
    this.setFilterSignal(change.key, change.value, {
      last_contacted: this.pipelineLastContactFilter,
      next_action: this.pipelineNextActionFilter,
      company: this.pipelineCompanyFilter,
      channel: this.pipelineChannelFilter,
      waiting: this.pipelineWaitingFilter,
      draft: this.pipelineDraftFilter,
      review: this.pipelineNeedsReviewFilter,
      closed: this.pipelineShowClosedFilter,
      sort: this.pipelineSort
    });
    this.syncUrlForCurrentNav();
  }

  clearPipelineFilters() {
    this.pipelineSearch.set("");
    this.pipelineLastContactFilter.set("any");
    this.pipelineNextActionFilter.set("any");
    this.pipelineCompanyFilter.set("all");
    this.pipelineChannelFilter.set("all");
    this.pipelineWaitingFilter.set("any");
    this.pipelineDraftFilter.set("any");
    this.pipelineNeedsReviewFilter.set("any");
    this.pipelineShowClosedFilter.set("no");
    this.pipelineSort.set("overdue");
    this.syncUrlForCurrentNav();
  }

  setPeopleSearch(value: string) {
    this.peopleSearch.set(value);
  }

  setCompanySearch(value: string) {
    this.companySearch.set(value);
  }

  openCvLibrary() {
    this.cvLibraryOpen.set(true);
  }

  closeCvLibrary() {
    this.cvLibraryOpen.set(false);
  }

  async openCvRecord(record: XrmRecord) {
    this.closeCvLibrary();
    await this.selectRecordById(record.id);
  }

  openConnectAi() {
    this.connectAiOpen.set(true);
  }

  closeConnectAi() {
    this.connectAiOpen.set(false);
  }

  showGuidedTour() {
    this.demoWelcomeOpen.set(false);
    this.guidedTourOpen.set(true);
    this.selectNav(this.workspaceMode() === "outreach" ? "Pipeline" : "Jobs");
  }

  completeDemoGuide() {
    this.persistDemoGuideCompletion();
    this.demoWelcomeOpen.set(false);
    this.guidedTourOpen.set(false);
    this.selectNav("Today");
  }

  exploreSampleData() {
    this.persistDemoGuideCompletion();
    this.demoWelcomeOpen.set(false);
    this.guidedTourOpen.set(false);
    this.selectNav("Today");
  }

  startCreateApplication(prefill: Record<string, string> | null = null) {
    this.applicationPrefill.set(prefill);
    this.addApplicationOpen.set(true);
  }

  startCreateJob() {
    this.addJobOpen.set(true);
  }

  closeAddApplication() {
    this.addApplicationOpen.set(false);
    this.applicationPrefill.set(null);
    this.saveError.set(null);
  }

  closeAddJob() {
    this.addJobOpen.set(false);
    this.saveError.set(null);
  }

  async createApplicationRecord(fields: Record<string, string>) {
    const normalized = this.normalizeDateFields(fields, ["applicationDate", "nextActionAt"]);
    const displayName = `${normalized["role"] || "Application"} at ${normalized["company"] || "Company"}`;
    await this.createSpecializedRecord("application", displayName, normalized);
    this.closeAddApplication();
  }

  async createJobRecord(fields: Record<string, string>) {
    const normalized = this.normalizeDateFields(fields, ["publishedAt", "discoveredAt"]);
    const displayName = `${normalized["title"] || "Job"} at ${normalized["company"] || "Company"}`;
    await this.createSpecializedRecord("job", displayName, {
      ...normalized,
      applicationStage: normalized["applicationStage"] || "not_started"
    });
    this.closeAddJob();
  }

  async startApplicationFromJob(row: Record<string, unknown>) {
    this.startCreateApplication({
      role: this.rowText(row, "title", ""),
      company: this.rowText(row, "company", ""),
      jobUrl: this.rowText(row, "url", ""),
      stage: "Preparing",
      nextAction: "Choose CV and prepare application packet",
      nextActionAt: new Date().toISOString().slice(0, 10)
    });
  }

  async startApplicationFromJobRecord(record: XrmRecord) {
    this.startCreateApplication({
      role: this.recordField(record, "title", record.displayName),
      company: this.recordField(record, "company", ""),
      jobUrl: this.recordField(record, "url", ""),
      stage: "Preparing",
      nextAction: "Choose CV and prepare application packet",
      nextActionAt: new Date().toISOString().slice(0, 10)
    });
  }

  async markJobNotFit(row: Record<string, unknown>) {
    const id = typeof row["id"] === "string" ? row["id"] : undefined;
    if (!id) return;
    const reason = this.askNotFitReason();
    if (reason === null) return;
    const record = await this.api.getXrmRecord(id);
    await this.updateRecordFields(record, { applicationStage: "Not a fit", notFitReason: reason });
  }

  async markJobRecordNotFit(record: XrmRecord) {
    const reason = this.askNotFitReason();
    if (reason === null) return;
    await this.updateRecordFields(record, { applicationStage: "Not a fit", notFitReason: reason });
  }

  async saveJobForLater(row: Record<string, unknown>) {
    const id = typeof row["id"] === "string" ? row["id"] : undefined;
    if (!id) return;
    const record = await this.api.getXrmRecord(id);
    await this.updateRecordFields(record, { applicationStage: "saved" });
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
    if (stage.includes("not a fit") || stage.includes("not_fit") || stage.includes("not-a-fit") || stage.includes("pass") || stage.includes("skip")) return "Not a fit";
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

  optionList(defaultLabel: string, values: string[]) {
    const unique = [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return [{ value: "all", label: defaultLabel }, ...unique.map((value) => ({ value, label: value }))];
  }

  matchesTextFilter(value: string, filter: string) {
    return filter === "all" || value.toLowerCase() === filter.toLowerCase();
  }

  matchesTimeFilter(row: Record<string, unknown>, filter: string) {
    if (filter === "any") return true;
    const value = filter === "today" ? row["nextActionAt"] : row["updatedAt"] ?? row["lastTouchAt"] ?? row["nextActionAt"];
    return this.matchesDateWindow(value, filter);
  }

  matchesDateAdded(row: Record<string, unknown>, filter: string) {
    if (filter === "any") return true;
    return this.matchesDateWindow(row["discoveredAt"] ?? row["publishedAt"] ?? row["createdAt"], filter);
  }

  matchesDateWindow(value: unknown, filter: string) {
    const timestamp = this.sortDate(value);
    if (timestamp === Number.MAX_SAFE_INTEGER) return false;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (filter === "today") {
      return timestamp >= start && timestamp < start + 86_400_000;
    }
    if (filter === "7d") {
      return timestamp >= Date.now() - 7 * 86_400_000;
    }
    if (filter === "30d") {
      return timestamp >= Date.now() - 30 * 86_400_000;
    }
    return true;
  }

  sortApplications(rows: ViewRow[], sort: string) {
    return [...rows].sort((left, right) => {
      if (sort === "company") return this.rowText(left, "company").localeCompare(this.rowText(right, "company"));
      if (sort === "newest") return this.sortDate(right["createdAt"] ?? right["updatedAt"]) - this.sortDate(left["createdAt"] ?? left["updatedAt"]);
      if (sort === "updated") return this.sortDate(right["updatedAt"] ?? right["lastTouchAt"]) - this.sortDate(left["updatedAt"] ?? left["lastTouchAt"]);
      return this.sortDate(left["nextActionAt"]) - this.sortDate(right["nextActionAt"]);
    });
  }

  sortJobs(rows: ViewRow[], sort: string) {
    return [...rows].sort((left, right) => {
      if (sort === "best_match") return Number(right["fitRate"] ?? 0) - Number(left["fitRate"] ?? 0);
      if (sort === "company") return this.rowText(left, "company").localeCompare(this.rowText(right, "company"));
      if (sort === "updated") return this.sortDate(right["updatedAt"] ?? right["lastTouchAt"]) - this.sortDate(left["updatedAt"] ?? left["lastTouchAt"]);
      return this.sortDate(right["discoveredAt"] ?? right["publishedAt"] ?? right["createdAt"]) - this.sortDate(left["discoveredAt"] ?? left["publishedAt"] ?? left["createdAt"]);
    });
  }

  matchesLastContact(row: OutreachPipelineRow, filter: string) {
    if (filter === "any") return true;
    if (filter === "never") return row.lastContact === "Not contacted";
    return this.matchesDateWindow(this.recordField(row.record, "lastContactAt", ""), filter);
  }

  matchesNextAction(row: OutreachPipelineRow, filter: string) {
    if (filter === "any") return true;
    const value = this.recordField(row.record, "nextActionAt", "");
    if (filter === "none") return !value;
    const bucket = this.dueBucket(value);
    if (filter === "overdue") return bucket === 0;
    if (filter === "today") return bucket === 1;
    if (filter === "week") return this.matchesDateWindow(value, "7d");
    return true;
  }

  sortOutreachRows(rows: OutreachPipelineRow[], sort: string) {
    return [...rows].sort((left, right) => {
      if (sort === "name") return left.name.localeCompare(right.name);
      if (sort === "last_contacted") return this.sortDate(this.recordField(right.record, "lastContactAt", "")) - this.sortDate(this.recordField(left.record, "lastContactAt", ""));
      if (sort === "next_action") return this.sortDate(this.recordField(left.record, "nextActionAt", "")) - this.sortDate(this.recordField(right.record, "nextActionAt", ""));
      return this.dueBucket(this.recordField(left.record, "nextActionAt", "")) - this.dueBucket(this.recordField(right.record, "nextActionAt", ""));
    });
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

  private async createSpecializedRecord(objectType: string, displayName: string, fields: Record<string, string>) {
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const cleanFields = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== ""));
      const created = await this.api.createXrmRecord({
        objectType,
        displayName,
        fields: cleanFields,
        source: "web",
        metadata: { templateKey: "job_search", source: "web" }
      });
      await this.refresh();
      await this.selectRecordById(created.id);
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : "Could not create record.");
      throw error;
    } finally {
      this.saving.set(false);
    }
  }

  private normalizeDateFields(fields: Record<string, string>, keys: string[]) {
    return Object.fromEntries(
      Object.entries(fields).map(([key, value]) => {
        if (keys.includes(key) && value && !value.includes("T")) {
          return [key, new Date(`${value}T09:00:00.000`).toISOString()];
        }
        return [key, value];
      })
    );
  }

  private askNotFitReason() {
    if (typeof window === "undefined") return "Marked not a fit";
    const value = window.prompt("Why is this not a fit? Optional");
    if (value === null) return null;
    return value.trim() || "Marked not a fit";
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
    await this.navigate(`${path}${this.queryStringForNav(item)}`);
  }

  private async navigate(path: string) {
    await this.router.navigateByUrl(path);
  }

  private syncUrlForCurrentNav() {
    if (typeof window === "undefined") return;
    const path = this.uiConfig().routes[this.selectedNav()] ?? window.location.pathname;
    const query = this.queryStringForNav(this.selectedNav());
    window.history.pushState(null, "", `${path}${query}`);
  }

  private queryStringForNav(item: NavItem) {
    const params = new URLSearchParams();
    const add = (key: string, value: string | number, defaultValue: string | number) => {
      if (String(value) !== String(defaultValue)) {
        params.set(key, String(value));
      }
    };
    if (item === "Applications") {
      add("q", this.applicationSearch(), "");
      add("updated", this.applicationTimeFilter(), "any");
      add("company", this.applicationCompanyFilter(), "all");
      add("match", this.applicationMatchFilter(), "all");
      add("cv", this.applicationCvFilter(), "any");
      add("contact", this.applicationContactFilter(), "any");
      add("source", this.applicationSourceFilter(), "all");
      add("closed", this.applicationShowClosedFilter(), "no");
      add("not_fit", this.applicationShowNotFitFilter(), "no");
      add("sort", this.applicationSort(), "next_action");
    }
    if (item === "Jobs") {
      add("q", this.jobSearch(), "");
      add("date", this.jobDateFilter(), "any");
      add("company", this.jobCompanyFilter(), "all");
      add("source", this.jobSourceFilter(), "all");
      add("match", this.jobMatchFilter(), "all");
      add("status", this.jobApplicationStatusFilter(), "all");
      add("location", this.jobLocationFilter(), "all");
      add("remote", this.jobRemoteOnlyFilter(), "any");
      add("cv_match", this.jobCvAssessedFilter(), "any");
      add("contact", this.jobHasContactFilter(), "any");
      add("sort", this.jobSort(), "newest");
      add("page", this.jobPage(), 1);
      add("page_size", this.jobPageSize(), 25);
    }
    if (item === "Pipeline") {
      add("q", this.pipelineSearch(), "");
      add("last_contacted", this.pipelineLastContactFilter(), "any");
      add("next_action", this.pipelineNextActionFilter(), "any");
      add("company", this.pipelineCompanyFilter(), "all");
      add("channel", this.pipelineChannelFilter(), "all");
      add("waiting", this.pipelineWaitingFilter(), "any");
      add("draft", this.pipelineDraftFilter(), "any");
      add("review", this.pipelineNeedsReviewFilter(), "any");
      add("closed", this.pipelineShowClosedFilter(), "no");
      add("sort", this.pipelineSort(), "overdue");
    }
    const value = params.toString();
    return value ? `?${value}` : "";
  }

  private loadFiltersFromUrl() {
    if (typeof window === "undefined") return;
    const query = new URLSearchParams(window.location.search);
    const nav = this.inferInitialNav();
    if (nav === "Applications") {
      this.applicationSearch.set(query.get("q") ?? "");
      this.applicationTimeFilter.set(query.get("updated") ?? "any");
      this.applicationCompanyFilter.set(query.get("company") ?? "all");
      this.applicationMatchFilter.set(query.get("match") ?? "all");
      this.applicationCvFilter.set(query.get("cv") ?? "any");
      this.applicationContactFilter.set(query.get("contact") ?? "any");
      this.applicationSourceFilter.set(query.get("source") ?? "all");
      this.applicationShowClosedFilter.set(query.get("closed") ?? "no");
      this.applicationShowNotFitFilter.set(query.get("not_fit") ?? "no");
      this.applicationSort.set(query.get("sort") ?? "next_action");
    }
    if (nav === "Jobs") {
      this.jobSearch.set(query.get("q") ?? "");
      this.jobDateFilter.set(query.get("date") ?? "any");
      this.jobCompanyFilter.set(query.get("company") ?? "all");
      this.jobSourceFilter.set(query.get("source") ?? "all");
      this.jobMatchFilter.set(query.get("match") ?? "all");
      this.jobApplicationStatusFilter.set(query.get("status") ?? "all");
      this.jobLocationFilter.set(query.get("location") ?? "all");
      this.jobRemoteOnlyFilter.set(query.get("remote") ?? "any");
      this.jobCvAssessedFilter.set(query.get("cv_match") ?? "any");
      this.jobHasContactFilter.set(query.get("contact") ?? "any");
      this.jobSort.set(query.get("sort") ?? "newest");
      this.jobPage.set(Number(query.get("page") ?? "1") || 1);
      this.jobPageSize.set(Number(query.get("page_size") ?? "25") || 25);
    }
    if (nav === "Pipeline") {
      this.pipelineSearch.set(query.get("q") ?? "");
      this.pipelineLastContactFilter.set(query.get("last_contacted") ?? "any");
      this.pipelineNextActionFilter.set(query.get("next_action") ?? "any");
      this.pipelineCompanyFilter.set(query.get("company") ?? "all");
      this.pipelineChannelFilter.set(query.get("channel") ?? "all");
      this.pipelineWaitingFilter.set(query.get("waiting") ?? "any");
      this.pipelineDraftFilter.set(query.get("draft") ?? "any");
      this.pipelineNeedsReviewFilter.set(query.get("review") ?? "any");
      this.pipelineShowClosedFilter.set(query.get("closed") ?? "no");
      this.pipelineSort.set(query.get("sort") ?? "overdue");
    }
  }

  private setFilterSignal(key: string, value: string, signals: Record<string, { set: (value: string) => void }>) {
    signals[key]?.set(value);
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
      templateKey: "job_search",
      demo: {
        enabled: false,
        guideVersion: 1,
        readOnly: false,
        resettable: false
      }
    };
  }

  private normalizeBootstrap(bootstrap: WorkspaceBootstrap): WorkspaceBootstrap {
    return {
      ...bootstrap,
      demo: bootstrap.demo ?? {
        enabled: false,
        guideVersion: 1,
        readOnly: false,
        resettable: false
      }
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

  private applyDocumentMetadata() {
    if (typeof document === "undefined") return;
    const modeLabel = this.workspaceMode() === "outreach" ? "oXRM Outreach" : "oXRM Job Search";
    document.title = `${this.selectedNav()} · ${modeLabel}`;
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.appendChild(description);
    }
    description.content =
      this.workspaceMode() === "outreach"
        ? "Self-hosted, AI-assisted outreach tracking."
        : "Self-hosted, AI-assisted job application tracking.";
    let theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!theme) {
      theme = document.createElement("meta");
      theme.name = "theme-color";
      document.head.appendChild(theme);
    }
    theme.content = "#111827";
  }

  private initializeDemoGuide(bootstrap: WorkspaceBootstrap) {
    if (!bootstrap.demo.enabled || typeof window === "undefined") {
      this.demoWelcomeOpen.set(false);
      return;
    }
    const query = new URLSearchParams(window.location.search);
    const key = this.demoGuideStorageKey(bootstrap.demo.guideVersion);
    if (query.get("tour") === "1") {
      this.demoWelcomeOpen.set(false);
      this.guidedTourOpen.set(true);
      return;
    }
    const path = window.location.pathname;
    const eligiblePath = path === "/" || path === "/today" || path === "/dashboard";
    this.demoWelcomeOpen.set(eligiblePath && localStorage.getItem(key) !== "complete");
  }

  private persistDemoGuideCompletion() {
    const bootstrap = this.bootstrap();
    if (!bootstrap?.demo.enabled || typeof localStorage === "undefined") return;
    localStorage.setItem(this.demoGuideStorageKey(bootstrap.demo.guideVersion), "complete");
  }

  private demoGuideStorageKey(version: number) {
    return `oxrm.demoGuide.v${version}`;
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
