import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
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
          <input [(ngModel)]="search" name="documentSearch" placeholder="Title, company, version">
        </label>

        <div class="document-page-list">
          @for (document of filteredRecords; track document.id) {
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
export class JobDocumentsPageComponent implements OnChanges {
  @Input() cvs: XrmRecord[] = [];
  @Input() coverLetters: XrmRecord[] = [];
  @Input() saving = false;
  @Input() error: string | null = null;
  @Input() savedDocumentId = "";
  @Input() newCoverLetter: CoverLetterDraftRequest | null = null;
  @Output() saveDocument = new EventEmitter<DocumentSaveRequest>();

  tab: DocumentTab = "cv_version";
  search = "";
  selectedId = "";
  selectedRecord: XrmRecord | null = null;
  linkedApplicationId = "";
  form = this.blankForm();

  get records() {
    return this.tab === "cv_version" ? this.cvs : this.coverLetters;
  }

  get filteredRecords() {
    const query = this.search.trim().toLowerCase();
    if (!query) return this.records;
    return this.records.filter((record) =>
      `${record.displayName} ${record.fields?.["company"] ?? ""} ${record.fields?.["version"] ?? ""} ${record.fields?.["derivedFor"] ?? ""}`
        .toLowerCase()
        .includes(query)
    );
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
    this.tab = tab;
    this.search = "";
    this.startNew();
  }

  startNew() {
    this.selectedId = "";
    this.selectedRecord = null;
    this.linkedApplicationId = "";
    this.form = this.blankForm();
  }

  startCoverLetter(request: CoverLetterDraftRequest) {
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
  }

  select(record: XrmRecord) {
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
  }

  resetEditor() {
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
