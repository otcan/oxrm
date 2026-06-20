import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "oc-job-jobs-page",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-toolbar">
      <label>
        Search
        <input [ngModel]="search" (ngModelChange)="searchChange.emit($event)" name="jobSearch" placeholder="Role, company, location">
      </label>
      <label>
        Match
        <select [ngModel]="matchFilter" (ngModelChange)="matchFilterChange.emit($event)" name="jobMatch">
          <option value="all">All matches</option>
          <option value="strong">Strong match</option>
          <option value="possible">Possible match</option>
          <option value="weak">Weak match</option>
          <option value="not">Not assessed</option>
        </select>
      </label>
      <button type="button" class="primary" (click)="add.emit()">+ Add job</button>
    </section>

    <section class="panel product-list-panel">
      <div class="simple-list">
        @for (row of rows; track row['id']) {
          <button type="button" class="list-row job-row action-row" [class.selected]="selectedId === text(row, 'id')" (click)="open.emit(row)">
            <div>
              <strong>{{ text(row, 'title') }}</strong>
              <span>{{ text(row, 'company') }} · {{ text(row, 'location') }}</span>
              <small>{{ text(row, 'platform') }} · {{ human(row['applicationStage']) }}</small>
            </div>
            <div class="row-meta">
              <em [class.good]="fitTone(row) === 'good'" [class.warn]="fitTone(row) === 'warn'" [class.muted]="fitTone(row) === 'muted'">
                {{ fitLabel(row) }}
              </em>
              <time>{{ text(row, 'lastTouchAt', 'Saved') }}</time>
            </div>
          </button>
        } @empty {
          <div class="empty subtle">No jobs match this filter.</div>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobJobsPageComponent {
  @Input() search = "";
  @Input() matchFilter = "all";
  @Input() rows: Array<Record<string, unknown>> = [];
  @Input() selectedId = "";
  @Output() searchChange = new EventEmitter<string>();
  @Output() matchFilterChange = new EventEmitter<string>();
  @Output() add = new EventEmitter<void>();
  @Output() open = new EventEmitter<Record<string, unknown>>();

  text(row: Record<string, unknown>, key: string, fallback = "-") {
    const value = row[key];
    return value === undefined || value === null || value === "" ? fallback : String(value);
  }

  fitRate(row: Record<string, unknown>) {
    const value = Number(row["fitRate"] ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  fitLabel(row: Record<string, unknown>) {
    const value = this.fitRate(row);
    if (value >= 85) return "Strong match";
    if (value >= 65) return "Possible match";
    if (value > 0) return "Weak match";
    return "Not assessed";
  }

  fitTone(row: Record<string, unknown>) {
    const value = this.fitRate(row);
    if (value >= 85) return "good";
    if (value >= 65) return "warn";
    return "muted";
  }

  human(value: unknown) {
    return String(value ?? "-").replace(/[_.-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
