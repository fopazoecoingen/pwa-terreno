import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SessionService } from '../../../core/services/session.service';
import { ConnectivityService } from '../../../core/services/connectivity.service';
import { OfflineStoreService } from '../../../core/services/offline-store.service';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';

@Component({
  selector: 'app-terreno-modulo-page',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './terreno-modulo.page.html',
  styleUrl: './terreno-modulo.page.scss',
})
export class TerrenoModuloPage implements OnInit {
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly store = inject(OfflineStoreService);
  private readonly sync = inject(OfflineSyncService);
  private readonly snack = inject(MatSnackBar);

  readonly usuario = this.session.usuario;
  readonly online = this.connectivity.online;
  readonly borradores = signal(0);
  readonly pendientes = signal(0);
  readonly syncing = signal(false);
  readonly inicial = computed(() => {
    const u = (this.usuario() || '?').trim();
    return u ? u.charAt(0).toUpperCase() : '?';
  });

  async ngOnInit(): Promise<void> {
    await this.actualizarContadores();
  }

  async actualizarContadores(): Promise<void> {
    const uid = this.session.usuarioId();
    if (!uid) {
      this.borradores.set(0);
      this.pendientes.set(0);
      return;
    }
    this.borradores.set(await this.store.contarBorradores(uid));
    this.pendientes.set(await this.store.contarPendientes(uid));
  }

  async sincronizar(): Promise<void> {
    this.syncing.set(true);
    try {
      const r = await this.sync.sincronizarPendientes();
      if (r.sinConexion) {
        this.snack.open('Sin conexión.', 'Cerrar', { duration: 3000 });
      } else {
        this.snack.open(
          `Sincronizados: ${r.sincronizados}. Errores: ${r.conError}.`,
          'Cerrar',
          { duration: 4000 },
        );
      }
      await this.actualizarContadores();
    } finally {
      this.syncing.set(false);
    }
  }

  volver(): void {
    void this.router.navigateByUrl('/panel');
  }

  ir(path: string): void {
    void this.router.navigateByUrl(path);
  }
}
