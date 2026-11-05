import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { TerrenoApiService } from '../../../core/services/terreno-api.service';
import { ImagenTerreno, RegistroTerreno } from '../../../core/models/terreno.model';
import { mensajeErrorHttp } from '../../../core/utils/http-error';

@Component({
  selector: 'app-detalle-page',
  standalone: true,
  imports: [
    DatePipe,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './detalle.page.html',
  styleUrl: './detalle.page.scss',
})
export class DetallePage implements OnInit {
  private readonly api = inject(TerrenoApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  readonly cargando = signal(false);
  readonly registro = signal<RegistroTerreno | null>(null);
  readonly imagenes = signal<{ meta: ImagenTerreno; url: string }[]>([]);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      void this.router.navigateByUrl('/terreno/registros');
      return;
    }
    this.cargar(id);
  }

  cargar(id: number): void {
    this.cargando.set(true);
    this.api
      .obtener(id)
      .pipe(
        switchMap((reg) => {
          this.registro.set(reg);
          const carpeta = (reg.blobStorage || '').trim();
          if (!carpeta) return of([] as ImagenTerreno[]);
          return this.api.listarImagenes(carpeta);
        }),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (imgs) => this.cargarPreviews(imgs),
        error: (err) =>
          this.snack.open(mensajeErrorHttp(err, 'No se pudo cargar el registro.'), 'Cerrar', {
            duration: 5000,
          }),
      });
  }

  private cargarPreviews(imgs: ImagenTerreno[]): void {
    if (!imgs.length) {
      this.imagenes.set([]);
      return;
    }
    const resultados: { meta: ImagenTerreno; url: string }[] = [];
    let pendientes = imgs.length;
    for (const img of imgs) {
      const ruta = img.ruta || img.nombre;
      this.api.descargarImagen(ruta).subscribe({
        next: (blob) => {
          resultados.push({ meta: img, url: URL.createObjectURL(blob) });
          pendientes -= 1;
          if (pendientes <= 0) this.imagenes.set([...resultados]);
        },
        error: () => {
          pendientes -= 1;
          if (pendientes <= 0) this.imagenes.set([...resultados]);
        },
      });
    }
  }

  volver(): void {
    void this.router.navigateByUrl('/terreno/registros');
  }

  descargarInforme(): void {
    const reg = this.registro();
    if (!reg) return;
    this.api.descargarInforme(reg.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `informe-terreno-${reg.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) =>
        this.snack.open(mensajeErrorHttp(err, 'No se pudo descargar el informe.'), 'Cerrar', {
          duration: 5000,
        }),
    });
  }
}
