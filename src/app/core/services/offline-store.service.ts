import { Injectable } from '@angular/core';
import type { FotoLocal, RegistroLocal } from '../models/offline-registro.model';
import type { RegistroTerreno, ServicioTerreno } from '../models/terreno.model';

const DB_NAME = 'ecoingen_terreno_pwa';
const DB_VERSION = 1;
const STORE_REGISTROS = 'registros';
const STORE_FOTOS = 'fotos';
const STORE_CACHE = 'cache';

@Injectable({ providedIn: 'root' })
export class OfflineStoreService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_REGISTROS)) {
            const store = db.createObjectStore(STORE_REGISTROS, { keyPath: 'localId' });
            store.createIndex('usuarioId', 'usuarioId', { unique: false });
            store.createIndex('estadoSync', 'estadoSync', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_FOTOS)) {
            const store = db.createObjectStore(STORE_FOTOS, { keyPath: 'id' });
            store.createIndex('registroLocalId', 'registroLocalId', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_CACHE)) {
            db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('No se pudo abrir IndexedDB'));
      });
    }
    return this.dbPromise;
  }

  nuevoLocalId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  async guardarRegistro(registro: RegistroLocal): Promise<void> {
    const db = await this.db();
    await this.put(db, STORE_REGISTROS, registro);
  }

  async obtenerRegistro(localId: string): Promise<RegistroLocal | null> {
    const db = await this.db();
    return (await this.get<RegistroLocal>(db, STORE_REGISTROS, localId)) ?? null;
  }

  async listarRegistrosUsuario(usuarioId: number): Promise<RegistroLocal[]> {
    const db = await this.db();
    const todos = await this.getAll<RegistroLocal>(db, STORE_REGISTROS);
    return todos
      .filter((r) => r.usuarioId === usuarioId)
      .sort((a, b) => b.fechaModificacion.localeCompare(a.fechaModificacion));
  }

  async listarPendientes(usuarioId: number): Promise<RegistroLocal[]> {
    const lista = await this.listarRegistrosUsuario(usuarioId);
    return lista.filter((r) => r.estadoSync === 'pendiente' || r.estadoSync === 'error');
  }

  async contarBorradores(usuarioId: number): Promise<number> {
    const lista = await this.listarRegistrosUsuario(usuarioId);
    return lista.filter((r) => r.estadoSync === 'borrador').length;
  }

  async contarPendientes(usuarioId: number): Promise<number> {
    return (await this.listarPendientes(usuarioId)).length;
  }

  async eliminarRegistro(localId: string): Promise<void> {
    const db = await this.db();
    const fotos = await this.listarFotos(localId);
    await Promise.all(fotos.map((f) => this.deleteKey(db, STORE_FOTOS, f.id)));
    await this.deleteKey(db, STORE_REGISTROS, localId);
  }

  async reemplazarFotos(registroLocalId: string, fotos: Omit<FotoLocal, 'id' | 'registroLocalId'>[]): Promise<void> {
    const db = await this.db();
    const previas = await this.listarFotos(registroLocalId);
    await Promise.all(previas.map((f) => this.deleteKey(db, STORE_FOTOS, f.id)));
    for (let i = 0; i < fotos.length; i++) {
      const foto = fotos[i];
      await this.put(db, STORE_FOTOS, {
        id: this.nuevoLocalId(),
        registroLocalId,
        nombre: foto.nombre,
        mimeType: foto.mimeType,
        blob: foto.blob,
        orden: i,
      } satisfies FotoLocal);
    }
  }

  async listarFotos(registroLocalId: string): Promise<FotoLocal[]> {
    const db = await this.db();
    const todas = await this.getAll<FotoLocal>(db, STORE_FOTOS);
    return todas
      .filter((f) => f.registroLocalId === registroLocalId)
      .sort((a, b) => a.orden - b.orden);
  }

  async cachearServicios(usuarioId: number, servicios: ServicioTerreno[]): Promise<void> {
    const db = await this.db();
    await this.put(db, STORE_CACHE, {
      key: `servicios_${usuarioId}`,
      data: servicios,
      guardadoEn: new Date().toISOString(),
    });
  }

  async leerServiciosCache(usuarioId: number): Promise<ServicioTerreno[]> {
    const db = await this.db();
    const row = await this.get<{ data: ServicioTerreno[] }>(db, STORE_CACHE, `servicios_${usuarioId}`);
    return row?.data ?? [];
  }

  async cachearRegistrosServidor(usuarioId: number, registros: RegistroTerreno[]): Promise<void> {
    const db = await this.db();
    await this.put(db, STORE_CACHE, {
      key: `registros_server_${usuarioId}`,
      data: registros,
      guardadoEn: new Date().toISOString(),
    });
  }

  async leerRegistrosServidorCache(usuarioId: number): Promise<RegistroTerreno[]> {
    const db = await this.db();
    const row = await this.get<{ data: RegistroTerreno[] }>(
      db,
      STORE_CACHE,
      `registros_server_${usuarioId}`,
    );
    return row?.data ?? [];
  }

  private put(db: IDBDatabase, store: string, value: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private get<T>(db: IDBDatabase, store: string, key: IDBValidKey): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  }

  private getAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve((req.result as T[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  }

  private deleteKey(db: IDBDatabase, store: string, key: IDBValidKey): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
