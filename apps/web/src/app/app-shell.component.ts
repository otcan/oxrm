import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { NavDefinition, NavItem, WorkspaceMode } from "./models";

@Component({
  selector: "oc-app-shell",
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="shell" [attr.data-oxrm-mode]="mode">
      <aside class="sidebar" aria-label="Primary">
        <div class="brand">
          <span class="brand-mark">OC</span>
          <div>
            <strong>oXRM</strong>
            <small>Self-hosted outreach</small>
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
          <span aria-hidden="true">⚙</span>
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
  @Output() selectNav = new EventEmitter<NavItem>();
  @Output() settings = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();
}
