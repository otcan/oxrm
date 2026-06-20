import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { OutreachPersonRow } from "./models";

@Component({
  selector: "oc-outreach-people-page",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-toolbar slim">
      <label>
        Search
        <input [ngModel]="search" (ngModelChange)="searchChange.emit($event)" name="peopleSearch" placeholder="Name, company, role">
      </label>
      <button type="button" class="primary" (click)="add.emit()">+ Add lead</button>
    </section>

    <section class="panel product-list-panel">
      <div class="simple-list">
        @for (person of rows; track person.id) {
          <button type="button" class="list-row contact-row action-row" (click)="open.emit(person)">
            <div>
              <strong>{{ person.name }}</strong>
              <span>{{ person.role }} at {{ person.company }}</span>
              <small>Last contact: {{ person.lastContact }}</small>
            </div>
            <div class="row-meta">
              <time>{{ person.activeOutreach }} active outreach</time>
            </div>
          </button>
        } @empty {
          <div class="empty subtle">No people match this filter.</div>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OutreachPeoplePageComponent {
  @Input() search = "";
  @Input() rows: OutreachPersonRow[] = [];
  @Output() searchChange = new EventEmitter<string>();
  @Output() add = new EventEmitter<void>();
  @Output() open = new EventEmitter<OutreachPersonRow>();
}
