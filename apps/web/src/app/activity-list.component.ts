import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { EventRow } from "./models";

@Component({
  selector: "oc-activity-list",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="queue compact">
      @for (event of events; track event.id) {
        <button type="button" class="queue-row action-row event-row" (click)="open.emit(event)">
          <div>
            <strong>{{ title(event) }}</strong>
            <span>{{ subtitle(event) }}</span>
            @if (snippet(event)) {
              <small>{{ snippet(event) }}</small>
            }
          </div>
          <time>{{ formatDate(event.occurredAt) }}</time>
        </button>
      } @empty {
        <div class="empty subtle">{{ emptyText }}</div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityListComponent {
  @Input() events: EventRow[] = [];
  @Input() emptyText = "No activity recorded.";
  @Output() open = new EventEmitter<EventRow>();

  title(event: EventRow) {
    return event.subject || this.human(event.type);
  }

  subtitle(event: EventRow) {
    return [
      this.human(event.channel),
      this.human(event.direction),
      event.lead?.fullName,
      event.person?.fullName,
      event.company?.name,
      event.xrmRecord?.displayName
    ]
      .filter(Boolean)
      .join(" · ");
  }

  snippet(event: EventRow) {
    const text = event.body || event.metadata?.proposedNote || event.metadata?.rowText || "";
    return String(text).length > 150 ? `${String(text).slice(0, 149)}...` : String(text);
  }

  formatDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString([], { dateStyle: "medium" });
  }

  private human(value: unknown) {
    return String(value ?? "-")
      .replace(/[_.-]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
