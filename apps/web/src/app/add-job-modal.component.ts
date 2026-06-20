import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "oc-add-job-modal",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <section class="modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="add-job-title">
        <header>
          <div>
            <h2 id="add-job-title">Add job</h2>
            <p>Add the posting first. You can start an application from the job detail.</p>
          </div>
          <button type="button" (click)="close.emit()">Close</button>
        </header>

        <div class="form-grid">
          <label>Role<input [(ngModel)]="form.title" name="jobTitle" required></label>
          <label>Company<input [(ngModel)]="form.company" name="jobCompany" required></label>
          <label>Location<input [(ngModel)]="form.location" name="jobLocation" placeholder="Berlin / Remote"></label>
          <label>Job URL<input [(ngModel)]="form.url" name="jobUrl" type="url"></label>
          <label>
            Source
            <select [(ngModel)]="form.platform" name="jobSource">
              <option>LinkedIn</option>
              <option>Company site</option>
              <option>Wellfound</option>
              <option>Recruiter email</option>
              <option>Manual</option>
            </select>
          </label>
          <label>Published date<input [(ngModel)]="form.publishedAt" name="publishedAt" type="date"></label>
          <label>Date discovered<input [(ngModel)]="form.discoveredAt" name="discoveredAt" type="date"></label>
          <label>
            Match
            <select [(ngModel)]="form.fitRate" name="jobFit">
              <option value="">Not assessed</option>
              <option value="90">Strong</option>
              <option value="70">Possible</option>
              <option value="45">Weak</option>
            </select>
          </label>
          <label class="wide">Notes<textarea [(ngModel)]="form.notes" name="jobNotes" rows="4"></textarea></label>
        </div>

        <div class="modal-actions">
          <button type="button" (click)="close.emit()">Cancel</button>
          <button type="button" class="primary" (click)="create()">Create job</button>
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddJobModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() createJob = new EventEmitter<Record<string, string>>();

  readonly form = {
    title: "",
    company: "",
    location: "",
    url: "",
    platform: "LinkedIn",
    publishedAt: "",
    discoveredAt: new Date().toISOString().slice(0, 10),
    fitRate: "",
    notes: ""
  };

  create() {
    this.createJob.emit(this.form);
  }
}
