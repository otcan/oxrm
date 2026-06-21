import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { XrmRecord } from "./models";

@Component({
  selector: "oc-add-application-modal",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <section class="modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="add-application-title">
        <header>
          <div>
            <h2 id="add-application-title">Add application</h2>
            <p>Create the application packet and choose the CV you want to use.</p>
          </div>
          <button type="button" (click)="close.emit()">Close</button>
        </header>

        <div class="form-grid">
          <label>Role<input [(ngModel)]="form.role" name="applicationRole" required></label>
          <label>Company<input [(ngModel)]="form.company" name="applicationCompany" required></label>
          <label>Job URL<input [(ngModel)]="form.jobUrl" name="applicationJobUrl" type="url"></label>
          <label>
            Stage
            <select [(ngModel)]="form.stage" name="applicationStage">
              <option>Saved</option>
              <option>Preparing</option>
              <option>Applied</option>
              <option>Interviewing</option>
              <option>Not a fit</option>
              <option>Closed</option>
            </select>
          </label>
          <label>Application date<input [(ngModel)]="form.applicationDate" name="applicationDate" type="date"></label>
          <label>Contact<input [(ngModel)]="form.responsiblePerson" name="applicationContact"></label>
          <label>
            CV to use
            <select [(ngModel)]="form.cvVersion" name="applicationCv">
              <option value="">No CV selected</option>
              @for (cv of cvs; track cv.id) {
                <option [value]="cv.displayName">{{ cv.displayName }}</option>
              }
            </select>
          </label>
          <label>
            Cover letter
            <select [(ngModel)]="form.coverLetterVersion" name="applicationCoverLetter">
              <option value="">Not prepared</option>
              @for (coverLetter of coverLetters; track coverLetter.id) {
                <option [value]="coverLetter.displayName">{{ coverLetterLabel(coverLetter) }}</option>
              }
            </select>
          </label>
          <label>Next action<input [(ngModel)]="form.nextAction" name="applicationNextAction"></label>
          <label>Next-action date<input [(ngModel)]="form.nextActionAt" name="applicationNextDate" type="date"></label>
        </div>

        @if (recommendedCv) {
          <p class="modal-note">{{ recommendedCv }} appears to be the closest match.</p>
        }

        <div class="modal-actions">
          <button type="button" (click)="close.emit()">Cancel</button>
          <button type="button" (click)="saveLater()">Save and prepare later</button>
          <button type="button" class="primary" (click)="create()">Create application</button>
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddApplicationModalComponent implements OnChanges {
  @Input() cvs: XrmRecord[] = [];
  @Input() coverLetters: XrmRecord[] = [];
  @Input() prefill: Record<string, string> | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() createApplication = new EventEmitter<Record<string, string>>();

  form = this.blankForm();

  get recommendedCv() {
    return this.cvs.find((cv) => /platform|backend/i.test(cv.displayName))?.displayName ?? "";
  }

  coverLetterLabel(coverLetter: XrmRecord) {
    const version = coverLetter.fields?.["version"];
    return version ? `${coverLetter.displayName} — ${String(version)}` : coverLetter.displayName;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["prefill"]) {
      this.form = { ...this.blankForm(), ...(this.prefill ?? {}) };
    }
  }

  saveLater() {
    this.form = { ...this.form, stage: "Preparing", nextAction: this.form.nextAction || "Choose CV and prepare application packet" };
    this.create();
  }

  create() {
    this.createApplication.emit(this.form);
  }

  private blankForm() {
    return {
      role: "",
      company: "",
      jobUrl: "",
      stage: "Saved",
      applicationDate: "",
      responsiblePerson: "",
      cvVersion: "",
      coverLetterVersion: "",
      nextAction: "Choose CV and prepare application packet",
      nextActionAt: new Date().toISOString().slice(0, 10)
    };
  }
}
