import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map } from 'rxjs';
import { API } from '../config/api.config';
import { SessionService } from './session.service';
import {
  ImagenTerreno,
  RegistroTerreno,
  RegistroTerrenoCreacion,
  ServicioTerreno,
  mapImagen,
  mapRegistro,
  mapServicio,
} from '../models/terreno.model';
import { blobAFile, normalizarNombreFoto } from '../utils/foto-blob';

@Injectable({ providedIn: 'root' })
export class TerrenoApiService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);

  listarRegistros(): Observable<RegistroTerreno[]> {
    return this.http.get<unknown>(API.registroListar()).pipe(
      map((raw) => {
        const lista = Array.isArray(raw)
          ? raw
          : (((raw as Record<string, unknown>)?.['data'] ??
              (raw as Record<string, unknown>)?.['items'] ??
              (raw as Record<string, unknown>)?.['registros'] ??
              []) as unknown[]);
        return (Array.isArray(lista) ? lista : []).map(mapRegistro);
      }),
    );
  }

  obtener(id: number): Observable<RegistroTerreno> {
    return this.http.get<unknown>(API.registroObtener(id)).pipe(map(mapRegistro));
  }

  crear(payload: RegistroTerrenoCreacion): Observable<number> {
    return this.http.post<unknown>(API.registroCrear(), payload).pipe(
      map((raw) => {
        if (typeof raw === 'number') return raw;
        if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) return Number(raw.trim());
        const o = (raw ?? {}) as Record<string, unknown>;
        const nested = (o['data'] ?? o['result'] ?? null) as Record<string, unknown> | number | null;
        const id = Number(
          o['id'] ??
            o['Id'] ??
            (typeof nested === 'number' ? nested : nested?.['id'] ?? nested?.['Id']) ??
            0,
        );
        if (!id) throw new Error('El servidor no devolvió el Id del registro.');
        return id;
      }),
    );
  }

  actualizar(payload: RegistroTerrenoCreacion & { id: number }): Observable<void> {
    return this.http.put<unknown>(API.registroActualizar(), payload).pipe(map(() => undefined));
  }

  eliminarImagen(serverId: number, ruta: string): Observable<void> {
    return this.http
      .delete<unknown>(API.registroEliminarImagen(serverId, ruta))
      .pipe(map(() => undefined));
  }

  listarServicios(): Observable<ServicioTerreno[]> {
    return this.http
      .get<unknown>(API.registroServicios())
      .pipe(map((raw) => (Array.isArray(raw) ? raw : []).map(mapServicio)));
  }

  listarImagenes(subcarpeta: string): Observable<ImagenTerreno[]> {
    return this.http
      .get<unknown>(API.listarImagenesTerreno(subcarpeta))
      .pipe(map((raw) => (Array.isArray(raw) ? raw : []).map(mapImagen)));
  }

  descargarImagen(ruta: string): Observable<Blob> {
    return this.http.get(API.descargarImagenTerreno(ruta), { responseType: 'blob' });
  }

  /**
   * Subida vía fetch (no HttpClient): en iOS/Safari el multipart con Blobs de IndexedDB
   * a menudo llega vacío al API ("No se recibió ningún archivo").
   */
  subirImagen(blob: Blob, subcarpeta: string, nombreArchivo?: string): Observable<string> {
    return from(this.subirImagenFetch(blob, subcarpeta, nombreArchivo));
  }

  private async subirImagenFetch(
    blob: Blob,
    subcarpeta: string,
    nombreArchivo?: string,
  ): Promise<string> {
    const file = await blobAFile(blob, nombreArchivo || 'foto.jpg', blob.type);
    if (!file.size) {
      throw new Error('La foto quedó vacía al preparar el envío. Vuelve a seleccionarla.');
    }

    const form = new FormData();
    form.append('file', file, file.name || normalizarNombreFoto(nombreArchivo, file.type));

    const token = this.session.token().replace(/^Bearer\s+/i, '').trim();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    // No setear Content-Type: el browser pone multipart boundary.

    const res = await fetch(API.uploadImagenTerreno(subcarpeta), {
      method: 'POST',
      headers,
      body: form,
      credentials: 'omit',
    });

    const text = await res.text();
    let raw: unknown = null;
    if (text) {
      try {
        raw = JSON.parse(text);
      } catch {
        raw = text;
      }
    }

    if (!res.ok) {
      const msg =
        typeof raw === 'string'
          ? raw
          : String(
              (raw as Record<string, unknown>)?.['message'] ??
                (raw as Record<string, unknown>)?.['Message'] ??
                (raw as Record<string, unknown>)?.['status'] ??
                text ??
                res.statusText,
            );
      throw Object.assign(new Error(msg || `Error al subir imagen (HTTP ${res.status})`), {
        status: res.status,
        error: raw,
      });
    }

    const o = (raw ?? {}) as Record<string, unknown>;
    return String(
      o['uri'] ??
        o['Uri'] ??
        o['url'] ??
        o['Url'] ??
        o['blobUri'] ??
        o['BlobUri'] ??
        (o['blob'] as Record<string, unknown> | undefined)?.['uri'] ??
        (o['Blob'] as Record<string, unknown> | undefined)?.['Uri'] ??
        '',
    ).trim();
  }

  descargarInforme(id: number): Observable<Blob> {
    return this.http.get(API.registroInforme(id), { responseType: 'blob' });
  }
}
