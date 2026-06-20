import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { OutreachPipelineRow, ProductStageGroup } from "./models";

@Component({
  selector: "oc-outreach-pipeline-page",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-toolbar">
      <label>
        Search
        <input [ngModel]="search" (ngModelChange)="searchChange.emit($event)" name="pipelineSearch" placeholder="Name, company, role">
      </label>
      <label>
        Stage
        <select [ngModel]="stageFilter" (ngModelChange)="stageFilterChange.emit($event)" name="pipelineStage">
          <option value="all">All stages</option>
          @for (stage of stages; track stage) {
            <option [value]="stage">{{ stage }}</option>
          }
        </select>
      </label>
      <button type="button" class="primary" (click)="add.emit()">+ Add lead</button>
    </section>

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
                  <em>{{ row['stage'] }}</em>
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
  @Input() stageFilter = "all";
  @Input() stages: string[] = [];
  @Input() groups: ProductStageGroup[] = [];
  @Input() selectedId = "";
  @Output() searchChange = new EventEmitter<string>();
  @Output() stageFilterChange = new EventEmitter<string>();
  @Output() add = new EventEmitter<void>();
  @Output() open = new EventEmitter<OutreachPipelineRow>();

  asPipeline(row: Record<string, unknown>) {
    return row as OutreachPipelineRow;
  }
}
