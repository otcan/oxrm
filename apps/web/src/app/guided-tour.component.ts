import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";

interface TourStep {
  title: string;
  body: string;
  highlights: string[];
}

const JOB_STEPS: TourStep[] = [
  {
    title: "Jobs",
    body: "This is your opportunity inbox. Search, filter, and decide which jobs are worth your time.",
    highlights: ["Jobs navigation", "One sample job", "Match indicator"]
  },
  {
    title: "Application",
    body: "Start an application, attach the CV you want to use, and track the next action.",
    highlights: ["Start application", "Selected CV", "Application stage"]
  },
  {
    title: "Today",
    body: "oXRM turns applications into an actionable queue, so you always know what to do next.",
    highlights: ["Next actions", "Interview", "Follow-up"]
  },
  {
    title: "AI assistant",
    body: "Your AI assistant can read this context, compare a job against your CV, prepare drafts, and suggest next steps. Nothing is sent automatically.",
    highlights: ["Run locally with AI", "Copy setup command", "Copy starter prompt"]
  }
];

const OUTREACH_STEPS: TourStep[] = [
  {
    title: "Pipeline",
    body: "This is your outreach pipeline. Search, filter, and decide who is worth contacting now.",
    highlights: ["Pipeline navigation", "One sample lead", "Stage lane"]
  },
  {
    title: "Draft",
    body: "Open a lead, review the draft, and decide whether the next action is ready.",
    highlights: ["Lead drawer", "Draft tab", "Needs review"]
  },
  {
    title: "Today",
    body: "oXRM turns outreach into an actionable queue, so you always know who needs contact or follow-up.",
    highlights: ["Next actions", "Reply received", "Follow-up"]
  },
  {
    title: "AI assistant",
    body: "Your AI assistant can read this context, summarize history, prepare drafts, and suggest next steps. Nothing is sent automatically.",
    highlights: ["Run locally with AI", "Copy setup command", "Copy starter prompt"]
  }
];

@Component({
  selector: "oc-guided-tour",
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="tour-panel" aria-live="polite">
      <div class="tour-progress">{{ stepIndex + 1 }} of 4</div>
      <h2>{{ current.title }}</h2>
      <p>{{ current.body }}</p>
      <div class="tour-highlights">
        @for (highlight of current.highlights; track highlight) {
          <span>{{ highlight }}</span>
        }
      </div>
      <div class="tour-actions">
        <button type="button" [disabled]="stepIndex === 0" (click)="back()">Back</button>
        <button type="button" (click)="skip.emit()">Skip</button>
        @if (stepIndex < steps.length - 1) {
          <button type="button" class="primary" (click)="next()">Next</button>
        } @else {
          <button type="button" class="primary" (click)="finish.emit()">Today</button>
        }
      </div>
    </aside>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GuidedTourComponent {
  @Input() mode: "job_search" | "outreach" = "job_search";
  @Output() finish = new EventEmitter<void>();
  @Output() skip = new EventEmitter<void>();

  stepIndex = 0;

  get steps() {
    return this.mode === "outreach" ? OUTREACH_STEPS : JOB_STEPS;
  }

  get current(): TourStep {
    return this.steps[this.stepIndex] ?? this.steps[0]!;
  }

  next() {
    this.stepIndex = Math.min(this.stepIndex + 1, this.steps.length - 1);
  }

  back() {
    this.stepIndex = Math.max(this.stepIndex - 1, 0);
  }
}
