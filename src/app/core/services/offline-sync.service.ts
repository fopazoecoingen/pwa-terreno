import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConnectivityService } from './connectivity.service';
import { OfflineStoreService } from './offline-store.service';
import { SessionService } from './session.service';
import { TerrenoApiService } from './terreno-api.service';
import type { RegistroLocal, SyncResultado } from '../models/offline-registro.model';

@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  private readonly store = inject(OfflineStoreService);
  private readonly api = inject(TerrenoApiService);
  private readonly session = inject(SessionService);
  private readonly connectivity = inject(ConnectivityService);

  private sincronizando = false;
  private iniciado = false;

  /** Escucha `online` y reintenta pendientes automáticamente. */
  iniciar(): void {
    if (this.iniciado) return;
    this.iniciado = true;

    window.addEventListener('online', () => {
      void this.sincronizarPendientes();
    });

    if (this.connectivity.online()) {
      void this.sincronizarPendientes();
    }
  }

  async sincronizarPendientes(): Promise<SyncResultado> {
    if (this.sincronizando) return { sincronizados: 0, conError: 0, omitido: true };
    if (!navigator.onLine) {
      return { sincronizados: 0, conError: 0, sinConexion: true };
    }

    const usuarioId = this.session.usuarioId();
    const token = this.session.token();
    if (!usuarioId || !token) {
      return { sincronizados: 0, conError: 0, sinSesion: true };
    }

    this.sincronizando = true;
    let sincronizados = 0;
    let conError = 0;
    try {
      const pendientes = await this.store.listarPendientes(usuarioId);
      for (const registro of pendientes) {
        try {
          await this.sincronizarUno(registro);
          sincronizados += 1;
        } catch (err) {
          conError += 1;
          const mensaje =
            err instanceof Error ? err.message : 'Error al sincronizar el registro.';
          await this.store.guardarRegistro({
            ...registro,
            estadoSync: 'error',
            ultimoError: mensaje,
            fechaModificacion: new Date().toISOString(),
          });
        }
      }
      return { sincronizados, conError };
    } finally {
      this.sincronizando = false;
    }
  }

  private async sincronizarUno(registro: RegistroLocal): Promise<void> {
    const fotos = await this.store.listarFotos(registro.localId);
    let serverId = registro.serverId;
    let working = { ...registro };

    if (!serverId || serverId <= 0) {
      serverId = await firstValueFrom(
        this.api.crear({
          nombreTerreno: working.nombreTerreno,
          descripcion: working.descripcion,
          observacion: working.observacion,
          blobStorage: working.blobStorage,
          usuarioId: working.usuarioId,
          servicioEcoingenId: working.servicioId ?? 0,
        }),
      );
      working = {
        ...working,
        serverId,
        fechaModificacion: new Date().toISOString(),
      };
      await this.store.guardarRegistro(working);
    }

    for (const foto of fotos) {
      const file = new File([foto.blob], foto.nombre, {
        type: foto.mimeType || 'image/jpeg',
      });
      await firstValueFrom(this.api.subirImagen(file, working.blobStorage));
    }

    await this.store.guardarRegistro({
      ...working,
      serverId,
      estadoSync: 'sincronizado',
      ultimoError: null,
      fechaModificacion: new Date().toISOString(),
    });
  }
}
