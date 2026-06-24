import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { allowedJobActions, type JobWorkflowActionKey, type JobWorkflowState } from "@oxrm/shared";
import { XrmRecord } from "./models";

type JobDetailTab = "overview" | "description" | "match" | "activity";

@Component({
  selector: "oc-job-detail",
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="detail-tabs" aria-label="Job detail tabs">
      <button type="button" [class.active]="tab === 'overview'" (click)="tab = 'overview'">Overview</button>
      <button type="button" [class.active]="tab === 'description'" (click)="tab = 'description'">Description</button>
      <button type="button" [class.active]="tab === 'match'" (click)="tab = 'match'">Match</button>
      <button type="button" [class.active]="tab === 'activity'" (click)="tab = 'activity'">Activity</button>
    </section>

    @if (tab === 'overview') {
      <section class="detail-section">
        <dl class="detail-kv">
          <div><dt>Role</dt><dd>{{ field("title", record.displayName) }}</dd></div>
          <div><dt>Company</dt><dd>{{ field("company") }}</dd></div>
          <div><dt>Location</dt><dd>{{ field("location") }}</dd></div>
          <div><dt>Source</dt><dd>{{ field("platform", field("source", "Manual")) }}</dd></div>
          <div><dt>Published</dt><dd>{{ dateField("publishedAt", "Unknown") }}</dd></div>
          <div><dt>Discovered</dt><dd>{{ dateField("discoveredAt", dateField("createdAt", "Unknown")) }}</dd></div>
          <div><dt>Decision</dt><dd>{{ workflowState.decisionState }}</dd></div>
          <div><dt>Application</dt><dd>{{ workflowState.applicationStage }}</dd></div>
        </dl>
        <div class="detail-actions stacked">
          <button type="button" class="primary" (click)="runAction.emit(workflowState.primaryAction.key)">
            {{ workflowState.primaryAction.label }}
          </button>
          @for (action of workflowState.secondaryActions; track action.key) {
            <button type="button" (click)="runAction.emit(action.key)">{{ action.label }}</button>
          }
          @if (field("url", "")) {
            <a class="button-link" [href]="field('url')" target="_blank" rel="noreferrer">Open job posting</a>
          }
        </div>
      </section>
    }

    @if (tab === 'description') {
      <section class="detail-section">
        <article class="detail-long-text">
          <h3>{{ field("title", record.displayName) }}</h3>
          <p>{{ field("fullDescription", field("description", "No job description has been captured yet.")) }}</p>
          @if (field("requirements", "")) {
            <h4>Requirements</h4>
            <p>{{ field("requirements") }}</p>
          }
          @if (field("responsibilities", "")) {
            <h4>Responsibilities</h4>
            <p>{{ field("responsibilities") }}</p>
          }
        </article>
        <div class="detail-actions">
          <button type="button" class="primary" [disabled]="saving" (click)="createCoverLetterDraft.emit(record)">
            {{ saving ? "Creating draft…" : "Create cover letter draft" }}
          </button>
        </div>
      </section>
    }

    @if (tab === 'match') {
      <section class="detail-section">
        <dl class="detail-kv">
          <div><dt>Selected CV</dt><dd>{{ field("recommendedCv", field("cvVersion", "No CV selected")) }}</dd></div>
          <div><dt>Strong matches</dt><dd>{{ field("matchingSkills", "No match notes recorded yet.") }}</dd></div>
          <div><dt>Missing skills</dt><dd>{{ field("missingSkills", "No missing skills recorded yet.") }}</dd></div>
          <div><dt>Risks</dt><dd>{{ field("riskNotes", "No risks recorded yet.") }}</dd></div>
          <div><dt>Suggested action</dt><dd>{{ field("nextAction", "Decide whether to start an application.") }}</dd></div>
        </dl>
      </section>
    }

    @if (tab === 'activity') {
      <section class="detail-section">
        <p class="detail-note">Job activity is shown through linked applications and tasks. No external action is sent from this public demo.</p>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobDetailComponent {
  @Input({ required: true }) record!: XrmRecord;
  @Input() workflow: JobWorkflowState | null = null;
  @Input() saving = false;
  @Output() runAction = new EventEmitter<JobWorkflowActionKey>();
  @Output() createCoverLetterDraft = new EventEmitter<XrmRecord>();

  tab: JobDetailTab = "overview";

  get workflowState() {
    return this.workflow ?? allowedJobActions(this.record);
  }

  field(key: string, fallback = "-") {
    const value = this.record.fields?.[key];
    return value === undefined || value === null || value === "" ? fallback : String(value);
  }

  dateField(key: string, fallback = "-") {
    const value = this.field(key, "");
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString([], { dateStyle: "medium" });
  }

  human(value: unknown) {
    return String(value ?? "-").replace(/[_.-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
