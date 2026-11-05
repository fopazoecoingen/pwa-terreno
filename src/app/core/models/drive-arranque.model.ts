export interface DriveArranqueNodo {
  id: string;
  label: string;
  count: number;
}

export interface DriveArranqueArchivo {
  path: string;
  name: string;
  contentType: string;
  fechaSubida?: string | null;
  tamanoBytes: number;
  descripcion: string;
  uploadedBy: string;
}

export interface DriveArranqueContenido {
  carpetas: DriveArranqueNodo[];
  archivos: DriveArranqueArchivo[];
  permiteEscritura: boolean;
}

export const ETIQUETAS_RAIZ_ARRANQUE: Record<string, string> = {
  contratos: 'Contratos',
  Capacitaciones: 'Capacitaciones',
  personal: 'Personal',
  empresas: 'Empresas',
  documentacion: 'Documentación',
};

export function mapDriveContenido(raw: unknown): DriveArranqueContenido {
  const o = (raw ?? {}) as Record<string, unknown>;
  const carpetasRaw = (o['carpetas'] ?? o['Carpetas'] ?? []) as unknown[];
  const archivosRaw = (o['archivos'] ?? o['Archivos'] ?? []) as unknown[];
  return {
    permiteEscritura: !!(o['permiteEscritura'] ?? o['PermiteEscritura']),
    carpetas: (Array.isArray(carpetasRaw) ? carpetasRaw : []).map((item) => {
      const c = (item ?? {}) as Record<string, unknown>;
      return {
        id: String(c['id'] ?? c['Id'] ?? ''),
        label: String(c['label'] ?? c['Label'] ?? ''),
        count: Number(c['count'] ?? c['Count']) || 0,
      };
    }),
    archivos: (Array.isArray(archivosRaw) ? archivosRaw : []).map((item) => {
      const a = (item ?? {}) as Record<string, unknown>;
      return {
        path: String(a['path'] ?? a['Path'] ?? ''),
        name: String(a['name'] ?? a['Name'] ?? ''),
        contentType: String(a['contentType'] ?? a['ContentType'] ?? ''),
        fechaSubida: (a['fechaSubida'] ?? a['FechaSubida'] ?? null) as string | null,
        tamanoBytes: Number(a['tamanoBytes'] ?? a['TamanoBytes']) || 0,
        descripcion: String(a['descripcion'] ?? a['Descripcion'] ?? ''),
        uploadedBy: String(a['uploadedBy'] ?? a['UploadedBy'] ?? ''),
      };
    }),
  };
}

export function tamanoLegible(bytes: number): string {
  if (bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
