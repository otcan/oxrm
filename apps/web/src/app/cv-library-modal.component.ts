import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { XrmRecord } from "./models";
import { ModalFocusTrapDirective } from "./modal-focus-trap.directive";

@Component({
  selector: "oc-cv-library-modal",
  standalone: true,
  imports: [CommonModule, ModalFocusTrapDirective],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <section ocModalFocusTrap class="modal document-library-modal" (click)="$event.stopPropagation()" (keydown.escape)="close.emit()" role="dialog" aria-modal="true" aria-labelledby="cv-library-title">
        <header>
          <div>
            <h2 id="cv-library-title">CV library</h2>
            @if (targetApplication) {
              <p>Choose the CV to use for <strong>{{ targetApplication.displayName }}</strong>.</p>
            } @else {
              <p>CV versions stay as reusable documents and can be linked to applications.</p>
            }
          </div>
          <button type="button" (click)="close.emit()">Close</button>
        </header>

        <div class="document-list">
          @for (cv of cvs; track cv.id) {
            <article class="document-row">
              <div>
                <span>{{ field(cv, "name", cv.displayName) }}</span>
                <strong>{{ field(cv, "version", "Version") }}</strong>
                <small>Updated {{ dateField(cv, "updatedAt", "recently") }} · Used by {{ usedBy(cv) }} applications</small>
              </div>
              <div class="document-actions">
                @if (targetApplication) {
                  <button type="button" class="primary" [disabled]="saving || isSelected(cv)" (click)="choose.emit(cv)">
                    {{ isSelected(cv) ? "Selected" : "Choose CV" }}
                  </button>
                }
                <button type="button" (click)="open.emit(cv)">Open</button>
                <button type="button" [disabled]="saving" (click)="duplicate.emit(cv)">Duplicate</button>
                <button type="button" [disabled]="saving || isDefault(cv)" (click)="setDefault.emit(cv)">
                  {{ isDefault(cv) ? "Default" : "Set as default" }}
                </button>
                <button type="button" [disabled]="saving" (click)="archive.emit(cv)">Archive</button>
              </div>
            </article>
          } @empty {
            <div class="empty">No CV versions yet.</div>
          }
        </div>
        @if (error) {
          <div class="empty error">{{ error }}</div>
        }
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CvLibraryModalComponent {
  @Input() cvs: XrmRecord[] = [];
  @Input() applications: Array<Record<string, unknown>> = [];
  @Input() targetApplication: XrmRecord | null = null;
  @Input() saving = false;
  @Input() error: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() open = new EventEmitter<XrmRecord>();
  @Output() choose = new EventEmitter<XrmRecord>();
  @Output() duplicate = new EventEmitter<XrmRecord>();
  @Output() setDefault = new EventEmitter<XrmRecord>();
  @Output() archive = new EventEmitter<XrmRecord>();

  field(record: XrmRecord, key: string, fallback = "-") {
    const value = record.fields?.[key];
    return value === undefined || value === null || value === "" ? fallback : String(value);
  }

  dateField(record: XrmRecord, key: string, fallback = "-") {
    const value = this.field(record, key, "");
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? fallback : date.toLocaleDateString([], { dateStyle: "medium" });
  }

  usedBy(cv: XrmRecord) {
    const names = new Set([cv.displayName, this.field(cv, "name", ""), this.field(cv, "version", "")].filter(Boolean));
    return this.applications.filter((application) => names.has(String(application["cvVersion"] ?? ""))).length;
  }

  isSelected(cv: XrmRecord) {
    if (!this.targetApplication) return false;
    const relationships = (this.targetApplication.sourceRelationships ?? []).filter(
      (relationship) => relationship.relationshipType?.key === "application_uses_cv" && relationship.metadata?.["selected"] !== false
    );
    const selectedRelationship = relationships.find((relationship) => relationship.metadata?.["selected"] === true)
      ?? (relationships.length === 1 ? relationships[0] : undefined);
    if (selectedRelationship) return selectedRelationship.targetRecord?.id === cv.id;
    const selected = String(this.targetApplication.fields?.["cvVersion"] ?? "").trim();
    if (!selected) return false;
    return [cv.displayName, this.field(cv, "name", ""), this.field(cv, "version", "")]
      .map((value) => value.trim())
      .filter(Boolean)
      .includes(selected);
  }

  isDefault(cv: XrmRecord) {
    return cv.metadata?.["default"] === true;
  }
}
