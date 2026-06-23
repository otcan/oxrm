import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, SimpleChanges } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { XrmRecord, XrmRecordInput } from "./models";

type DocumentTab = "cv_version" | "cover_letter";

export interface CoverLetterDraftRequest {
  key: string;
  applicationId: string;
  title: string;
  version: string;
  company: string;
  derivedFor: string;
  summary: string;
  body: string;
  editorInstructions: string;
}

export interface DocumentSaveRequest {
  input: XrmRecordInput;
  applicationId?: string;
}

@Component({
  selector: "oc-job-documents-page",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="document-page-tabs" aria-label="Document type">
      <button type="button" [class.active]="tab === 'cv_version'" (click)="switchTab('cv_version')">
        CVs <span>{{ cvs.length }}</span>
      </button>
      <button type="button" [class.active]="tab === 'cover_letter'" (click)="switchTab('cover_letter')">
        Cover letters <span>{{ coverLetters.length }}</span>
      </button>
    </section>

    <section class="documents-workspace">
      <aside class="document-library panel" aria-label="Document library">
        <header>
          <div>
            <h2>{{ tab === 'cv_version' ? 'CV library' : 'Cover letter drafts' }}</h2>
            <p>{{ records.length }} local {{ records.length === 1 ? 'document' : 'documents' }}</p>
          </div>
          <button type="button" class="primary" (click)="startNew()">+ Add</button>
        </header>

        <label class="document-search">
          Search
          <input [ngModel]="searchInput" (ngModelChange)="scheduleSearch($event)" name="documentSearch" placeholder="Title, company, version">
        </label>

        <div class="document-page-list">
          @for (document of pagedRecords; track document.id) {
            <button
              type="button"
              class="document-list-item"
              [class.active]="selectedId === document.id"
              (click)="select(document)"
            >
              <strong>{{ document.displayName }}</strong>
              <span>{{ secondaryLabel(document) }}</span>
              <small>{{ document.fields['derivedFor'] || 'Reusable document' }}</small>
            </button>
          } @empty {
            <div class="empty subtle">No matching documents. Add the first one here.</div>
          }
        </div>
        @if (pageCount > 1) {
          <nav class="document-pagination" aria-label="Document pages">
            <button type="button" [disabled]="page === 1" (click)="setPage(page - 1)">Previous</button>
            <span>Page {{ page }} of {{ pageCount }}</span>
            <button type="button" [disabled]="page === pageCount" (click)="setPage(page + 1)">Next</button>
          </nav>
        }
      </aside>

      <article class="document-page-editor panel">
        <header>
          <div>
            <span class="editor-kicker">{{ selectedId ? 'Editing local document' : 'New local document' }}</span>
            <h2>{{ form.title || (tab === 'cv_version' ? 'Untitled CV' : 'Untitled cover letter') }}</h2>
            <p>Changes stay in oXRM. Review every document before using it in an application.</p>
          </div>
          <div class="header-actions">
            <button type="button" (click)="resetEditor()">Reset</button>
            <button type="button" class="primary" [disabled]="saving || !form.title.trim()" (click)="save()">
              {{ saving ? 'Saving…' : selectedId ? 'Save changes' : 'Create document' }}
            </button>
          </div>
        </header>

        @if (selectedRecord && documentUsages.length > 0) {
          <section class="document-usage" aria-label="Applications using this document">
            <strong>Used by {{ documentUsages.length }} application{{ documentUsages.length === 1 ? '' : 's' }}</strong>
            <div>
              @for (application of documentUsages; track application['id']) {
                <button type="button" (click)="openApplication.emit(applicationId(application))">
                  {{ applicationLabel(application) }}
                </button>
              }
            </div>
          </section>
        }

        <div class="document-page-form">
          <label>
            Title
            <input [(ngModel)]="form.title" name="documentTitle" placeholder="A clear reusable name" required>
          </label>
          <label>
            Version
            <input [(ngModel)]="form.version" name="documentVersion" placeholder="v1 or v1-draft">
          </label>

          @if (tab === 'cv_version') {
            <label>
              Focus
              <input [(ngModel)]="form.focus" name="documentFocus" placeholder="Platform engineering, AI tooling, product leadership…">
            </label>
            <label>
              Tailored for
              <input [(ngModel)]="form.derivedFor" name="documentDerivedFor" placeholder="Role or reusable target profile">
            </label>
            <label class="wide">
              Notes
              <textarea [(ngModel)]="form.notes" name="documentNotes" placeholder="Positioning, evidence to emphasize, and gaps to handle honestly."></textarea>
            </label>
          } @else {
            <label>
              Company
              <input [(ngModel)]="form.company" name="documentCompany" placeholder="Company name">
            </label>
            <label>
              Tailored for
              <input [(ngModel)]="form.derivedFor" name="documentDerivedFor" placeholder="Role at company">
            </label>
            <label class="wide">
              Summary
              <textarea [(ngModel)]="form.summary" name="documentSummary" placeholder="What this draft should communicate and why it fits."></textarea>
            </label>
          }

          <label class="wide document-body-field">
            Document body
            <textarea
              [(ngModel)]="form.body"
              name="documentBody"
              [placeholder]="tab === 'cv_version' ? 'Write or paste the complete CV content here.' : 'Write the complete cover letter draft here.'"
            ></textarea>
            <small>Plain text or Markdown works well. Keep claims specific and verifiable.</small>
          </label>

          <label class="wide">
            Assistant/editor instructions
            <textarea
              [(ngModel)]="form.editorInstructions"
              name="documentInstructions"
              placeholder="Explain what may be tailored, what must remain factual, and what needs human review."
            ></textarea>
          </label>

          <details class="wide document-file-details">
            <summary>File paths and output</summary>
            <div>
              <label>
                Editable source path
                <input [(ngModel)]="form.sourcePath" name="documentSourcePath" placeholder=".data/files/…/source.md">
              </label>
              <label>
                Output path
                <input [(ngModel)]="form.outputPath" name="documentOutputPath" placeholder=".data/files/…/output.pdf">
              </label>
            </div>
          </details>
        </div>

        @if (error) {
          <div class="empty error">{{ error }}</div>
        }
      </article>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobDocumentsPageComponent implements OnChanges, OnDestroy {
  @Input() cvs: XrmRecord[] = [];
  @Input() coverLetters: XrmRecord[] = [];
  @Input() saving = false;
  @Input() error: string | null = null;
  @Input() savedDocumentId = "";
  @Input() newCoverLetter: CoverLetterDraftRequest | null = null;
  @Input() applications: Array<Record<string, unknown>> = [];
  @Output() saveDocument = new EventEmitter<DocumentSaveRequest>();
  @Output() openApplication = new EventEmitter<string>();

  tab: DocumentTab = "cv_version";
  search = "";
  searchInput = "";
  page = 1;
  readonly pageSize = 25;
  selectedId = "";
  selectedRecord: XrmRecord | null = null;
  linkedApplicationId = "";
  form = this.blankForm();
  private cleanSnapshot = JSON.stringify(this.form);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private filteredCache: { records: XrmRecord[]; query: string; result: XrmRecord[] } | null = null;

  get records() {
    return this.tab === "cv_version" ? this.cvs : this.coverLetters;
  }

  get filteredRecords() {
    const query = this.search.trim().toLowerCase();
    const records = this.records;
    if (this.filteredCache?.records === records && this.filteredCache.query === query) return this.filteredCache.result;
    const result = !query ? records : records.filter((record) =>
      `${record.displayName} ${record.fields?.["company"] ?? ""} ${record.fields?.["version"] ?? ""} ${record.fields?.["derivedFor"] ?? ""}`
        .toLowerCase()
        .includes(query)
    );
    this.filteredCache = { records, query, result };
    return result;
  }

  get pageCount() {
    return Math.max(1, Math.ceil(this.filteredRecords.length / this.pageSize));
  }

  get pagedRecords() {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredRecords.slice(start, start + this.pageSize);
  }

  get documentUsages() {
    if (!this.selectedRecord) return [];
    const field = this.tab === "cv_version" ? "cvVersion" : "coverLetterVersion";
    return this.applications.filter((application) => application[field] === this.selectedRecord?.displayName);
  }

  ngOnChanges(changes: SimpleChanges) {
    const coverLetterRequest = changes["newCoverLetter"]?.currentValue as CoverLetterDraftRequest | null | undefined;
    if (coverLetterRequest) {
      this.startCoverLetter(coverLetterRequest);
      return;
    }
    const targetId = changes["savedDocumentId"]?.currentValue || this.selectedId;
    if (!targetId) return;
    const record = [...this.cvs, ...this.coverLetters].find((candidate) => candidate.id === targetId);
    if (record) this.select(record);
  }

  switchTab(tab: DocumentTab) {
    if (!this.confirmDiscard()) return;
    this.tab = tab;
    this.search = "";
    this.searchInput = "";
    this.page = 1;
    this.clearEditor();
  }

  startNew() {
    if (!this.confirmDiscard()) return;
    this.clearEditor();
  }

  private clearEditor() {
    this.selectedId = "";
    this.selectedRecord = null;
    this.linkedApplicationId = "";
    this.form = this.blankForm();
    this.markClean();
  }

  startCoverLetter(request: CoverLetterDraftRequest) {
    if (!this.confirmDiscard()) return;
    this.tab = "cover_letter";
    this.search = "";
    this.selectedId = "";
    this.selectedRecord = null;
    this.linkedApplicationId = request.applicationId;
    this.form = {
      ...this.blankForm(),
      title: request.title,
      version: request.version,
      company: request.company,
      derivedFor: request.derivedFor,
      summary: request.summary,
      body: request.body,
      editorInstructions: request.editorInstructions
    };
    this.cleanSnapshot = JSON.stringify(this.blankForm());
  }

  select(record: XrmRecord) {
    if (record.id !== this.selectedId && !this.confirmDiscard()) return;
    this.tab = record.objectType?.slug === "cover_letter" ? "cover_letter" : "cv_version";
    this.selectedId = record.id;
    this.selectedRecord = record;
    this.linkedApplicationId = "";
    this.form = {
      title: String(record.fields?.["title"] || record.displayName),
      version: String(record.fields?.["version"] || ""),
      company: String(record.fields?.["company"] || ""),
      derivedFor: String(record.fields?.["derivedFor"] || ""),
      focus: String(record.fields?.["focus"] || ""),
      summary: String(record.fields?.["summary"] || ""),
      notes: String(record.fields?.["notes"] || ""),
      body: String(record.fields?.["body"] || ""),
      editorInstructions: String(record.fields?.["editorInstructions"] || ""),
      sourcePath: String(record.fields?.["sourcePath"] || ""),
      outputPath: String(record.fields?.["outputPath"] || "")
    };
    this.markClean();
  }

  resetEditor() {
    if (!this.confirmDiscard()) return;
    if (this.selectedRecord) {
      this.select(this.selectedRecord);
      return;
    }
    this.form = this.blankForm();
  }

  save() {
    const record = this.selectedRecord;
    const fields = {
      ...(record?.fields ?? {}),
      ...this.form,
      lastEditedAt: new Date().toISOString()
    };
    const input: XrmRecordInput = {
      objectType: this.tab,
      ...(record ? { recordId: record.id } : {}),
      ...(record?.externalKey ? { externalKey: record.externalKey } : {}),
      displayName: this.form.title,
      fields,
      status: record?.status ?? "active",
      source: record?.source ?? "web",
      metadata: record?.metadata ?? { templateKey: "job_search", source: "web", draftOnly: true }
    };
    this.markClean();
    this.saveDocument.emit({
      input,
      ...(this.linkedApplicationId ? { applicationId: this.linkedApplicationId } : {})
    });
  }

  secondaryLabel(record: XrmRecord) {
    const version = record.fields?.["version"] ? String(record.fields["version"]) : "Unversioned";
    const company = record.fields?.["company"] ? ` · ${String(record.fields["company"])}` : "";
    return `${version}${company}`;
  }

  scheduleSearch(value: string) {
    this.searchInput = value;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.search = value;
      this.page = 1;
      this.filteredCache = null;
    }, 180);
  }

  setPage(page: number) {
    this.page = Math.min(Math.max(1, page), this.pageCount);
  }

  applicationLabel(application: Record<string, unknown>) {
    const role = String(application["role"] ?? application["displayName"] ?? "Application");
    const company = String(application["company"] ?? "");
    return company ? `${role} at ${company}` : role;
  }

  applicationId(application: Record<string, unknown>) {
    return String(application["id"] ?? "");
  }

  isDirty() {
    return JSON.stringify(this.form) !== this.cleanSnapshot;
  }

  private markClean() {
    this.cleanSnapshot = JSON.stringify(this.form);
  }

  private confirmDiscard() {
    return !this.isDirty() || typeof window === "undefined" || window.confirm("Discard unsaved document changes?");
  }

  @HostListener("window:beforeunload", ["$event"])
  protectUnsavedChanges(event: BeforeUnloadEvent) {
    if (!this.isDirty()) return;
    event.preventDefault();
    event.returnValue = "";
  }

  ngOnDestroy() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  private blankForm() {
    return {
      title: "",
      version: "v1-draft",
      company: "",
      derivedFor: "",
      focus: "",
      summary: "",
      notes: "",
      body: "",
      editorInstructions: "Draft only. Keep claims factual and require human review before using this document externally.",
      sourcePath: "",
      outputPath: ""
    };
  }
}
