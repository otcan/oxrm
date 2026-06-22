import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { JobSearchSetupInput, JobSearchSetupSourceInput, JobSearchSetupSummary, XrmRecord } from "./models";

@Component({
  selector: "oc-job-search-setup-page",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="setup-page">
      <div class="setup-status panel">
        <div>
          <span>Status</span>
          <strong>{{ summary?.configured ? "Configured" : "Needs setup" }}</strong>
        </div>
        <div>
          <span>Sources</span>
          <strong>{{ summary?.sources?.length || form.sources.length }}</strong>
        </div>
        <div>
          <span>Blueprints</span>
          <strong>{{ summary?.blueprints?.length || 0 }}</strong>
        </div>
        <div>
          <span>Timers</span>
          <strong>{{ summary?.timers?.length || 0 }}</strong>
        </div>
      </div>

      @if (summary?.gaps?.length) {
        <section class="panel setup-gap-panel">
          <h2>Gaps</h2>
          <ul>
            @for (gap of summary?.gaps; track gap) {
              <li>{{ gap }}</li>
            }
          </ul>
        </section>
      }

      <section class="setup-layout">
        <form class="panel setup-form" (ngSubmit)="save()">
          <header class="setup-section-header">
            <div>
              <h2>Job search setup</h2>
              <p>Configure the XRM records an assistant reads before importing jobs, scoring fit, drafting documents, or creating follow-ups.</p>
            </div>
            <button type="submit" class="primary" [disabled]="saving">{{ saving ? "Saving" : "Save setup" }}</button>
          </header>

          <section class="setup-section">
            <div class="setup-section-title">
              <h3>Sources</h3>
              <button type="button" (click)="addSource()">Add source</button>
            </div>
            <div class="source-editor-list">
              @for (source of form.sources; track source; let index = $index) {
                <div class="source-editor-row">
                  <label>
                    Name
                    <input [(ngModel)]="source.title" [name]="'source-title-' + index">
                  </label>
                  <label>
                    Channel
                    <select [(ngModel)]="source.channel" [name]="'source-channel-' + index">
                      <option value="job_board">Job board</option>
                      <option value="career_page">Career page</option>
                      <option value="email">Email</option>
                      <option value="referral">Referral</option>
                      <option value="browser">Browser</option>
                      <option value="csv">CSV</option>
                      <option value="api">API</option>
                      <option value="manual">Manual</option>
                    </select>
                  </label>
                  <label>
                    Cadence
                    <input [(ngModel)]="source.cadence" [name]="'source-cadence-' + index">
                  </label>
                  <label>
                    URL
                    <input [(ngModel)]="source.sourceUrl" [name]="'source-url-' + index">
                  </label>
                  <label class="wide">
                    Import instructions
                    <textarea [(ngModel)]="source.importInstructions" [name]="'source-import-' + index"></textarea>
                  </label>
                  <div class="source-row-actions">
                    <button type="button" [disabled]="form.sources.length <= 1" (click)="removeSource(index)">Remove</button>
                  </div>
                </div>
              }
            </div>
          </section>

          <section class="setup-section">
            <div class="setup-section-title">
              <h3>Documents</h3>
            </div>
            <div class="setup-two-column">
              <label>
                CV mode
                <select [(ngModel)]="form.cvStrategy.mode" name="cvMode">
                  <option value="master">Master CV only</option>
                  <option value="master_plus_variants">Master plus variants</option>
                  <option value="role_specific">Role specific</option>
                  <option value="manual">Manual</option>
                </select>
              </label>
              <label>
                Base CV path
                <input [(ngModel)]="form.cvStrategy.baseCvPath" name="baseCvPath">
              </label>
              <label class="wide">
                CV editing policy
                <textarea [(ngModel)]="form.cvStrategy.editorInstructions" name="cvEditorInstructions"></textarea>
              </label>
              <label>
                Cover letter mode
                <select [(ngModel)]="form.coverLetterStrategy.mode" name="coverLetterMode">
                  <option value="never">Never</option>
                  <option value="high_fit_only">High fit only</option>
                  <option value="every_application">Every application</option>
                  <option value="manual">Manual</option>
                </select>
              </label>
              <label>
                Cover letter threshold
                <input type="number" min="0" max="100" [(ngModel)]="form.coverLetterStrategy.threshold" name="coverLetterThreshold">
              </label>
              <label>
                Cover template path
                <input [(ngModel)]="form.coverLetterStrategy.templatePath" name="coverTemplatePath">
              </label>
              <label class="wide">
                Cover letter instructions
                <textarea [(ngModel)]="form.coverLetterStrategy.editorInstructions" name="coverLetterInstructions"></textarea>
              </label>
            </div>
          </section>

          <section class="setup-section">
            <div class="setup-section-title">
              <h3>Fit rubric</h3>
            </div>
            <div class="setup-two-column">
              <label>
                Scoring mode
                <select [(ngModel)]="form.fitRubric.mode" name="fitMode">
                  <option value="manual">Manual</option>
                  <option value="llm_assisted">LLM assisted</option>
                  <option value="automatic_suggestion">Automatic suggestion</option>
                </select>
              </label>
              <label>
                High-fit threshold
                <input type="number" min="0" max="100" [(ngModel)]="form.fitRubric.threshold" name="fitThreshold">
              </label>
              <label>
                Must have
                <textarea [ngModel]="listText(form.fitRubric.mustHave)" (ngModelChange)="form.fitRubric.mustHave = textList($event)" name="mustHave"></textarea>
              </label>
              <label>
                Nice to have
                <textarea [ngModel]="listText(form.fitRubric.niceToHave)" (ngModelChange)="form.fitRubric.niceToHave = textList($event)" name="niceToHave"></textarea>
              </label>
              <label>
                Exclusions
                <textarea [ngModel]="listText(form.fitRubric.exclusions)" (ngModelChange)="form.fitRubric.exclusions = textList($event)" name="exclusions"></textarea>
              </label>
              <label>
                Scoring discipline
                <textarea [(ngModel)]="form.fitRubric.instructions" name="fitInstructions"></textarea>
              </label>
            </div>
          </section>

          <section class="setup-section">
            <div class="setup-section-title">
              <h3>Automation boundaries</h3>
            </div>
            <div class="setup-two-column">
              <label>
                Level
                <select [(ngModel)]="form.automationPolicy.level" name="automationLevel">
                  <option value="manual">Manual</option>
                  <option value="suggest_only">Suggest only</option>
                  <option value="draft_documents">Draft documents</option>
                  <option value="import_and_score">Import and score</option>
                </select>
              </label>
              <label>
                Import cadence
                <input [(ngModel)]="form.schedule.importCadence" name="importCadence">
              </label>
              <label>
                Review cadence
                <input [(ngModel)]="form.schedule.reviewCadence" name="reviewCadence">
              </label>
              <label>
                Timezone
                <input [(ngModel)]="form.schedule.timezone" name="timezone">
              </label>
              <label class="checkbox-row wide">
                <input type="checkbox" [(ngModel)]="form.automationPolicy.approvalRequired" name="approvalRequired">
                Require human approval for external action
              </label>
              <label class="wide">
                Notifications
                <input [ngModel]="listText(form.notificationPolicy.channels)" (ngModelChange)="form.notificationPolicy.channels = textList($event)" name="notificationChannels">
              </label>
            </div>
          </section>

          @if (error) {
            <div class="empty error">{{ error }}</div>
          }
        </form>

        <aside class="setup-side">
          <section class="panel setup-record-panel">
            <h2>Generated records</h2>
            <div class="setup-record-list">
              @for (record of visibleRecords(); track record.id) {
                <div>
                  <span>{{ record.objectType?.label || record.objectType?.slug || "Record" }}</span>
                  <strong>{{ record.displayName }}</strong>
                  <small>{{ field(record, "status", record.status) }}</small>
                </div>
              }
            </div>
          </section>

          <section class="panel setup-playbook-panel">
            <h2>Agent prompt</h2>
            <pre>{{ summary?.agentPrompt || "Save setup to generate the agent prompt." }}</pre>
          </section>

          <section class="panel setup-playbook-panel">
            <h2>Playbook</h2>
            <pre>{{ summary?.playbookText || "Save setup to generate the playbook." }}</pre>
          </section>
        </aside>
      </section>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobSearchSetupPageComponent implements OnChanges {
  @Input() summary: JobSearchSetupSummary | null = null;
  @Input() saving = false;
  @Input() error: string | null = null;
  @Output() saveSetup = new EventEmitter<JobSearchSetupInput>();

  form: JobSearchSetupInput = defaultSetupForm();
  private hydratedFromSummary = false;

  ngOnChanges(changes: SimpleChanges) {
    if (!changes["summary"] || this.hydratedFromSummary || !this.summary) return;
    const sources = this.summary.sources.map((record) => this.sourceFromRecord(record)).filter((source) => source.title);
    if (sources.length > 0) {
      this.form = {
        ...this.form,
        sources,
        schedule: {
          ...this.form.schedule,
          importCadence: this.timerCadence("import", this.form.schedule.importCadence),
          reviewCadence: this.timerCadence("review", this.form.schedule.reviewCadence)
        }
      };
      this.hydratedFromSummary = true;
    }
  }

  addSource() {
    this.form.sources = [
      ...this.form.sources,
      {
        title: "New source",
        channel: "manual",
        cadence: "manual",
        importInstructions: "Capture URL, company, role, location, job description, and source date."
      }
    ];
  }

  removeSource(index: number) {
    if (this.form.sources.length <= 1) return;
    this.form.sources = this.form.sources.filter((_, itemIndex) => itemIndex !== index);
  }

  save() {
    this.saveSetup.emit({
      ...this.form,
      sources: this.form.sources.filter((source) => source.title.trim())
    });
  }

  listText(values: string[] | undefined) {
    return (values ?? []).join("\n");
  }

  textList(value: string) {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  visibleRecords() {
    const summary = this.summary;
    if (!summary) return [];
    return [
      summary.profile,
      ...summary.sources.slice(0, 4),
      ...summary.timers.slice(0, 2),
      summary.fitRubric,
      summary.cvStrategy,
      summary.coverLetterStrategy,
      summary.followUpStrategy
    ].filter((record): record is XrmRecord => Boolean(record));
  }

  field(record: XrmRecord, key: string, fallback = "") {
    const fields = record.fields ?? {};
    const value = fields[key];
    return value === undefined || value === null || value === "" ? fallback : String(value);
  }

  private sourceFromRecord(record: XrmRecord): JobSearchSetupSourceInput {
    return {
      title: this.field(record, "title", record.displayName),
      channel: this.sourceChannel(this.field(record, "channel", "manual")),
      sourceUrl: this.field(record, "sourceUrl", ""),
      cadence: this.field(record, "cadence", "manual"),
      importInstructions: this.field(record, "importInstructions", ""),
      privacyNotes: this.field(record, "privacyNotes", "")
    };
  }

  private sourceChannel(value: string): JobSearchSetupSourceInput["channel"] {
    const allowed = ["job_board", "career_page", "email", "referral", "manual", "browser", "csv", "api"];
    return allowed.includes(value) ? (value as JobSearchSetupSourceInput["channel"]) : "manual";
  }

  private timerCadence(kind: "import" | "review", fallback: string) {
    const timer = this.summary?.timers.find((record) => record.externalKey?.includes(kind) || record.displayName.toLowerCase().includes(kind));
    return timer ? this.field(timer, "cadence", fallback) : fallback;
  }
}

function defaultSetupForm(): JobSearchSetupInput {
  return {
    sources: [
      {
        title: "Job boards and alerts",
        channel: "job_board",
        sourceUrl: "https://example.invalid/jobs",
        cadence: "daily",
        importInstructions: "Import or paste job postings with source URL, company, role, location, raw description, and received date.",
        privacyNotes: "Keep real credentials and private alert URLs outside the repository."
      },
      {
        title: "Recruiter inbox",
        channel: "email",
        sourceUrl: "mailto:recruiter-inbox@example.invalid",
        cadence: "daily",
        importInstructions: "Extract recruiter, company, position, communication thread, job description, and next follow-up.",
        privacyNotes: "Use local credentials only. Do not use real inbox data in public demos."
      }
    ],
    cvStrategy: {
      mode: "master_plus_variants",
      baseCvPath: "./data/job-search/cv/master.md",
      variantPolicy: "Create role-specific variants only for high-fit jobs.",
      editorInstructions: "Preserve factual claims. Tailor summary, relevant projects, and keywords to the job description."
    },
    coverLetterStrategy: {
      mode: "high_fit_only",
      threshold: 75,
      templatePath: "./data/job-search/cover-letter-template.md",
      editorInstructions: "Draft concise letters with evidence from the CV and job description. Never invent experience."
    },
    fitRubric: {
      mode: "llm_assisted",
      threshold: 75,
      mustHave: ["Role matches target function", "Location or remote constraints work", "Core skills are represented in the CV"],
      niceToHave: ["Warm contact exists", "Product/domain interest", "Clear hiring signal"],
      exclusions: ["Requires unavailable location", "Requires seniority mismatch", "Unclear or low-quality posting"],
      instructions: "Score only from evidence. Include strengths, gaps, risks, and the next suggested action."
    },
    automationPolicy: {
      level: "suggest_only",
      approvalRequired: true,
      allowedActions: ["import_jobs", "score_fit", "draft_cv", "draft_cover_letter", "create_tasks"]
    },
    schedule: {
      importCadence: "daily 08:30",
      reviewCadence: "daily 16:00",
      timezone: "local"
    },
    notificationPolicy: {
      channels: ["in_app"],
      digestCadence: "daily",
      instructions: "Show high-fit jobs and due follow-ups in the local queue."
    }
  };
}
