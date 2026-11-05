export interface EmpresaSesion {
  id: number;
  descripcion: string;
}

export interface SesionUsuario {
  token: string;
  usuario: string;
  usuarioId: number;
  esSuperAdmin: boolean;
  empresas: EmpresaSesion[];
}
