import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { DriveArranqueService } from '../../core/services/drive-arranque.service';
import {
  DriveArranqueArchivo,
  DriveArranqueContenido,
  DriveArranqueNodo,
  ETIQUETAS_RAIZ_ARRANQUE,
  tamanoLegible,
} from '../../core/models/drive-arranque.model';
import { mensajeErrorHttp } from '../../core/utils/http-error';

@Component({
  selector: 'app-arranque-page',
  standalone: true,
  imports: [
    FormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './arranque.page.html',
  styleUrl: './arranque.page.scss',
})
export class ArranquePage implements OnInit {
  private readonly api = inject(DriveArranqueService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  readonly cargando = signal(false);
  readonly descargando = signal<string | null>(null);
  readonly contenido = signal<DriveArranqueContenido | null>(null);
  readonly rutaActual = signal('');
  readonly breadcrumbs = signal<{ label: string; ruta: string }[]>([
    { label: 'Inicio', ruta: '' },
  ]);
  readonly filtro = signal('');
  readonly error = signal<string | null>(null);

  readonly segmentos = computed(() =>
    this.rutaActual().split('/').filter(Boolean),
  );

  readonly enCatalogoEmpresas = computed(() => {
    const s = this.segmentos();
    return s.length === 1 && s[0].toLowerCase() === 'empresas';
  });

  readonly enCatalogoPersonal = computed(() => {
    const s = this.segmentos();
    return s.length === 1 && s[0].toLowerCase() === 'personal';
  });

  readonly mostrarBuscador = computed(
    () => this.enCatalogoEmpresas() || this.enCatalogoPersonal(),
  );

  readonly carpetasFiltradas = computed(() => {
    const c = this.contenido()?.carpetas ?? [];
    const qRaw = this.filtro().trim().toLowerCase();
    if (!qRaw || !this.mostrarBuscador()) return c;
    const qNorm = qRaw.replace(/[.\-\s]/g, '');
    return c.filter((folder) => {
      const label = (folder.label || folder.id).toLowerCase();
      const id = folder.id.toLowerCase();
      const labelNorm = label.replace(/[.\-\s]/g, '');
      return (
        label.includes(qRaw) ||
        id.includes(qRaw) ||
        labelNorm.includes(qNorm) ||
        id.replace(/[.\-\s]/g, '').includes(qNorm)
      );
    });
  });

  tamanoLegible = tamanoLegible;

  ngOnInit(): void {
    this.explorar('');
  }

  explorar(ruta: string): void {
    this.cargando.set(true);
    this.error.set(null);
    this.rutaActual.set(ruta);
    this.filtro.set('');
    this.api
      .explorar(ruta || undefined)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (c) => {
          this.contenido.set(c);
          this.actualizarBreadcrumbs(ruta);
        },
        error: (err) => {
          this.contenido.set(null);
          const msg = mensajeErrorHttp(err, 'No se pudo explorar carpetas de arranque.');
          this.error.set(msg);
          this.snack.open(msg, 'Cerrar', { duration: 5000 });
        },
      });
  }

  recargar(): void {
    this.explorar(this.rutaActual());
  }

  labelCarpeta(nodo: DriveArranqueNodo): string {
    if (!this.rutaActual()) {
      return ETIQUETAS_RAIZ_ARRANQUE[nodo.id] ?? (nodo.label || nodo.id);
    }
    return nodo.label || nodo.id;
  }

  iconoCarpeta(nodo: DriveArranqueNodo): string {
    const segs = this.segmentos();
    if (segs.length === 0) {
      switch (nodo.id) {
        case 'contratos':
          return 'description';
        case 'Capacitaciones':
          return 'school';
        case 'personal':
          return 'person';
        case 'empresas':
          return 'business';
      }
    }
    if (segs.length === 1 && segs[0] === 'personal') return 'person_outline';
    if (segs.length === 1 && segs[0] === 'empresas') return 'apartment';
    if (nodo.id === 'documentacion') return 'folder_shared';
    return 'folder';
  }

  metaArchivo(archivo: DriveArranqueArchivo): string {
    const parts: string[] = [];
    const size = tamanoLegible(archivo.tamanoBytes);
    if (size) parts.push(size);
    if (archivo.fechaSubida) {
      try {
        const d = new Date(archivo.fechaSubida);
        if (!Number.isNaN(d.getTime())) {
          parts.push(
            d.toLocaleString('es-CL', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          );
        }
      } catch {
        /* ignore */
      }
    }
    if (archivo.uploadedBy) parts.push(archivo.uploadedBy);
    return parts.join(' · ');
  }

  abrirCarpeta(nodo: DriveArranqueNodo): void {
    const actual = this.rutaActual();
    const next = actual ? `${actual}/${nodo.id}` : nodo.id;
    this.explorar(next);
  }

  irBreadcrumb(ruta: string): void {
    this.explorar(ruta);
  }

  descargar(archivo: DriveArranqueArchivo): void {
    this.descargando.set(archivo.path);
    this.api
      .descargar(archivo.path)
      .pipe(finalize(() => this.descargando.set(null)))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = archivo.name || 'archivo';
          a.click();
          URL.revokeObjectURL(url);
        },
        error: (err) =>
          this.snack.open(mensajeErrorHttp(err, 'No se pudo descargar el archivo.'), 'Cerrar', {
            duration: 5000,
          }),
      });
  }

  volver(): void {
    void this.router.navigateByUrl('/panel');
  }

  private actualizarBreadcrumbs(ruta: string): void {
    const crumbs = [{ label: 'Inicio', ruta: '' }];
    if (!ruta) {
      this.breadcrumbs.set(crumbs);
      return;
    }
    const parts = ruta.split('/').filter(Boolean);
    let acc = '';
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      crumbs.push({
        label: ETIQUETAS_RAIZ_ARRANQUE[part] ?? part,
        ruta: acc,
      });
    }
    this.breadcrumbs.set(crumbs);
  }
}
