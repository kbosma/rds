import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { Loadable } from './loadable';

describe('Loadable', () => {
  const destroyRef = () => TestBed.inject(DestroyRef);

  it('begint met laden en zonder gegevens', () => {
    const l = new Loadable(() => of(1), destroyRef());

    expect(l.status()).toBe('loading');
    expect(l.data()).toBeNull();
  });

  it('zet de gegevens en meldt klaar', () => {
    const l = new Loadable(() => of([1, 2]), destroyRef());
    const done = jasmine.createSpy('done');

    l.load({ onLoaded: done });

    expect(l.status()).toBe('ready');
    expect(l.data()).toEqual([1, 2]);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('meldt een fout, en laden toont weer de laadtoestand', () => {
    let fail = true;
    const subject = new Subject<number>();
    const l = new Loadable(() => (fail ? throwError(() => new Error('boom')) : subject), destroyRef());

    l.load();
    expect(l.status()).toBe('error');

    fail = false;
    l.load();
    expect(l.status()).toBe('loading');
    subject.next(7);
    expect(l.status()).toBe('ready');
    expect(l.data()).toBe(7);
  });

  it('ververst op de achtergrond zonder de kaart te laten knipperen', () => {
    const subject = new Subject<string>();
    const l = new Loadable<string>(() => subject, destroyRef());
    l.data.set('oud');
    l.status.set('ready');

    l.load({ silent: true });

    expect(l.status()).toBe('ready');
    subject.next('nieuw');
    expect(l.data()).toBe('nieuw');
  });

  it('negeert een fout bij een achtergrondverversing zolang er gegevens zijn', () => {
    const l = new Loadable<string>(() => throwError(() => new Error('boom')), destroyRef());
    l.data.set('oud');
    l.status.set('ready');

    l.load({ silent: true });

    expect(l.status()).toBe('ready');
    expect(l.data()).toBe('oud');
  });

  it('meldt wel een fout als een achtergrondverversing mislukt zonder gegevens', () => {
    const l = new Loadable<string>(() => throwError(() => new Error('boom')), destroyRef());

    l.load({ silent: true });

    expect(l.status()).toBe('error');
  });
});
