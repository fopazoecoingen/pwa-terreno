import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API } from '../config/api.config';
import { DriveArranqueContenido, mapDriveContenido } from '../models/drive-arranque.model';

@Injectable({ providedIn: 'root' })
export class DriveArranqueService {
  private readonly http = inject(HttpClient);

  explorar(ruta?: string): Observable<DriveArranqueContenido> {
    return this.http
      .get<unknown>(API.driveExplorar(ruta))
      .pipe(map((raw) => mapDriveContenido(raw)));
  }

  descargar(path: string): Observable<Blob> {
    return this.http.get(API.driveDescargar(path), { responseType: 'blob' });
  }
}
