import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { EventRow, ViewDefinition, WorkspaceMode, XrmObjectType } from "./models";
import { ActivityListComponent } from "./activity-list.component";

@Component({
  selector: "oc-settings-page",
  standalone: true,
  imports: [CommonModule, ActivityListComponent],
  template: `
    @if (!advanced) {
      <section class="panels single">
        <article class="panel">
          <header>
            <h2>System</h2>
            <button type="button" (click)="refresh.emit()">Refresh</button>
          </header>
          <div class="queue">
            <div class="queue-row">
              <div>
                <strong>Workspace mode</strong>
                <span>{{ mode === "outreach" ? "Outreach" : "Job Search" }}</span>
              </div>
              <time>active</time>
            </div>
            <div class="queue-row">
              <div>
                <strong>Backup</strong>
                <span>{{ backupHealth }}</span>
              </div>
              <time>health</time>
            </div>
            <button type="button" class="queue-row action-row" (click)="openAdvanced.emit()">
              <div>
                <strong>Advanced</strong>
                <span>Schema, saved views, recent activity, and administration details.</span>
              </div>
              <time>Open</time>
            </button>
          </div>
        </article>
      </section>
    } @else {
      <section class="panels single">
        <article class="panel">
          <header>
            <div>
              <h2>Advanced</h2>
              <p>Developer and administration surfaces stay here so the default workflow stays focused.</p>
            </div>
            <button type="button" (click)="refresh.emit()">Refresh</button>
          </header>
          <div class="advanced-grid">
            <div>
              <strong>{{ objectTypes.length }} record types</strong>
              <span>Dynamic fields and mappings are available through the API and seeded templates.</span>
            </div>
            <div>
              <strong>{{ views.length }} saved views</strong>
              <span>Views remain available to agents and power users without taking over the main UI.</span>
            </div>
            <div>
              <strong>{{ events.length }} recent events</strong>
              <span>Messages, replies, notes, meetings, and approvals are kept as local activity history.</span>
            </div>
          </div>
        </article>

        <article class="panel">
          <header>
            <h2>Recent activity</h2>
          </header>
          <oc-activity-list [events]="events" (open)="openEvent.emit($event)" />
        </article>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPageComponent {
  @Input({ required: true }) mode: WorkspaceMode = "job_search";
  @Input() advanced = false;
  @Input() backupHealth: "ok" | "degraded" | "optional" = "optional";
  @Input() events: EventRow[] = [];
  @Input() objectTypes: XrmObjectType[] = [];
  @Input() views: ViewDefinition[] = [];
  @Output() refresh = new EventEmitter<void>();
  @Output() openAdvanced = new EventEmitter<void>();
  @Output() openEvent = new EventEmitter<EventRow>();
}
