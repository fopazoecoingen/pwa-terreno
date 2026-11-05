import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConnectivityService } from './connectivity.service';
import { OfflineStoreService } from './offline-store.service';
import { SessionService } from './session.service';
import { TerrenoApiService } from './terreno-api.service';
import type { RegistroLocal, SyncResultado } from '../models/offline-registro.model';
import { mensajeErrorHttp } from '../utils/http-error';

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
          // Releer: sincronizarUno puede haber guardado serverId antes de fallar (fotos).
          const actual = (await this.store.obtenerRegistro(registro.localId)) ?? registro;
          await this.store.guardarRegistro({
            ...actual,
            estadoSync: 'error',
            ultimoError: mensajeErrorHttp(err, 'Error al sincronizar el registro.'),
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
    let working: RegistroLocal = { ...registro, ultimoError: null };
    let serverId = working.serverId && working.serverId > 0 ? working.serverId : null;
    const yaExistiaEnServidor = !!serverId;

    const payload = {
      nombreTerreno: working.nombreTerreno,
      descripcion: working.descripcion,
      observacion: working.observacion,
      blobStorage: working.blobStorage,
      usuarioId: working.usuarioId,
      servicioEcoingenId: working.servicioId ?? 0,
    };

    if (serverId) {
      // Edición de un levantamiento ya enviado (como Flutter actualizarRegistro).
      await firstValueFrom(this.api.actualizar({ ...payload, id: serverId }));
    } else {
      serverId = await firstValueFrom(this.api.crear(payload));
      working = {
        ...working,
        serverId,
        fechaModificacion: new Date().toISOString(),
      };
      // Persistir Id YA: si fallan fotos, no se duplica el registro.
      await this.store.guardarRegistro(working);
    }

    const fotosValidas = fotos.filter((f) => f.blob && (f.blob.size ?? 0) > 0);
    if (fotos.length > 0 && fotosValidas.length === 0) {
      throw new Error(
        'Las fotos de este registro ya no están en el teléfono. Ábrelo, vuelve a agregarlas y sincroniza.',
      );
    }

    let subidas = 0;
    try {
      for (const foto of fotosValidas) {
        const mime = foto.mimeType || foto.blob.type || 'image/jpeg';
        const buffer = await foto.blob.arrayBuffer();
        if (!buffer.byteLength) {
          throw new Error(
            `La foto «${foto.nombre}» está vacía en el teléfono. Ábrela, quítala, vuelve a agregarla y sincroniza.`,
          );
        }
        const fresco = new Blob([buffer], { type: mime });
        await firstValueFrom(this.api.subirImagen(fresco, working.blobStorage, foto.nombre));
        subidas += 1;
      }
    } catch (err) {
      const verbo = yaExistiaEnServidor ? 'actualizado' : 'creado';
      throw new Error(
        `Registro #${serverId} ${verbo}, pero falló la subida de fotos (${subidas}/${fotosValidas.length}): ${mensajeErrorHttp(err, 'error de red o almacenamiento')}`,
      );
    }

    // Tras sync OK, liberar fotos locales pendientes (siguen en Blob del servidor).
    if (fotosValidas.length > 0) {
      await this.store.reemplazarFotos(working.localId, []);
    }

    await this.store.guardarRegistro({
      ...working,
      serverId,
      estadoSync: 'sincronizado',
      ultimoError: null,
      fotosEsperadas: 0,
      fechaModificacion: new Date().toISOString(),
    });
  }
}
