import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

@Component({
  standalone: true,
  imports: [EmptyStateComponent],
  template: `
    <app-empty-state icon="hotel" [filtered]="filtered()" message="Nog geen accommodaties.">
      <button class="create">Nieuwe accommodatie</button>
    </app-empty-state>
  `,
})
class HostComponent {
  filtered = signal(false);
}

describe('EmptyStateComponent', () => {
  function render(filtered: boolean): HTMLElement {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.filtered.set(filtered);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('app-empty-state') as HTMLElement;
  }

  it('toont bij een lege lijst de zin, het icoon en de knop om iets aan te maken', () => {
    const el = render(false);
    expect(el.classList).toContain('empty-state');
    expect(el.querySelector('.empty-message')?.textContent).toContain('Nog geen accommodaties.');
    expect(el.querySelector('mat-icon')?.textContent).toContain('hotel');
    expect(el.querySelector('button.create')).not.toBeNull();
  });

  it('zegt bij een zoekopdracht zonder resultaat dat er niets is gevonden, zonder aanmaakknop', () => {
    const el = render(true);
    expect(el.querySelector('.empty-message')?.textContent).toContain('Niets gevonden');
    expect(el.querySelector('button.create')).toBeNull();
  });
});
