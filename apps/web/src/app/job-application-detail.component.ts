import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { XrmRecord } from "./models";

type ApplicationDetailTab = "overview" | "documents" | "activity";

@Component({
  selector: "oc-job-application-detail",
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="detail-tabs" aria-label="Application detail tabs">
      <button type="button" [class.active]="tab === 'overview'" (click)="tab = 'overview'">Overview</button>
      <button type="button" [class.active]="tab === 'documents'" (click)="tab = 'documents'">Documents</button>
      <button type="button" [class.active]="tab === 'activity'" (click)="tab = 'activity'">Activity</button>
    </section>

    @if (tab === 'overview') {
      <section class="detail-section">
        <dl class="detail-kv">
          <div><dt>Role</dt><dd>{{ field("role", record.displayName) }}</dd></div>
          <div><dt>Company</dt><dd>{{ field("company") }}</dd></div>
          <div><dt>Stage</dt><dd>{{ human(field("stage", "Saved")) }}</dd></div>
          <div><dt>Contact</dt><dd>{{ field("responsiblePerson", "No contact assigned") }}</dd></div>
          <div><dt>Next action</dt><dd>{{ field("nextAction", "Decide next step") }}</dd></div>
          <div><dt>Next-action date</dt><dd>{{ dateField("nextActionAt", "No due date") }}</dd></div>
        </dl>
      </section>
    }

    @if (tab === 'documents') {
      <section class="detail-section">
        <div class="document-row">
          <div>
            <span>CV</span>
            <strong>{{ field("cvVersion", "Not selected") }}</strong>
          </div>
          <button type="button" (click)="openCvLibrary.emit()">Change</button>
        </div>
        <div class="document-row">
          <div>
            <span>Cover letter</span>
            <strong>{{ field("coverLetterVersion", "Not prepared") }}</strong>
          </div>
          <button type="button" [disabled]="saving" (click)="createCoverLetterDraft.emit(record)">
            {{ saving ? "Creating…" : "Create draft" }}
          </button>
        </div>
        @if (field("cvVersion", "") === "") {
          <p class="detail-note warn">No CV is linked to this application. Choose a CV before applying, or continue only after reviewing the risk.</p>
        }
      </section>
    }

    @if (tab === 'activity') {
      <section class="detail-section">
        <p class="detail-note">Use the communication ledger to record sent applications, replies, interviews, rejections, and follow-ups. Nothing is sent automatically.</p>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobApplicationDetailComponent {
  @Input({ required: true }) record!: XrmRecord;
  @Input() saving = false;
  @Output() openCvLibrary = new EventEmitter<void>();
  @Output() createCoverLetterDraft = new EventEmitter<XrmRecord>();

  tab: ApplicationDetailTab = "overview";

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
