import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { ProductActionItem } from "./models";

@Component({
  selector: "oc-next-actions-list",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="simple-list">
      @for (item of actions; track item.kind + item.id) {
        <button type="button" class="list-row action-row" [class.suggested]="item.badge" (click)="openAction.emit(item)">
          <div>
            <strong>{{ item.title }}</strong>
            <span>{{ item.context }}</span>
          </div>
          <div class="row-meta">
            @if (item.badge) {
              <em>{{ item.badge }}</em>
            }
            <time>{{ dueLabel(item) }}</time>
          </div>
        </button>
      } @empty {
        <div class="empty subtle">{{ emptyText }}</div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NextActionsListComponent {
  @Input() actions: ProductActionItem[] = [];
  @Input() emptyText = "No next actions.";
  @Output() openAction = new EventEmitter<ProductActionItem>();

  dueLabel(item: ProductActionItem) {
    if (!item.dueAt) {
      return "Review";
    }
    const timestamp = new Date(item.dueAt).getTime();
    if (Number.isNaN(timestamp)) {
      return "Review";
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (timestamp < today.getTime()) {
      return "Overdue";
    }
    if (timestamp < tomorrow.getTime()) {
      return "Due today";
    }
    return new Date(item.dueAt).toLocaleDateString([], { dateStyle: "medium" });
  }
}
