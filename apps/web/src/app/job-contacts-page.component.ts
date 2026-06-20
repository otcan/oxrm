import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";

export interface JobContactRow {
  id?: string;
  name: string;
  title: string;
  company: string;
  lastContact?: string | null | undefined;
  linkedApplications: number;
  fallbackApplicationId?: string | undefined;
}

@Component({
  selector: "oc-job-contacts-page",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-toolbar slim">
      <label>
        Search
        <input [ngModel]="search" (ngModelChange)="searchChange.emit($event)" name="contactSearch" placeholder="Name, company, role">
      </label>
      <button type="button" class="primary" (click)="add.emit()">+ Add contact</button>
    </section>

    <section class="panel product-list-panel">
      <div class="simple-list">
        @for (contact of rows; track contact.id || contact.name) {
          <button type="button" class="list-row contact-row action-row" (click)="open.emit(contact)">
            <div>
              <strong>{{ contact.name }}</strong>
              <span>{{ contact.title }} at {{ contact.company }}</span>
              <small>Last contact: {{ contact.lastContact ? formatDate(contact.lastContact) : 'Not recorded' }}</small>
            </div>
            <div class="row-meta">
              <time>{{ contact.linkedApplications }} {{ contact.linkedApplications === 1 ? 'application' : 'applications' }}</time>
            </div>
          </button>
        } @empty {
          <div class="empty subtle">No contacts yet.</div>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobContactsPageComponent {
  @Input() search = "";
  @Input() rows: JobContactRow[] = [];
  @Output() searchChange = new EventEmitter<string>();
  @Output() add = new EventEmitter<void>();
  @Output() open = new EventEmitter<JobContactRow>();

  formatDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString([], { dateStyle: "medium" });
  }
}
