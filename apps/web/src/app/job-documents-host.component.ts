import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { JobDocumentsPageComponent } from "./job-documents-page.component";
import type { CoverLetterDraftRequest, DocumentSaveRequest } from "./job-documents-page.component";
import type { XrmRecord } from "./models";

@Component({
  selector: "oc-job-documents-host",
  standalone: true,
  imports: [JobDocumentsPageComponent],
  template: `
    @defer {
      <oc-job-documents-page
        [cvs]="cvs"
        [coverLetters]="coverLetters"
        [applications]="applications"
        [saving]="saving"
        [error]="error"
        [savedDocumentId]="savedDocumentId"
        [newCoverLetter]="newCoverLetter"
        (saveDocument)="saveDocument.emit($event)"
        (openApplication)="openApplication.emit($event)"
      />
    } @placeholder {
      <div class="empty">Loading documents…</div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobDocumentsHostComponent {
  @Input() cvs: XrmRecord[] = [];
  @Input() coverLetters: XrmRecord[] = [];
  @Input() applications: Array<Record<string, unknown>> = [];
  @Input() saving = false;
  @Input() error: string | null = null;
  @Input() savedDocumentId = "";
  @Input() newCoverLetter: CoverLetterDraftRequest | null = null;
  @Output() saveDocument = new EventEmitter<DocumentSaveRequest>();
  @Output() openApplication = new EventEmitter<string>();
}
