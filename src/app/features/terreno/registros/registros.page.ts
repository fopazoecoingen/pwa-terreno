import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TerrenoApiService } from '../../../core/services/terreno-api.service';
import { OfflineStoreService } from '../../../core/services/offline-store.service';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';
import { SessionService } from '../../../core/services/session.service';
import { ConnectivityService } from '../../../core/services/connectivity.service';
import { RegistroTerreno } from '../../../core/models/terreno.model';
import type { RegistroLocal } from '../../../core/models/offline-registro.model';
import { mensajeErrorHttp } from '../../../core/utils/http-error';

@Component({
  selector: 'app-registros-page',
  standalone: true,
  imports: [
    DatePipe,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './registros.page.html',
  styleUrl: './registros.page.scss',
})
export class RegistrosPage implements OnInit {
  private readonly api = inject(TerrenoApiService);
  private readonly store = inject(OfflineStoreService);
  private readonly sync = inject(OfflineSyncService);
  private readonly session = inject(SessionService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  readonly cargando = signal(false);
  readonly sincronizando = signal(false);
  readonly registros = signal<RegistroTerreno[]>([]);
  readonly locales = signal<RegistroLocal[]>([]);
  readonly online = this.connectivity.online;
  readonly desdeCache = signal(false);

  ngOnInit(): void {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.desdeCache.set(false);
    const usuarioId = this.session.usuarioId();
    try {
      if (usuarioId) {
        this.locales.set(
          (await this.store.listarRegistrosUsuario(usuarioId)).filter(
            (r) => r.estadoSync !== 'sincronizado',
          ),
        );
      }

      if (this.online()) {
        const lista = await new Promise<RegistroTerreno[]>((resolve, reject) => {
          this.api.listarRegistros().subscribe({ next: resolve, error: reject });
        });
        this.registros.set(lista);
        if (usuarioId) await this.store.cachearRegistrosServidor(usuarioId, lista);
      } else if (usuarioId) {
        const cache = await this.store.leerRegistrosServidorCache(usuarioId);
        this.registros.set(cache);
        this.desdeCache.set(true);
      }
    } catch (err) {
      if (usuarioId) {
        const cache = await this.store.leerRegistrosServidorCache(usuarioId);
        this.registros.set(cache);
        this.desdeCache.set(true);
      }
      if (!this.desdeCache()) {
        this.snack.open(mensajeErrorHttp(err, 'No se pudieron cargar los registros.'), 'Cerrar', {
          duration: 5000,
        });
      }
    } finally {
      this.cargando.set(false);
    }
  }

  async sincronizar(): Promise<void> {
    this.sincronizando.set(true);
    try {
      const r = await this.sync.sincronizarPendientes();
      if (r.sinConexion) {
        this.snack.open('Sin conexión: no se puede sincronizar ahora.', 'Cerrar', {
          duration: 3500,
        });
        return;
      }
      this.snack.open(
        `Sincronizados: ${r.sincronizados}. Errores: ${r.conError}.`,
        'Cerrar',
        { duration: 4000 },
      );
      await this.cargar();
    } finally {
      this.sincronizando.set(false);
    }
  }

  volver(): void {
    void this.router.navigateByUrl('/terreno');
  }

  abrirServidor(r: RegistroTerreno): void {
    void this.router.navigate(['/terreno/registros', r.id]);
  }

  abrirLocal(r: RegistroLocal): void {
    void this.router.navigate(['/terreno/nuevo'], { queryParams: { localId: r.localId } });
  }

  nuevo(): void {
    void this.router.navigateByUrl('/terreno/nuevo');
  }

  etiquetaEstado(estado: string): string {
    switch (estado) {
      case 'borrador':
        return 'Borrador';
      case 'pendiente':
        return 'Pendiente de envío';
      case 'error':
        return 'Error de sync';
      default:
        return estado;
    }
  }
}
