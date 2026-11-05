import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API } from '../config/api.config';
import {
  ImagenTerreno,
  RegistroTerreno,
  RegistroTerrenoCreacion,
  ServicioTerreno,
  mapImagen,
  mapRegistro,
  mapServicio,
} from '../models/terreno.model';

@Injectable({ providedIn: 'root' })
export class TerrenoApiService {
  private readonly http = inject(HttpClient);

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
   * Sube imagen al blob. Usa Blob + nombre (no `File`) para evitar fallos en Safari/iOS.
   */
  subirImagen(blob: Blob, subcarpeta: string, nombreArchivo?: string): Observable<string> {
    const nombre = this.normalizarNombreFoto(nombreArchivo, blob.type);
    const form = new FormData();
    // Safari/iOS: append Blob directo; `new File([...])` a veces rompe el multipart.
    form.append('file', blob, nombre);
    return this.http.post<unknown>(API.uploadImagenTerreno(subcarpeta), form).pipe(
      map((raw) => {
        const o = (raw ?? {}) as Record<string, unknown>;
        const uri = String(
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
        return uri;
      }),
    );
  }

  private normalizarNombreFoto(nombre: string | undefined, mime: string): string {
    const base = (nombre || 'foto.jpg').trim() || 'foto.jpg';
    if (/\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i.test(base)) return base;
    if (mime.includes('png')) return `${base}.png`;
    if (mime.includes('webp')) return `${base}.webp`;
    if (mime.includes('heic') || mime.includes('heif')) return `${base}.heic`;
    return `${base}.jpg`;
  }

  descargarInforme(id: number): Observable<Blob> {
    return this.http.get(API.registroInforme(id), { responseType: 'blob' });
  }
}
