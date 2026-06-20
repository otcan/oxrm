import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { OutreachCompanyRow } from "./models";

@Component({
  selector: "oc-outreach-companies-page",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-toolbar slim">
      <label>
        Search
        <input [ngModel]="search" (ngModelChange)="searchChange.emit($event)" name="companySearch" placeholder="Company, domain, next action">
      </label>
      <button type="button" class="primary" (click)="add.emit()">+ Add lead</button>
    </section>

    <section class="panel product-list-panel">
      <div class="simple-list">
        @for (company of rows; track company.id) {
          <button type="button" class="list-row contact-row action-row" (click)="open.emit(company)">
            <div>
              <strong>{{ company.company }}</strong>
              <span>{{ company.domain || "No domain" }}</span>
              <small>Next: {{ company.nextAction }}</small>
            </div>
            <div class="row-meta">
              <time>{{ company.activePeople }} people · {{ company.activeLeads }} leads</time>
              <small>Last contact: {{ company.lastContact }}</small>
            </div>
          </button>
        } @empty {
          <div class="empty subtle">No companies match this filter.</div>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OutreachCompaniesPageComponent {
  @Input() search = "";
  @Input() rows: OutreachCompanyRow[] = [];
  @Output() searchChange = new EventEmitter<string>();
  @Output() add = new EventEmitter<void>();
  @Output() open = new EventEmitter<OutreachCompanyRow>();
}
