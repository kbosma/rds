import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LoadStatus } from '../../core/portal/loadable';
import { SectionCardComponent } from './section-card.component';

@Component({
  standalone: true,
  imports: [SectionCardComponent],
  template: `
    <app-section-card titleKey="dashboard.payments.title" icon="payments" [status]="status" [empty]="empty"
                      emptyKey="dashboard.payments.empty" (retry)="retries = retries + 1">
      <p class="inhoud">De inhoud</p>
    </app-section-card>`,
})
class HostComponent {
  status: LoadStatus = 'ready';
  empty = false;
  retries = 0;
}

describe('SectionCardComponent', () => {
  function setup(partial: Partial<HostComponent> = {}) {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    Object.assign(fixture.componentInstance, partial);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, host: fixture.componentInstance };
  }

  it('toont de titel en de inhoud', () => {
    const { el } = setup();

    expect(el.querySelector('h2')?.textContent).toContain('Betalingen');
    expect(el.querySelector('.inhoud')?.textContent).toBe('De inhoud');
    expect(el.querySelector('section')?.getAttribute('aria-labelledby')).toBe(el.querySelector('h2')?.id ?? 'x');
  });

  it('toont tijdens het laden een skeleton in plaats van de inhoud', () => {
    const { el } = setup({ status: 'loading' });

    expect(el.querySelector('.skeleton')).not.toBeNull();
    expect(el.querySelector('.inhoud')).toBeNull();
    expect(el.querySelector('section')?.getAttribute('aria-busy')).toBe('true');
  });

  it('toont bij een fout een melding en een knop om opnieuw te proberen', () => {
    const { fixture, el, host } = setup({ status: 'error' });

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('niet worden geladen');
    (el.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(host.retries).toBe(1);
    expect(el.querySelector('.inhoud')).toBeNull();
  });

  it('toont een lege toestand als er niets is', () => {
    const { el } = setup({ empty: true });

    expect(el.querySelector('.empty')?.textContent).toContain('nog geen betalingen');
    expect(el.querySelector('.inhoud')).toBeNull();
  });

  it('geeft elke kaart een eigen kop-id', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const a = TestBed.createComponent(HostComponent);
    const b = TestBed.createComponent(HostComponent);
    a.detectChanges();
    b.detectChanges();

    expect((a.nativeElement as HTMLElement).querySelector('h2')?.id)
      .not.toBe((b.nativeElement as HTMLElement).querySelector('h2')?.id);
  });
});
