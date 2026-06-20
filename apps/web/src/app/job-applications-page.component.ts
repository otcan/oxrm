import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ProductStageGroup } from "./models";

@Component({
  selector: "oc-job-applications-page",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-toolbar">
      <label>
        Search
        <input [ngModel]="search" (ngModelChange)="searchChange.emit($event)" name="applicationSearch" placeholder="Role, company, contact">
      </label>
      <label>
        Stage
        <select [ngModel]="stageFilter" (ngModelChange)="stageFilterChange.emit($event)" name="applicationStage">
          <option value="all">All stages</option>
          <option value="Saved">Saved</option>
          <option value="Preparing">Preparing</option>
          <option value="Applied">Applied</option>
          <option value="Interviewing">Interviewing</option>
          <option value="Closed">Closed</option>
        </select>
      </label>
      <button type="button" class="primary" (click)="add.emit()">+ Add application</button>
    </section>

    <section class="stage-board product-board" aria-label="Applications by stage">
      @for (group of groups; track group.label) {
        <section class="stage-lane product-lane">
          <header>
            <h3>{{ group.label }}</h3>
            <span>{{ group.rows.length }}</span>
          </header>
          <div class="application-stack">
            @for (row of group.rows; track row['id']) {
              <button type="button" class="application-card compact-card" [class.selected]="selectedId === text(row, 'id')" (click)="open.emit(row)">
                <div class="application-card-header">
                  <div>
                    <strong>{{ text(row, 'role') }}</strong>
                    <span>{{ text(row, 'company') }}</span>
                  </div>
                  <em [class.good]="fitTone(row) === 'good'" [class.warn]="fitTone(row) === 'warn'" [class.muted]="fitTone(row) === 'muted'">
                    {{ fitLabel(row) }}
                  </em>
                </div>
                <p>{{ human(row['stage']) }}</p>
                <span>Next: {{ text(row, 'nextAction', 'Decide next step') }}</span>
                <small>Contact: {{ text(row, 'responsiblePerson', 'No contact assigned') }}</small>
              </button>
            }
          </div>
        </section>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobApplicationsPageComponent {
  @Input() search = "";
  @Input() stageFilter = "all";
  @Input() groups: ProductStageGroup[] = [];
  @Input() selectedId = "";
  @Output() searchChange = new EventEmitter<string>();
  @Output() stageFilterChange = new EventEmitter<string>();
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
