import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  selector: "oc-filter-chip",
  standalone: true,
  imports: [CommonModule],
  template: `
    <button type="button" class="filter-chip" (click)="remove.emit()" [attr.aria-label]="'Remove filter ' + label">
      {{ label }} <span aria-hidden="true">x</span>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterChipComponent {
  @Input({ required: true }) label = "";
  @Output() remove = new EventEmitter<void>();
}
