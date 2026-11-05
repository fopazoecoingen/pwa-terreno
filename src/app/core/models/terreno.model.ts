export interface RegistroTerreno {
  id: number;
  nombreTerreno: string;
  descripcion: string;
  observacion: string;
  usuarioId: number;
  blobStorage: string;
  fechaCreacionRegistro: string;
  fechaModificacionRegistro: string;
  servicioEcoingenId?: number | null;
  servicioEmpresa?: string;
  servicioSucursal?: string;
  servicioTipoContrato?: string;
}

export interface RegistroTerrenoCreacion {
  nombreTerreno: string;
  descripcion: string;
  observacion: string;
  blobStorage: string;
  usuarioId: number;
  servicioEcoingenId?: number;
}

export interface ServicioTerreno {
  id: number;
  anyo: number;
  empresa: string;
  sucursal: string;
  tipoContrato: string;
  estadoServicio: string;
  encargado: string;
  rolUsuario: string;
  levantamientos: number;
  fechaPlazo?: string | null;
}

export interface ImagenTerreno {
  nombre: string;
  ruta: string;
  uri?: string;
  contentType?: string;
}

export function etiquetaServicio(s: Pick<ServicioTerreno, 'id' | 'empresa' | 'sucursal'>): string {
  const partes = [s.empresa, s.sucursal].map((x) => (x ?? '').trim()).filter(Boolean);
  return partes.length ? partes.join(' · ') : `Servicio #${s.id}`;
}

export function mapRegistro(raw: unknown): RegistroTerreno {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    id: Number(o['id'] ?? o['Id']) || 0,
    nombreTerreno: String(o['nombreTerreno'] ?? o['NombreTerreno'] ?? '').trim(),
    descripcion: String(o['descripcion'] ?? o['Descripcion'] ?? '').trim(),
    observacion: String(o['observacion'] ?? o['Observacion'] ?? '').trim(),
    usuarioId: Number(o['usuarioId'] ?? o['UsuarioId']) || 0,
    blobStorage: String(o['blobStorage'] ?? o['BlobStorage'] ?? '').trim(),
    fechaCreacionRegistro: String(
      o['fechaCreacionRegistro'] ?? o['FechaCreacionRegistro'] ?? '',
    ),
    fechaModificacionRegistro: String(
      o['fechaModificacionRegistro'] ?? o['FechaModificacionRegistro'] ?? '',
    ),
    servicioEcoingenId: (() => {
      const v = Number(o['servicioEcoingenId'] ?? o['ServicioEcoingenId']);
      return v > 0 ? v : null;
    })(),
    servicioEmpresa: String(o['servicioEmpresa'] ?? o['ServicioEmpresa'] ?? '').trim(),
    servicioSucursal: String(o['servicioSucursal'] ?? o['ServicioSucursal'] ?? '').trim(),
    servicioTipoContrato: String(
      o['servicioTipoContrato'] ?? o['ServicioTipoContrato'] ?? '',
    ).trim(),
  };
}

export function mapServicio(raw: unknown): ServicioTerreno {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    id: Number(o['id'] ?? o['Id']) || 0,
    anyo: Number(o['anyo'] ?? o['Anyo']) || 0,
    empresa: String(o['empresa'] ?? o['Empresa'] ?? '').trim(),
    sucursal: String(o['sucursal'] ?? o['Sucursal'] ?? '').trim(),
    tipoContrato: String(o['tipoContrato'] ?? o['TipoContrato'] ?? '').trim(),
    estadoServicio: String(o['estadoServicio'] ?? o['EstadoServicio'] ?? '').trim(),
    encargado: String(o['encargado'] ?? o['Encargado'] ?? '').trim(),
    rolUsuario: String(o['rolUsuario'] ?? o['RolUsuario'] ?? '').trim(),
    levantamientos: Number(o['levantamientos'] ?? o['Levantamientos']) || 0,
    fechaPlazo: (o['fechaPlazo'] ?? o['FechaPlazo'] ?? null) as string | null,
  };
}

export function mapImagen(raw: unknown): ImagenTerreno {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    nombre: String(o['nombre'] ?? o['Nombre'] ?? o['name'] ?? o['Name'] ?? '').trim(),
    ruta: String(o['ruta'] ?? o['Ruta'] ?? o['path'] ?? o['Path'] ?? '').trim(),
    uri: String(o['uri'] ?? o['Uri'] ?? o['url'] ?? o['Url'] ?? '').trim() || undefined,
    contentType: String(o['contentType'] ?? o['ContentType'] ?? '').trim() || undefined,
  };
}
