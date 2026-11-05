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
import { TerrenoApiService } from '../../../core/services/terreno-api.service';
import { OfflineStoreService } from '../../../core/services/offline-store.service';
import { SessionService } from '../../../core/services/session.service';
import { ConnectivityService } from '../../../core/services/connectivity.service';
import { ServicioTerreno, etiquetaServicio } from '../../../core/models/terreno.model';
import { mensajeErrorHttp } from '../../../core/utils/http-error';

@Component({
  selector: 'app-servicios-page',
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
  templateUrl: './servicios.page.html',
  styleUrl: './servicios.page.scss',
})
export class ServiciosPage implements OnInit {
  private readonly api = inject(TerrenoApiService);
  private readonly store = inject(OfflineStoreService);
  private readonly session = inject(SessionService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  readonly cargando = signal(false);
  readonly servicios = signal<ServicioTerreno[]>([]);
  readonly filtro = signal('');
  readonly desdeCache = signal(false);
  readonly online = this.connectivity.online;
  readonly filtrados = computed(() => {
    const q = this.filtro().trim().toLowerCase();
    const lista = this.servicios();
    if (!q) return lista;
    return lista.filter(
      (s) =>
        s.empresa.toLowerCase().includes(q) ||
        s.sucursal.toLowerCase().includes(q) ||
        s.tipoContrato.toLowerCase().includes(q) ||
        s.encargado.toLowerCase().includes(q),
    );
  });

  etiqueta = etiquetaServicio;

  ngOnInit(): void {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.desdeCache.set(false);
    const usuarioId = this.session.usuarioId();
    try {
      const lista = await new Promise<ServicioTerreno[]>((resolve, reject) => {
        this.api.listarServicios().subscribe({ next: resolve, error: reject });
      });
      this.servicios.set(lista);
      if (usuarioId) await this.store.cachearServicios(usuarioId, lista);
    } catch (err) {
      if (usuarioId) {
        const cache = await this.store.leerServiciosCache(usuarioId);
        this.servicios.set(cache);
        this.desdeCache.set(cache.length > 0);
      }
      if (!this.desdeCache()) {
        this.snack.open(mensajeErrorHttp(err, 'No se pudieron cargar los servicios.'), 'Cerrar', {
          duration: 5000,
        });
      } else {
        this.snack.open('Sin red: servicios desde caché del teléfono.', 'Cerrar', {
          duration: 3500,
        });
      }
    } finally {
      this.cargando.set(false);
    }
  }

  volver(): void {
    void this.router.navigateByUrl('/terreno');
  }

  nuevoEnServicio(s: ServicioTerreno): void {
    void this.router.navigate(['/terreno/nuevo'], { queryParams: { servicioId: s.id } });
  }
}
