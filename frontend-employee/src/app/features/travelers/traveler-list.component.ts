import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-traveler-list',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <h1>Reizigers</h1>
    <p class="placeholder">Deze pagina wordt binnenkort beschikbaar.</p>
  `,
  styles: [`.placeholder { color: #888; font-style: italic; }`],
})
export class TravelerListComponent {}
