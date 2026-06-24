import { AfterViewInit, Directive, ElementRef, HostListener, inject } from "@angular/core";

@Directive({
  selector: "[ocModalFocusTrap]",
  standalone: true
})
export class ModalFocusTrapDirective implements AfterViewInit {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  ngAfterViewInit() {
    queueMicrotask(() => this.focusableElements()[0]?.focus());
  }

  @HostListener("keydown", ["$event"])
  trapFocus(event: KeyboardEvent) {
    if (event.key !== "Tab") return;
    const elements = this.focusableElements();
    if (elements.length === 0) return;
    const first = elements[0]!;
    const last = elements[elements.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusableElements() {
    return Array.from(
      this.element.nativeElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.hasAttribute("hidden"));
  }
}
