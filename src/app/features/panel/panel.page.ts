import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { ConnectivityService } from '../../core/services/connectivity.service';

@Component({
  selector: 'app-panel-page',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './panel.page.html',
  styleUrl: './panel.page.scss',
})
export class PanelPage {
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly router = inject(Router);

  readonly usuario = this.session.usuario;
  readonly online = this.connectivity.online;
  readonly inicial = computed(() => {
    const u = (this.usuario() || '?').trim();
    return u ? u.charAt(0).toUpperCase() : '?';
  });

  cerrarSesion(): void {
    this.auth.logout();
  }

  ir(path: string): void {
    void this.router.navigateByUrl(path);
  }
}
