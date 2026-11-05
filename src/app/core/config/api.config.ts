import { environment } from '../../../environments/environment';

export const API = {
  login: () => `${environment.apiUrl}SSO/Login`,
  registroCrear: () => `${environment.apiUrl}RegistroTerreno/crear`,
  registroActualizar: () => `${environment.apiUrl}RegistroTerreno/actualizar`,
  registroListar: () => `${environment.apiUrl}RegistroTerreno/listar`,
  registroObtener: (id: number) => `${environment.apiUrl}RegistroTerreno/obtener/${id}`,
  registroServicios: () => `${environment.apiUrl}RegistroTerreno/servicios-disponibles`,
  registroEliminarImagen: (id: number, ruta: string) =>
    `${environment.apiUrl}RegistroTerreno/${id}/imagen?ruta=${encodeURIComponent(ruta)}`,
  registroInforme: (id: number) => `${environment.apiUrl}RegistroTerreno/${id}/informe`,
  uploadImagenTerreno: (subcarpeta?: string) => {
    const base = `${environment.apiUrl}Storage/uploadImagenTerreno`;
    const s = (subcarpeta ?? '').trim();
    return s ? `${base}?subcarpeta=${encodeURIComponent(s)}` : base;
  },
  listarImagenesTerreno: (subcarpeta: string) =>
    `${environment.apiUrl}Storage/listarImagenesTerreno?subcarpeta=${encodeURIComponent(subcarpeta)}`,
  descargarImagenTerreno: (ruta: string) =>
    `${environment.apiUrl}Storage/descargarImagenTerreno?ruta=${encodeURIComponent(ruta)}`,
  driveExplorar: (ruta?: string) => {
    const base = `${environment.apiUrl}DriveCarpetasArranque/explorar`;
    const r = (ruta ?? '').trim();
    return r ? `${base}?ruta=${encodeURIComponent(r)}` : base;
  },
  driveDescargar: (path: string) =>
    `${environment.apiUrl}DriveCarpetasArranque/descargar?path=${encodeURIComponent(path)}`,
} as const;

export const TIPOS_LUGAR = ['Laboratorio', 'Construcción', 'Ruido', 'Servicios'] as const;
