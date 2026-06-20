import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { NavDefinition, NavItem, WorkspaceMode } from "./models";

@Component({
  selector: "oc-app-shell",
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="shell" [attr.data-oxrm-mode]="mode">
      @if (demoEnabled) {
        <div class="demo-ribbon">
          <span>Sample workspace</span>
          <button type="button" (click)="guidedTour.emit()">Guided tour</button>
          <button type="button" (click)="runLocal.emit()">Run locally</button>
        </div>
      }
      <aside class="sidebar" aria-label="Primary">
        <div class="brand">
          <span class="brand-mark">oX</span>
          <div>
            <strong>oXRM</strong>
            <small>{{ demoEnabled ? 'Sample data' : 'Self-hosted outreach' }}</small>
          </div>
        </div>

        <nav>
          @for (item of nav; track item.path) {
            <button type="button" [class.active]="item.label === selectedNav" (click)="selectNav.emit(item.label)">
              {{ item.label }}
            </button>
          }
        </nav>

        <button
          type="button"
          class="settings-nav"
          [class.active]="selectedNav === 'Settings' || selectedNav === 'Advanced'"
          (click)="settings.emit()"
          aria-label="Settings"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M19.4 15a8 8 0 0 0 .1-1l2-1.5-2-3.5-2.4 1a7.3 7.3 0 0 0-1.7-1L15 6.5h-4L10.6 9a7.3 7.3 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a8 8 0 0 0 .1 2l-2 1.5 2 3.5 2.4-1a7.3 7.3 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.3 7.3 0 0 0 1.7-1l2.4 1 2-3.5-2.2-1.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
          </svg>
          Settings
        </button>
      </aside>

      <section class="workspace">
        <div class="workspace-grid" [class.no-detail]="!hasDetail">
          <div class="workspace-main">
            <header class="topbar">
              <div>
                <h1>{{ selectedNav }}</h1>
                <p>{{ subtitle }}</p>
              </div>
              @if (backupHealth === 'degraded') {
                <button type="button" class="status-pill warn" (click)="refresh.emit()">
                  Backup degraded
                </button>
              }
            </header>

            <ng-content select="[main]" />
          </div>

          <ng-content select="[detail]" />
        </div>
      </section>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent {
  @Input({ required: true }) mode: WorkspaceMode = "job_search";
  @Input({ required: true }) nav: NavDefinition[] = [];
  @Input({ required: true }) selectedNav: NavItem = "Today";
  @Input({ required: true }) subtitle = "";
  @Input({ required: true }) hasDetail = false;
  @Input({ required: true }) backupHealth: "ok" | "degraded" | "optional" = "optional";
  @Input() demoEnabled = false;
  @Output() selectNav = new EventEmitter<NavItem>();
  @Output() settings = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();
  @Output() guidedTour = new EventEmitter<void>();
  @Output() runLocal = new EventEmitter<void>();
}
