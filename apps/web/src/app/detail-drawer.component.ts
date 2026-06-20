import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import { ActivityListComponent } from "./activity-list.component";
import { EventDetailComponent } from "./event-detail.component";
import { JobApplicationDetailComponent } from "./job-application-detail.component";
import { JobDetailComponent } from "./job-detail.component";
import { LeadDetailComponent } from "./lead-detail.component";
import { TaskDetailComponent } from "./task-detail.component";
import { XrmRecordDetailComponent } from "./xrm-record-detail.component";
import { DetailSelection, EventRow, LeadEditForm, TaskEditForm, WorkspaceMode, XrmRecord, XrmRecordInput } from "./models";

type DetailTab = "overview" | "draft" | "activity";

@Component({
  selector: "oc-detail-drawer",
  standalone: true,
  imports: [CommonModule, ActivityListComponent, EventDetailComponent, JobApplicationDetailComponent, JobDetailComponent, LeadDetailComponent, TaskDetailComponent, XrmRecordDetailComponent],
  template: `
    <aside class="detail-panel" [class.empty-panel]="!selection">
      @if (selection) {
        <header>
          <div>
            <span>{{ kindLabel }}</span>
            <h2>{{ title }}</h2>
          </div>
          <div class="detail-actions">
            @if (selection.kind === "lead") {
              @if (leadDetail?.editing) {
                <button type="button" (click)="leadDetail?.cancel()">Cancel</button>
                <button type="button" class="primary" [disabled]="saving" (click)="leadDetail?.save()">Save</button>
              } @else {
                <button type="button" (click)="leadDetail?.edit()">Edit</button>
              }
            }

            @if (selection.kind === "task") {
              @if (taskDetail?.editing) {
                <button type="button" (click)="taskDetail?.cancel()">Cancel</button>
                <button type="button" class="primary" [disabled]="saving" (click)="taskDetail?.save()">Save</button>
              } @else {
                <button type="button" (click)="taskDetail?.edit()">Edit</button>
              }
            }

            @if (isOutreachLeadRecord(selection)) {
              <button type="button" (click)="createFollowUp.emit(selection.item)">Create follow-up</button>
            }
            <button type="button" (click)="close.emit()">Close</button>
          </div>
        </header>

        @if (loading) {
          <div class="detail-state">Loading detail...</div>
        }

        @if (error) {
          <div class="detail-state error">{{ error }}</div>
        }

        @if (saveError) {
          <div class="detail-state error">{{ saveError }}</div>
        }

        @switch (selection.kind) {
          @case ("lead") {
            <oc-lead-detail
              [lead]="selection.item"
              [activities]="leadActivities"
              [saving]="saving"
              (saveLead)="saveLead.emit($event)"
            />
          }
          @case ("task") {
            <oc-task-detail
              [task]="selection.item"
              [saving]="saving"
              (saveTask)="saveTask.emit($event)"
            />
          }
          @case ("event") {
            <oc-event-detail [event]="selection.item" />
          }
          @case ("record") {
            @if (isOutreachLeadRecordItem(selection.item)) {
              <section class="detail-tabs" aria-label="Lead detail tabs">
                <button type="button" [class.active]="tab === 'overview'" (click)="tab = 'overview'">Overview</button>
                <button type="button" [class.active]="tab === 'draft'" (click)="tab = 'draft'">Draft</button>
                <button type="button" [class.active]="tab === 'activity'" (click)="tab = 'activity'">Activity</button>
              </section>

              @if (tab === 'overview') {
                <section class="detail-section">
                  <dl class="detail-kv">
                    <div>
                      <dt>Person</dt>
                      <dd>{{ field(selection.item, "fullName", selection.item.displayName) }}</dd>
                    </div>
                    <div>
                      <dt>Role</dt>
                      <dd>{{ field(selection.item, "title", field(selection.item, "role")) }}</dd>
                    </div>
                    <div>
                      <dt>Company</dt>
                      <dd>{{ field(selection.item, "company") }}</dd>
                    </div>
                    <div>
                      <dt>Stage</dt>
                      <dd>{{ field(selection.item, "stage", human(field(selection.item, "status"))) }}</dd>
                    </div>
                    <div>
                      <dt>Last contact</dt>
                      <dd>{{ dateField(selection.item, "lastContactAt", "Not contacted") }}</dd>
                    </div>
                    <div>
                      <dt>Next action</dt>
                      <dd>{{ field(selection.item, "nextAction", "Decide next step") }}</dd>
                    </div>
                  </dl>
                  @if (field(selection.item, "notes", "")) {
                    <p class="detail-note">{{ field(selection.item, "notes") }}</p>
                  }
                  @if (field(selection.item, "linkedinUrl", "")) {
                    <a class="external-link" [href]="field(selection.item, 'linkedinUrl')" target="_blank" rel="noreferrer">Open profile</a>
                  }
                </section>
              }

              @if (tab === 'draft') {
                <section class="detail-section">
                  <div class="draft-preview">
                    <span>{{ field(selection.item, "draftStatus", "proposed") }}</span>
                    <strong>{{ field(selection.item, "draftSubject", "Draft message") }}</strong>
                    <p>{{ field(selection.item, "draftBody", "No draft message yet. Ask an agent to prepare one from the lead context.") }}</p>
                  </div>
                  <div class="detail-actions stacked">
                    <button type="button" (click)="editDraft.emit(selection.item)">Edit draft</button>
                    <button type="button" (click)="markApproved.emit(selection.item)">Mark approved</button>
                    <button type="button" (click)="dismiss.emit(selection.item)">Dismiss</button>
                  </div>
                </section>
              }

              @if (tab === 'activity') {
                <section class="detail-section">
                  <oc-activity-list [events]="selection.item.activities ?? []" emptyText="No lead activity recorded yet." />
                </section>
              }

              <details class="advanced-detail">
                <summary>Advanced details</summary>
                <oc-xrm-record-detail
                  [record]="selection.item"
                  [saving]="saving"
                  (openRecord)="openRecord.emit($event)"
                  (saveRecord)="saveRecord.emit($event)"
                />
              </details>
            } @else if (isJobRecord(selection.item)) {
              <oc-job-detail
                [record]="selection.item"
                (startApplication)="startApplicationFromJob.emit($event)"
                (markNotFit)="markJobNotFit.emit($event)"
              />

              <details class="advanced-detail">
                <summary>Advanced details</summary>
                <oc-xrm-record-detail
                  [record]="selection.item"
                  [saving]="saving"
                  (openRecord)="openRecord.emit($event)"
                  (saveRecord)="saveRecord.emit($event)"
                />
              </details>
            } @else if (isApplicationRecord(selection.item)) {
              <oc-job-application-detail
                [record]="selection.item"
                (openCvLibrary)="openCvLibrary.emit()"
              />

              <details class="advanced-detail">
                <summary>Advanced details</summary>
                <oc-xrm-record-detail
                  [record]="selection.item"
                  [saving]="saving"
                  (openRecord)="openRecord.emit($event)"
                  (saveRecord)="saveRecord.emit($event)"
                />
              </details>
            } @else {
              <oc-xrm-record-detail
                [record]="selection.item"
                [saving]="saving"
                (openRecord)="openRecord.emit($event)"
                (saveRecord)="saveRecord.emit($event)"
              />
            }
          }
        }
      } @else {
        <div class="detail-empty">
          <h2>Select an item</h2>
          <p>Click a lead, person, company, task, or activity to inspect it here.</p>
        </div>
      }
    </aside>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DetailDrawerComponent {
  @Input() mode: WorkspaceMode = "job_search";
  @Input() selection: DetailSelection | null = null;
  @Input() leadActivities: EventRow[] = [];
  @Input() loading = false;
  @Input() saving = false;
  @Input() error: string | null = null;
  @Input() saveError: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saveLead = new EventEmitter<LeadEditForm>();
  @Output() saveTask = new EventEmitter<TaskEditForm>();
  @Output() saveRecord = new EventEmitter<XrmRecordInput>();
  @Output() openRecord = new EventEmitter<string>();
  @Output() createFollowUp = new EventEmitter<XrmRecord>();
  @Output() editDraft = new EventEmitter<XrmRecord>();
  @Output() markApproved = new EventEmitter<XrmRecord>();
  @Output() dismiss = new EventEmitter<XrmRecord>();
  @Output() startApplicationFromJob = new EventEmitter<XrmRecord>();
  @Output() markJobNotFit = new EventEmitter<XrmRecord>();
  @Output() openCvLibrary = new EventEmitter<void>();

  @ViewChild(LeadDetailComponent) leadDetail?: LeadDetailComponent;
  @ViewChild(TaskDetailComponent) taskDetail?: TaskDetailComponent;

  tab: DetailTab = "overview";

  get title() {
    const selection = this.selection;
    if (!selection) return "";
    if (selection.kind === "lead") return selection.item.fullName;
    if (selection.kind === "task") return selection.item.title;
    if (selection.kind === "record") return selection.item.displayName;
    return selection.item.subject || selection.item.type;
  }

  get kindLabel() {
    const selection = this.selection;
    if (!selection) return "";
    if (selection.kind === "record") {
      return selection.item.objectType?.label || "record";
    }
    if (selection.kind === "lead") return "lead";
    if (selection.kind === "task") return "task";
    return "activity";
  }

  isOutreachLeadRecord(selection: DetailSelection): selection is { kind: "record"; item: XrmRecord } {
    return selection.kind === "record" && this.isOutreachLeadRecordItem(selection.item);
  }

  isOutreachLeadRecordItem(record: XrmRecord) {
    return this.mode === "outreach" && record.objectType?.slug === "lead";
  }

  isJobRecord(record: XrmRecord) {
    return this.mode === "job_search" && record.objectType?.slug === "job";
  }

  isApplicationRecord(record: XrmRecord) {
    return this.mode === "job_search" && record.objectType?.slug === "application";
  }

  field(record: XrmRecord, key: string, fallback = "-") {
    const value = record.fields?.[key];
    if (value === undefined || value === null || value === "") return fallback;
    return typeof value === "object" ? JSON.stringify(value) : String(value);
  }

  dateField(record: XrmRecord, key: string, fallback = "-") {
    const value = this.field(record, key, "");
    if (!value) return fallback;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString([], { dateStyle: "medium" });
  }

  human(value: unknown) {
    return String(value ?? "-")
      .replace(/[_.-]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
