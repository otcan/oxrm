import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { FilterBarComponent } from "./filter-bar.component";
import { FilterChange, FilterControl, OutreachPipelineRow, ProductStageGroup } from "./models";

@Component({
  selector: "oc-outreach-pipeline-page",
  standalone: true,
  imports: [CommonModule, FilterBarComponent],
  template: `
    <oc-filter-bar
      [search]="search"
      searchPlaceholder="Name, company, role"
      [controls]="controls"
      [total]="total"
      [shown]="shown"
      noun="leads"
      primaryActionLabel="+ Add lead"
      (searchChange)="searchChange.emit($event)"
      (filterChange)="filterChange.emit($event)"
      (clear)="clearFilters.emit()"
      (primaryAction)="add.emit()"
    />

    <section class="stage-board product-board" aria-label="Outreach pipeline">
      @for (group of groups; track group.label) {
        <section class="stage-lane product-lane">
          <header>
            <h3>{{ group.label }}</h3>
            <span>{{ group.rows.length }}</span>
          </header>
          <div class="application-stack">
            @for (row of group.rows; track row['id']) {
              <button type="button" class="application-card compact-card outreach-card" [class.selected]="selectedId === row['id']" (click)="open.emit(asPipeline(row))">
                <div class="application-card-header">
                  <div>
                    <strong>{{ row['name'] }}</strong>
                    <span>{{ row['role'] }} at {{ row['company'] }}</span>
                  </div>
                  <em>{{ row['channel'] }}</em>
                </div>
                <p>Next: {{ row['nextAction'] }}</p>
                <small>Last contact: {{ row['lastContact'] }}</small>
                <div class="badge-row">
                  @for (badge of row['badges'] || []; track badge) {
                    <span>{{ badge }}</span>
                  }
                </div>
              </button>
            }
          </div>
        </section>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OutreachPipelinePageComponent {
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
  @Output() open = new EventEmitter<OutreachPipelineRow>();

  asPipeline(row: Record<string, unknown>) {
    return row as OutreachPipelineRow;
  }
}
