import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { FilterBarComponent } from "./filter-bar.component";
import { FilterChange, FilterControl, ProductStageGroup } from "./models";

@Component({
  selector: "oc-job-applications-page",
  standalone: true,
  imports: [CommonModule, FilterBarComponent],
  template: `
    <oc-filter-bar
      [search]="search"
      searchPlaceholder="Role, company, contact"
      [controls]="controls"
      [total]="total"
      [shown]="shown"
      noun="applications"
      primaryActionLabel="+ Add application"
      (searchChange)="searchChange.emit($event)"
      (filterChange)="filterChange.emit($event)"
      (clear)="clearFilters.emit()"
      (primaryAction)="add.emit()"
    />

    @if (total !== shown) {
      <p class="result-note">{{ total }} applications · {{ shown }} shown</p>
    }

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
                <p>{{ cvState(row) }}</p>
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
  @Input() controls: FilterControl[] = [];
  @Input() total = 0;
  @Input() shown = 0;
  @Input() groups: ProductStageGroup[] = [];
  @Input() selectedId = "";
  @Output() searchChange = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<FilterChange>();
  @Output() clearFilters = new EventEmitter<void>();
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

  cvState(row: Record<string, unknown>) {
    return this.text(row, "cvVersion", "") ? "CV attached" : "CV missing";
  }

  human(value: unknown) {
    return String(value ?? "-").replace(/[_.-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
