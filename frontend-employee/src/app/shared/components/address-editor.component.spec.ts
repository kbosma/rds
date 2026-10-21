import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AddressEditorComponent } from './address-editor.component';
import { Address } from '../models';

/*
 * AddressEditorComponent: lijst + formulier; doet zelf geen API-calls maar meldt create/update/remove.
 */
describe('AddressEditorComponent', () => {
  const address: Address = {
    addressId: 'ad-1', street: 'Ulica', housenumber: 5, housenumberAddition: 'b', postalcode: '2000',
    city: 'Split', country: 'HR', addressrole: 'woon',
    createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: 'o',
  };

  let fixture: ComponentFixture<AddressEditorComponent>;
  let component: AddressEditorComponent;

  function setup(canManage: boolean, addresses: Address[] = [address]) {
    TestBed.configureTestingModule({ imports: [AddressEditorComponent, NoopAnimationsModule] });
    fixture = TestBed.createComponent(AddressEditorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('canManage', canManage);
    fixture.componentRef.setInput('addresses', addresses);
    fixture.detectChanges();
  }

  const el = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement | null;

  it('toont de adressen en bij beheer de knoppen toevoegen/bewerken/verwijderen', () => {
    setup(true);

    expect(fixture.nativeElement.textContent).toContain('Ulica 5b');
    expect(el('.add-address-btn')).toBeTruthy();
    expect(el('.edit-address-btn')).toBeTruthy();
    expect(el('.delete-address-btn')).toBeTruthy();
    expect(el('.add-address-btn')!.classList).toContain('act-create');
    expect(el('.edit-address-btn')!.classList).toContain('act-update');
    expect(el('.delete-address-btn')!.classList).toContain('act-delete');
  });

  it('alleen-lezen: geen knoppen', () => {
    setup(false);

    expect(fixture.nativeElement.textContent).toContain('Ulica 5b');
    expect(el('.add-address-btn')).toBeNull();
    expect(el('.edit-address-btn')).toBeNull();
    expect(el('.delete-address-btn')).toBeNull();
  });

  it('startAdd opent een leeg formulier met de standaardrol', () => {
    setup(true, []);
    fixture.componentRef.setInput('defaultRole', 'factuur');

    component.startAdd();
    fixture.detectChanges();

    expect(component.showForm()).toBeTrue();
    expect(component.form.getRawValue().addressrole).toBe('factuur');
    expect(component.form.invalid).toBeTrue();
  });

  it('opslaan van een nieuw adres meldt create met de ingevulde waarden', () => {
    setup(true, []);
    const created: Partial<Address>[] = [];
    component.create.subscribe(a => created.push(a));
    component.startAdd();
    component.form.patchValue({ street: 'Straat', housenumber: 3, postalcode: '1000', city: 'Amsterdam', country: 'NL' });

    component.save();

    expect(created).toEqual([{
      street: 'Straat', housenumber: 3, housenumberAddition: null, postalcode: '1000', city: 'Amsterdam', country: 'NL', addressrole: 'woon',
    }]);
  });

  it('bewerken vult het formulier en meldt update met het adres-id', () => {
    setup(true);
    const updates: { addressId: string; payload: Partial<Address> }[] = [];
    component.update.subscribe(u => updates.push(u));

    component.startEdit(address);
    component.form.patchValue({ city: 'Zagreb' });
    component.save();

    expect(updates.length).toBe(1);
    expect(updates[0].addressId).toBe('ad-1');
    expect(updates[0].payload.city).toBe('Zagreb');
    expect(updates[0].payload.housenumberAddition).toBe('b');
  });

  it('verwijderen meldt remove met het adres', () => {
    setup(true);
    const removed: Address[] = [];
    component.remove.subscribe(a => removed.push(a));

    (el('.delete-address-btn') as HTMLButtonElement).click();

    expect(removed).toEqual([address]);
  });

  it('een ongeldig formulier meldt niets, en zonder beheer ook niet', () => {
    setup(true, []);
    const created: Partial<Address>[] = [];
    component.create.subscribe(a => created.push(a));
    component.startAdd();
    component.save();
    expect(created).toEqual([]);

    fixture.componentRef.setInput('canManage', false);
    component.form.patchValue({ street: 'S', housenumber: 1, postalcode: 'p', city: 'c', country: 'NL' });
    component.save();
    expect(created).toEqual([]);
  });

  it('close sluit en leegt het formulier', () => {
    setup(true);
    component.startEdit(address);

    component.close();

    expect(component.showForm()).toBeFalse();
    expect(component.editingId()).toBeNull();
    expect(component.form.getRawValue().street).toBeNull();
  });
});
