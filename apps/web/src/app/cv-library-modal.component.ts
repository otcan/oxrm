import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { XrmRecord } from "./models";

@Component({
  selector: "oc-cv-library-modal",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <section class="modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="cv-library-title">
        <header>
          <div>
            <h2 id="cv-library-title">CV library</h2>
            <p>CV versions stay as reusable documents and can be linked to applications.</p>
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
                <button type="button" (click)="open.emit(cv)">Open</button>
                <button type="button">Duplicate</button>
                <button type="button">Set as default</button>
                <button type="button">Archive</button>
              </div>
            </article>
          } @empty {
            <div class="empty">No CV versions yet.</div>
          }
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CvLibraryModalComponent {
  @Input() cvs: XrmRecord[] = [];
  @Input() applications: Array<Record<string, unknown>> = [];
  @Output() close = new EventEmitter<void>();
  @Output() open = new EventEmitter<XrmRecord>();

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
}
