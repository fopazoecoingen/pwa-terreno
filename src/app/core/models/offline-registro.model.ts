export type EstadoSyncLocal = 'borrador' | 'pendiente' | 'sincronizado' | 'error';

export interface RegistroLocal {
  localId: string;
  usuarioId: number;
  nombreTerreno: string;
  descripcion: string;
  observacion: string;
  blobStorage: string;
  servicioId: number | null;
  servicioEtiqueta: string;
  estadoSync: EstadoSyncLocal;
  serverId: number | null;
  ultimoError: string | null;
  fotosEsperadas: number;
  /** Rutas Blob a borrar en el próximo sync (fotos ya enviadas quitadas en edición). */
  rutasAEliminar?: string[];
  fechaCreacion: string;
  fechaModificacion: string;
}

export interface FotoLocal {
  id: string;
  registroLocalId: string;
  nombre: string;
  mimeType: string;
  blob: Blob;
  orden: number;
}

export interface SyncResultado {
  sincronizados: number;
  conError: number;
  sinConexion?: boolean;
  sinSesion?: boolean;
  omitido?: boolean;
}
