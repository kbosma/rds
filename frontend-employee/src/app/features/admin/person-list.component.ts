import { Component } from '@angular/core';

@Component({
  selector: 'app-person-list',
  standalone: true,
  template: `
    <h1>Personen</h1>
    <p class="placeholder">Deze pagina wordt binnenkort beschikbaar.</p>
  `,
  styles: [`.placeholder { color: #888; font-style: italic; }`],
})
export class PersonListComponent {}
