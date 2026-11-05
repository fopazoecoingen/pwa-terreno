import { Injectable, computed, signal } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import type { EmpresaSesion, SesionUsuario } from '../models/sesion.model';

const KEY = 'pwa_terreno_sesion';
const REMEMBER_USER = 'pwa_terreno_usuario';
const REMEMBER_PASS = 'pwa_terreno_password';
const REMEMBER_FLAG = 'pwa_terreno_remember';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly _sesion = signal<SesionUsuario | null>(this.leerSesion());

  readonly sesion = this._sesion.asReadonly();
  readonly autenticado = computed(() => !!this._sesion()?.token);
  readonly token = computed(() => this._sesion()?.token ?? '');
  readonly usuarioId = computed(() => this._sesion()?.usuarioId ?? 0);
  readonly usuario = computed(() => this._sesion()?.usuario ?? '');

  setSesion(sesion: SesionUsuario): void {
    localStorage.setItem(KEY, JSON.stringify(sesion));
    this._sesion.set(sesion);
  }

  clear(): void {
    localStorage.removeItem(KEY);
    this._sesion.set(null);
  }

  guardarCredenciales(usuario: string, password: string, recordar: boolean): void {
    if (recordar) {
      localStorage.setItem(REMEMBER_FLAG, '1');
      localStorage.setItem(REMEMBER_USER, usuario);
      localStorage.setItem(REMEMBER_PASS, password);
    } else {
      localStorage.removeItem(REMEMBER_FLAG);
      localStorage.removeItem(REMEMBER_USER);
      localStorage.removeItem(REMEMBER_PASS);
    }
  }

  credencialesRecordadas(): { usuario: string; password: string } | null {
    if (localStorage.getItem(REMEMBER_FLAG) !== '1') return null;
    const usuario = localStorage.getItem(REMEMBER_USER) ?? '';
    const password = localStorage.getItem(REMEMBER_PASS) ?? '';
    if (!usuario || !password) return null;
    return { usuario, password };
  }

  usuarioIdDesdeToken(token: string): number {
    try {
      const payload = jwtDecode<Record<string, unknown>>(token);
      const candidates = [
        payload['nameid'],
        payload['sub'],
        payload['uid'],
        payload['UsuarioId'],
        payload['usuarioId'],
        payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
      ];
      for (const c of candidates) {
        const n = Number(c);
        if (Number.isFinite(n) && n > 0) return n;
      }
    } catch {
      /* ignore */
    }
    return 0;
  }

  normalizarEmpresas(raw: unknown): EmpresaSesion[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      const o = (item ?? {}) as Record<string, unknown>;
      return {
        id: Number(o['id'] ?? o['Id']) || 0,
        descripcion: String(o['descripcion'] ?? o['Descripcion'] ?? o['nombreFantasia'] ?? '').trim(),
      };
    });
  }

  private leerSesion(): SesionUsuario | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SesionUsuario;
      if (!parsed?.token) return null;
      return parsed;
    } catch {
      return null;
    }
  }
}
