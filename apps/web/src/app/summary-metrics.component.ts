import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { Metric } from "./models";

@Component({
  selector: "oc-summary-metrics",
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="metrics compact" [attr.aria-label]="label">
      @for (metric of metrics; track metric.label) {
        <article class="metric" [class.good]="metric.tone === 'good'" [class.warn]="metric.tone === 'warn'">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
        </article>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SummaryMetricsComponent {
  @Input() label = "Summary";
  @Input() metrics: Metric[] = [];
}
