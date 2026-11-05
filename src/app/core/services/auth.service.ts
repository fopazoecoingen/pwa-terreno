import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { API } from '../config/api.config';
import { SessionService } from './session.service';
import type { SesionUsuario } from '../models/sesion.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  login(usuario: string, password: string, recordar: boolean): Observable<SesionUsuario> {
    return this.http
      .post<Record<string, unknown>>(API.login(), { usuario, password })
      .pipe(
        map((raw) => this.mapearLogin(raw, usuario)),
        tap((sesion) => {
          this.session.setSesion(sesion);
          this.session.guardarCredenciales(usuario, password, recordar);
        }),
      );
  }

  logout(): void {
    this.session.clear();
    void this.router.navigateByUrl('/login');
  }

  private mapearLogin(raw: Record<string, unknown>, usuario: string): SesionUsuario {
    const data = (raw['data'] ?? raw['result'] ?? raw) as Record<string, unknown>;
    const token = String(
      data['token'] ??
        data['Token'] ??
        data['accessToken'] ??
        data['AccessToken'] ??
        data['access_token'] ??
        '',
    ).trim();
    if (!token) throw new Error('No se recibió token de autenticación.');

    const usuarioId =
      Number(data['usuarioId'] ?? data['UsuarioId'] ?? data['idUsuario'] ?? 0) ||
      this.session.usuarioIdDesdeToken(token);

    return {
      token,
      usuario,
      usuarioId,
      esSuperAdmin: !!(data['esSuperAdmin'] ?? data['EsSuperAdmin']),
      empresas: this.session.normalizarEmpresas(
        data['listaEmpresas'] ?? data['ListaEmpresas'] ?? data['empresas'],
      ),
    };
  }
}
