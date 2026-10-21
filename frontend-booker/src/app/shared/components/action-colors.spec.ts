import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatIconButton } from '@angular/material/button';

/*
 * De kleuren van de actie-iconen (`act-*` in styles.scss) zijn dezelfde als in frontend-employee en zijn een
 * afspraak: ze volgen het risico van de actie en moeten leesbaar blijven, ook onder de grijze waas die ze rustiger
 * maakt. De klant gebruikt alleen `act-info` (bekijken en downloaden), maar het palet blijft in beide apps gelijk.
 */
@Component({
  standalone: true,
  imports: [MatIconButton],
  template: `
    <button mat-icon-button class="act-info">i</button>
    <button mat-icon-button class="act-create">c</button>
    <button mat-icon-button class="act-update">u</button>
    <button mat-icon-button class="act-send">s</button>
    <button mat-icon-button class="act-delete">d</button>
  `,
})
class IconButtonsHostComponent {}

describe('actie-kleuren (act-*)', () => {
  const kinds = ['info', 'create', 'update', 'send', 'delete'] as const;
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });
  afterEach(() => host.remove());

  function rgb(kind: string): [number, number, number] {
    const probe = document.createElement('span');
    probe.style.color = `var(--act-${kind})`;
    host.appendChild(probe);
    const [r, g, b] = getComputedStyle(probe).color.match(/\d+/g)!.map(Number);
    return [r, g, b];
  }

  function luminance([r, g, b]: [number, number, number]): number {
    const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }

  it('geeft elke soort actie een eigen kleur', () => {
    expect(new Set(kinds.map((k) => rgb(k).join(','))).size).toBe(kinds.length);
  });

  it('houdt wijzigen (violet) en verwijderen (rood) goed uit elkaar', () => {
    const [r1, g1, b1] = rgb('update');
    const [r2, g2, b2] = rgb('delete');

    expect(Math.hypot(r1 - r2, g1 - g2, b1 - b2)).toBeGreaterThan(80);
  });

  it('haalt op wit minimaal 4,5 : 1 contrast', () => {
    for (const kind of kinds) {
      expect(1.05 / (luminance(rgb(kind)) + 0.05)).withContext(kind).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('kleurt een echte Material-icoonknop met de bijbehorende kleur', () => {
    const fixture = TestBed.createComponent(IconButtonsHostComponent);
    fixture.detectChanges();

    for (const kind of kinds) {
      const button = (fixture.nativeElement as HTMLElement).querySelector(`button.act-${kind}`) as HTMLElement;
      expect(getComputedStyle(button).color).withContext(kind).toBe(`rgb(${rgb(kind).join(', ')})`);
    }
  });
});
