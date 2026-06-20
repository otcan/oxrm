import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Output, signal } from "@angular/core";

const SETUP_COMMAND = `git clone https://github.com/otcan/oxrm.git
cd oxrm
./oxrm codex-demo
codex`;

const STARTER_PROMPT = `Review my active jobs and applications.

Compare promising jobs against the CV linked to each application.
Prioritize what needs attention today.
Draft the next action where useful.

Do not send anything.
Ask before modifying records.`;

@Component({
  selector: "oc-connect-ai-modal",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <section class="modal ai-modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="connect-ai-title">
        <header>
          <div>
            <h2 id="connect-ai-title">Run locally with AI</h2>
            <p>Use the public demo to learn the workflow. Connect an assistant only to your own local oXRM instance.</p>
          </div>
          <button type="button" (click)="close.emit()">Close</button>
        </header>

        <section class="copy-panel">
          <div>
            <h3>Codex setup</h3>
            <button type="button" (click)="copy(SETUP_COMMAND)">Copy command</button>
          </div>
          <pre>{{ SETUP_COMMAND }}</pre>
        </section>

        <section class="copy-panel">
          <div>
            <h3>Starter prompt</h3>
            <button type="button" (click)="copy(STARTER_PROMPT)">Copy prompt</button>
          </div>
          <pre>{{ STARTER_PROMPT }}</pre>
        </section>

        <p class="modal-note">
          The shared public demo is read-only guidance for the workflow. Real AI work should happen on your local instance with your own data.
        </p>

        @if (copied()) {
          <div class="toast inline">Copied</div>
        }
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConnectAiModalComponent {
  @Output() close = new EventEmitter<void>();
  readonly copied = signal(false);
  readonly SETUP_COMMAND = SETUP_COMMAND;
  readonly STARTER_PROMPT = STARTER_PROMPT;

  async copy(value: string) {
    await navigator.clipboard?.writeText(value).catch(() => undefined);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1800);
  }
}
