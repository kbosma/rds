import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButton, MatIconButton } from '@angular/material/button';

/*
 * De kleuren van de actie-iconen en -knoppen (`act-*` in styles.scss) zijn een afspraak: ze volgen het risico van
 * de actie en moeten leesbaar blijven, ook onder de grijze waas die ze rustiger maakt. We controleren dat elke soort
 * een eigen kleur heeft, dat de risicovolgorde klopt, dat elke kleur op wit voldoende contrast heeft en dat zowel
 * een icoon-knop als een tekstknop met rand de kleur overneemt.
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

@Component({
  standalone: true,
  imports: [MatButton],
  template: `
    <button mat-stroked-button class="act-info">i</button>
    <button mat-stroked-button class="act-create">c</button>
    <button mat-stroked-button class="act-update">u</button>
    <button mat-stroked-button class="act-send">s</button>
    <button mat-stroked-button class="act-delete">d</button>
  `,
})
class StrokedButtonsHostComponent {}

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

  const contrastOnWhite = (kind: string) => 1.05 / (luminance(rgb(kind)) + 0.05);

  it('geeft elke soort actie een eigen kleur', () => {
    const colors = kinds.map((k) => rgb(k).join(','));

    expect(new Set(colors).size).toBe(kinds.length);
  });

  it('geeft elke soort een herkenbare tint: blauw, groen, violet, oranje-rood, rood', () => {
    // Tint in graden; rood ligt rond 0, dus een rood dat licht naar paars helt (bv. 357) telt als -3.
    const hue = ([r, g, b]: [number, number, number]) => {
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
      if (d === 0) return 0;
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      const degrees = (h * 60 + 360) % 360;
      return degrees > 180 && degrees < 360 && max === r ? degrees - 360 : degrees;
    };

    expect(hue(rgb('info'))).toBeGreaterThan(190);   // blauw
    expect(hue(rgb('create'))).toBeGreaterThan(90);  // groen
    expect(hue(rgb('create'))).toBeLessThan(150);
    expect(hue(rgb('update'))).toBeGreaterThan(240); // violet
    expect(hue(rgb('update'))).toBeLessThan(280);
    expect(hue(rgb('send'))).toBeGreaterThan(10);    // oranje-rood
    expect(hue(rgb('send'))).toBeLessThan(25);
    expect(hue(rgb('delete'))).toBeLessThan(10);     // rood
    expect(hue(rgb('delete'))).toBeGreaterThan(-20);
  });

  it('houdt wijzigen (violet) en verwijderen (rood) goed uit elkaar', () => {
    // Een eerdere amber leek te veel op rood: de gebruiker zag het verschil niet.
    const [r1, g1, b1] = rgb('update');
    const [r2, g2, b2] = rgb('delete');
    const distance = Math.hypot(r1 - r2, g1 - g2, b1 - b2);

    expect(distance).toBeGreaterThan(80);
  });

  it('haalt op wit minimaal 4,5 : 1 contrast, ruim boven de 3 : 1 voor bedieningselementen', () => {
    for (const kind of kinds) {
      expect(contrastOnWhite(kind)).withContext(kind).toBeGreaterThanOrEqual(4.5);
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

  it('kleurt de tekst van een tekstknop met rand met de bijbehorende kleur en maakt de rand zachter', () => {
    const fixture = TestBed.createComponent(StrokedButtonsHostComponent);
    fixture.detectChanges();

    for (const kind of kinds) {
      const button = (fixture.nativeElement as HTMLElement).querySelector(`button.act-${kind}`) as HTMLElement;
      const style = getComputedStyle(button);
      expect(style.color).withContext(kind).toBe(`rgb(${rgb(kind).join(', ')})`);
      // De rand heeft dezelfde tint maar is doorzichtig: dat is de waas over de knop.
      expect(style.borderTopColor).withContext(`${kind} rand`).not.toBe(style.color);
    }
  });
});
