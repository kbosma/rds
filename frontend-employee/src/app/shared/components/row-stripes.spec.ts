import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

/*
 * De om-en-om tint van tabelrijen en van lijsten met `zebra-rows` (styles.scss) is bewust zacht: lichter dan de
 * tabelkop en veel lichter dan de hover, zodat de regels te onderscheiden zijn zonder dat de tint de aandacht trekt.
 */
@Component({
  standalone: true,
  template: `
    <table class="mat-mdc-table">
      <thead><tr class="mat-mdc-header-row"><th>kop</th></tr></thead>
      <tbody>
        <tr class="mat-mdc-row"><td>1</td></tr>
        <tr class="mat-mdc-row"><td>2</td></tr>
        <tr class="mat-mdc-row"><td>3</td></tr>
      </tbody>
    </table>
    <ul class="zebra-rows">
      <li>1</li><li>2</li><li>3</li>
    </ul>
  `,
})
class StripedHostComponent {}

describe('om-en-om rijtint', () => {
  let host: HTMLElement;

  beforeEach(() => {
    const fixture = TestBed.createComponent(StripedHostComponent);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
    document.body.appendChild(host);
  });
  afterEach(() => host.remove());

  const background = (el: Element) => getComputedStyle(el).backgroundColor;
  const token = (name: string) => {
    const probe = document.createElement('span');
    probe.style.backgroundColor = `var(${name})`;
    host.appendChild(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  };
  /** Kanalen 0-255 uit `rgb(...)` of uit `color(srgb ...)`, waarin Firefox een `color-mix` teruggeeft (0-1). */
  const rgb = (css: string) => css.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((c) => (css.startsWith('color(') ? c * 255 : c));
  /** Hoeveel een kleur van wit afwijkt (0 = wit): 3 kanalen, elk 0-255. */
  const tint = (css: string) => rgb(css).reduce((sum, c) => sum + (255 - c), 0);

  it('kleurt in een tabel alleen de even rijen', () => {
    const rows = Array.from(host.querySelectorAll('tr.mat-mdc-row'));

    expect(background(rows[0])).toBe('rgba(0, 0, 0, 0)');
    expect(background(rows[1])).toBe(token('--ui-primary-faint'));
    expect(background(rows[2])).toBe('rgba(0, 0, 0, 0)');
  });

  it('kleurt in een lijst met zebra-rows dezelfde even regels', () => {
    const items = Array.from(host.querySelectorAll('.zebra-rows > li'));

    expect(background(items[0])).toBe('rgba(0, 0, 0, 0)');
    expect(background(items[1])).toBe(token('--ui-primary-faint'));
    expect(background(items[2])).toBe('rgba(0, 0, 0, 0)');
  });

  it('houdt de tint zacht: lichter dan de tabelkop en lichter dan de hover', () => {
    expect(tint(token('--ui-primary-faint'))).toBeGreaterThan(0);
    expect(tint(token('--ui-primary-faint'))).toBeLessThan(tint(token('--ui-primary-soft')));
    expect(tint(token('--ui-primary-faint'))).toBeLessThan(tint(token('--ui-primary-hover')));
  });

  it('is zachter dan de eerdere tint van 8%', () => {
    const wasEightPercent = tint(`rgb(${rgb(token('--theme-primary')).map((c) => 255 * 0.92 + c * 0.08).join(',')})`);

    expect(tint(token('--ui-primary-faint'))).toBeLessThan(wasEightPercent);
  });
});
