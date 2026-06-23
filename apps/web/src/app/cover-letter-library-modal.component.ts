import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { XrmRecord } from "./models";
import { ModalFocusTrapDirective } from "./modal-focus-trap.directive";

@Component({
  selector: "oc-cover-letter-library-modal",
  standalone: true,
  imports: [CommonModule, ModalFocusTrapDirective],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <section ocModalFocusTrap class="modal document-library-modal" (click)="$event.stopPropagation()" (keydown.escape)="close.emit()" role="dialog" aria-modal="true" aria-labelledby="cover-letter-library-title">
        <header>
          <div>
            <h2 id="cover-letter-library-title">Cover letter library</h2>
            <p>Choose the cover letter to use for <strong>{{ targetApplication?.displayName }}</strong>.</p>
          </div>
          <button type="button" (click)="close.emit()">Close</button>
        </header>

        <div class="document-list">
          @for (coverLetter of coverLetters; track coverLetter.id) {
            <article class="document-row">
              <div>
                <span>{{ field(coverLetter, "title", coverLetter.displayName) }}</span>
                <strong>{{ field(coverLetter, "version", "Draft") }}</strong>
                <small>{{ field(coverLetter, "derivedFor", field(coverLetter, "company", "Reusable cover letter")) }}</small>
              </div>
              <div class="document-actions">
                <button
                  type="button"
                  class="primary"
                  [disabled]="saving || isSelected(coverLetter)"
                  (click)="choose.emit(coverLetter)"
                >
                  {{ isSelected(coverLetter) ? "Selected" : "Choose cover letter" }}
                </button>
                <button type="button" (click)="open.emit(coverLetter)">Open</button>
                <button type="button" [disabled]="saving" (click)="duplicate.emit(coverLetter)">Duplicate</button>
                <button type="button" [disabled]="saving" (click)="archive.emit(coverLetter)">Archive</button>
              </div>
            </article>
          } @empty {
            <div class="empty">No cover-letter drafts yet. Close this library and create a draft first.</div>
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
export class CoverLetterLibraryModalComponent {
  @Input() coverLetters: XrmRecord[] = [];
  @Input() targetApplication: XrmRecord | null = null;
  @Input() saving = false;
  @Input() error: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() open = new EventEmitter<XrmRecord>();
  @Output() choose = new EventEmitter<XrmRecord>();
  @Output() duplicate = new EventEmitter<XrmRecord>();
  @Output() archive = new EventEmitter<XrmRecord>();

  field(record: XrmRecord, key: string, fallback = "-") {
    const value = record.fields?.[key];
    return value === undefined || value === null || value === "" ? fallback : String(value);
  }

  isSelected(coverLetter: XrmRecord) {
    const relationships = (this.targetApplication?.sourceRelationships ?? []).filter(
      (relationship) => relationship.relationshipType?.key === "application_uses_cover_letter" && relationship.metadata?.["selected"] !== false
    );
    const selectedRelationship = relationships.find((relationship) => relationship.metadata?.["selected"] === true)
      ?? (relationships.length === 1 ? relationships[0] : undefined);
    if (selectedRelationship) return selectedRelationship.targetRecord?.id === coverLetter.id;
    const selected = String(this.targetApplication?.fields?.["coverLetterVersion"] ?? "").trim();
    if (!selected) return false;
    return [coverLetter.displayName, this.field(coverLetter, "title", ""), this.field(coverLetter, "version", "")]
      .map((value) => value.trim())
      .filter(Boolean)
      .includes(selected);
  }
}
