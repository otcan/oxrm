import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { FilterChange, FilterControl } from "./models";
import { FilterChipComponent } from "./filter-chip.component";

@Component({
  selector: "oc-filter-bar",
  standalone: true,
  imports: [CommonModule, FormsModule, FilterChipComponent],
  template: `
    <section class="filter-bar" aria-label="Filters">
      <div class="filter-primary">
        <label class="filter-search">
          Search
          <input
            [ngModel]="draftSearch"
            (ngModelChange)="setSearch($event)"
            name="filterSearch"
            [placeholder]="searchPlaceholder"
            type="search"
          >
        </label>

        @for (control of visibleControls; track control.key) {
          <label>
            {{ control.label }}
            <select [ngModel]="control.value" (ngModelChange)="setFilter(control.key, $event)" [name]="'filter-' + control.key">
              @for (option of control.options; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>
        }

        @if (moreControls.length) {
          <details class="more-filters">
            <summary>More filters</summary>
            <div class="more-filter-grid">
              @for (control of moreControls; track control.key) {
                <label>
                  {{ control.label }}
                  <select [ngModel]="control.value" (ngModelChange)="setFilter(control.key, $event)" [name]="'filter-more-' + control.key">
                    @for (option of control.options; track option.value) {
                      <option [value]="option.value">{{ option.label }}</option>
                    }
                  </select>
                </label>
              }
            </div>
          </details>
        }

        <button type="button" class="primary" (click)="primaryAction.emit()">{{ primaryActionLabel }}</button>
      </div>

      <div class="filter-feedback">
        <span>{{ totalLabel }}</span>
        <strong>{{ shownLabel }}</strong>
      </div>

      @if (activeChips.length) {
        <div class="active-filter-row" aria-label="Active filters">
          @for (chip of activeChips; track chip.key) {
            <oc-filter-chip [label]="chip.label" (remove)="removeChip(chip.key)" />
          }
          <button type="button" class="clear-filters" (click)="clear.emit()">Clear all</button>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterBarComponent implements OnChanges {
  @Input() search = "";
  @Input() searchPlaceholder = "Search";
  @Input() controls: FilterControl[] = [];
  @Input() total = 0;
  @Input() shown = 0;
  @Input() noun = "items";
  @Input() primaryActionLabel = "+ Add";
  @Output() searchChange = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<FilterChange>();
  @Output() clear = new EventEmitter<void>();
  @Output() primaryAction = new EventEmitter<void>();

  draftSearch = "";
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes["search"] && this.search !== this.draftSearch) {
      this.draftSearch = this.search;
    }
  }

  get visibleControls() {
    return this.controls.filter((control) => !control.more);
  }

  get moreControls() {
    return this.controls.filter((control) => control.more);
  }

  get totalLabel() {
    return `${this.total} ${this.noun}`;
  }

  get shownLabel() {
    return `${this.shown} shown`;
  }

  get activeChips() {
    const chips = [];
    if (this.search.trim()) {
      chips.push({ key: "q", label: this.search.trim() });
    }
    for (const control of this.controls) {
      if (control.value !== control.defaultValue) {
        const label = control.options.find((option) => option.value === control.value)?.label ?? control.value;
        chips.push({ key: control.key, label });
      }
    }
    return chips;
  }

  setSearch(value: string) {
    this.draftSearch = value;
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => this.searchChange.emit(this.draftSearch), 250);
  }

  setFilter(key: string, value: string) {
    this.filterChange.emit({ key, value });
  }

  removeChip(key: string) {
    if (key === "q") {
      this.draftSearch = "";
      this.searchChange.emit("");
      return;
    }
    const control = this.controls.find((item) => item.key === key);
    if (control) {
      this.filterChange.emit({ key, value: control.defaultValue });
    }
  }
}
