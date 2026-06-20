import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { Metric, ProductActionItem, ViewRow, WorkspaceMode } from "./models";
import { NextActionsListComponent } from "./next-actions-list.component";
import { SummaryMetricsComponent } from "./summary-metrics.component";

@Component({
  selector: "oc-today-page",
  standalone: true,
  imports: [CommonModule, NextActionsListComponent, SummaryMetricsComponent],
  template: `
    <section class="today-heading">
      <div>
        <h2>{{ actions.length }} {{ actions.length === 1 ? 'thing needs' : 'things need' }} your attention</h2>
      </div>
      <button type="button" class="primary" (click)="primaryAction.emit()">{{ primaryActionLabel }}</button>
    </section>

    <oc-summary-metrics [label]="mode === 'outreach' ? 'Outreach summary' : 'Job search summary'" [metrics]="metrics" />

    <section class="today-grid">
      <article class="panel next-actions-panel">
        <header>
          <div>
            <h2>Next actions</h2>
            <p>Overdue first, then today, then upcoming.</p>
          </div>
        </header>
        <oc-next-actions-list [actions]="actions" [emptyText]="emptyText" (openAction)="openAction.emit($event)" />
      </article>

      <aside class="today-side">
        @if (mode === 'outreach') {
          @if (recentlyEngaged.length) {
            <article class="panel compact-panel">
              <h2>Recently engaged</h2>
              @for (row of recentlyEngaged; track row['id']) {
                <button type="button" class="mini-row action-row" (click)="openRecent.emit(row)">
                  <strong>{{ text(row, 'subject') }}</strong>
                  <span>{{ text(row, 'occurredLabel') }}</span>
                </button>
              }
            </article>
          }
          <article class="panel compact-panel">
            <h2>Pipeline</h2>
            <div class="summary-line">
              <strong>{{ outreachPipelineSummary.active }} active</strong>
              <span>{{ outreachPipelineSummary.waiting }} waiting · {{ outreachPipelineSummary.engaged }} engaged</span>
            </div>
            <button type="button" (click)="openSecondary.emit()">Open pipeline</button>
          </article>
        } @else {
          @if (upcomingTitle) {
            <article class="panel compact-panel">
              <h2>Upcoming</h2>
              <button type="button" class="mini-row action-row" (click)="openUpcoming.emit()">
                <strong>{{ upcomingTitle }}</strong>
                <span>{{ upcomingDate }}</span>
              </button>
            </article>
          }

          <article class="panel compact-panel">
            <h2>Applications</h2>
            <div class="summary-line">
              <strong>{{ applicationCounts.active }} active</strong>
              <span>{{ applicationCounts.waiting }} waiting · {{ applicationCounts.interviewing }} interviewing</span>
            </div>
            <button type="button" (click)="openSecondary.emit()">Open applications</button>
          </article>
        }
      </aside>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TodayPageComponent {
  @Input({ required: true }) mode: WorkspaceMode = "job_search";
  @Input() primaryActionLabel = "+ Add application";
  @Input() metrics: Metric[] = [];
  @Input() actions: ProductActionItem[] = [];
  @Input() emptyText = "No next actions.";
  @Input() applicationCounts = { active: 0, waiting: 0, interviewing: 0 };
  @Input() upcomingTitle = "";
  @Input() upcomingDate = "";
  @Input() outreachPipelineSummary = { active: 0, waiting: 0, engaged: 0 };
  @Input() recentlyEngaged: ViewRow[] = [];
  @Output() primaryAction = new EventEmitter<void>();
  @Output() openAction = new EventEmitter<ProductActionItem>();
  @Output() openSecondary = new EventEmitter<void>();
  @Output() openUpcoming = new EventEmitter<void>();
  @Output() openRecent = new EventEmitter<ViewRow>();

  text(row: Record<string, unknown>, key: string) {
    const value = row[key];
    return value === undefined || value === null || value === "" ? "-" : String(value);
  }
}
