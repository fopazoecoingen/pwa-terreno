import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TIPOS_LUGAR } from '../../../core/config/api.config';
import { SessionService } from '../../../core/services/session.service';
import { TerrenoApiService } from '../../../core/services/terreno-api.service';
import { OfflineStoreService } from '../../../core/services/offline-store.service';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';
import { ConnectivityService } from '../../../core/services/connectivity.service';
import { ServicioTerreno, etiquetaServicio } from '../../../core/models/terreno.model';
import type { RegistroLocal } from '../../../core/models/offline-registro.model';
import { subcarpetaBlobParaRegistro } from '../../../core/utils/terreno-paths';
import { mensajeErrorHttp } from '../../../core/utils/http-error';

interface FotoPendiente {
  file: File;
  previewUrl: string;
}

@Component({
  selector: 'app-formulario-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './formulario.page.html',
  styleUrl: './formulario.page.scss',
})
export class FormularioPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(TerrenoApiService);
  private readonly session = inject(SessionService);
  private readonly store = inject(OfflineStoreService);
  private readonly sync = inject(OfflineSyncService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snack = inject(MatSnackBar);

  readonly tipos = TIPOS_LUGAR;
  readonly enviando = signal(false);
  readonly guardando = signal(false);
  readonly fotos = signal<FotoPendiente[]>([]);
  readonly servicios = signal<ServicioTerreno[]>([]);
  readonly servicioPreseleccionado = signal<ServicioTerreno | null>(null);
  readonly online = this.connectivity.online;
  readonly localId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    nombreTerreno: ['', [Validators.required, Validators.maxLength(120)]],
    descripcion: ['', Validators.required],
    observacion: [''],
    servicioEcoingenId: [0 as number],
  });

  etiqueta = etiquetaServicio;

  async ngOnInit(): Promise<void> {
    await this.cargarServicios();

    const servicioId = Number(this.route.snapshot.queryParamMap.get('servicioId') || 0);
    const localId = this.route.snapshot.queryParamMap.get('localId');

    if (localId) {
      await this.cargarBorrador(localId);
      return;
    }

    if (servicioId > 0) {
      const s = this.servicios().find((x) => x.id === servicioId) ?? null;
      this.servicioPreseleccionado.set(s);
      if (s) {
        this.form.patchValue({
          servicioEcoingenId: s.id,
          nombreTerreno:
            [s.empresa, s.sucursal].filter(Boolean).join(' - ') || `Servicio ${s.id}`,
        });
      }
    }
  }

  private async cargarServicios(): Promise<void> {
    const usuarioId = this.session.usuarioId();
    try {
      const lista = await new Promise<ServicioTerreno[]>((resolve, reject) => {
        this.api.listarServicios().subscribe({ next: resolve, error: reject });
      });
      const filtrada = lista.filter((s) => s.id > 0);
      this.servicios.set(filtrada);
      if (usuarioId) await this.store.cachearServicios(usuarioId, filtrada);
    } catch {
      if (usuarioId) {
        const cache = await this.store.leerServiciosCache(usuarioId);
        this.servicios.set(cache);
        if (cache.length) {
          this.snack.open('Sin red: mostrando servicios guardados en el teléfono.', 'Cerrar', {
            duration: 3500,
          });
        }
      }
    }
  }

  private async cargarBorrador(localId: string): Promise<void> {
    const reg = await this.store.obtenerRegistro(localId);
    if (!reg) {
      this.snack.open('No se encontró el borrador local.', 'Cerrar', { duration: 3500 });
      return;
    }
    this.localId.set(localId);
    this.form.patchValue({
      nombreTerreno: reg.nombreTerreno,
      descripcion: reg.descripcion,
      observacion: reg.observacion,
      servicioEcoingenId: reg.servicioId ?? 0,
    });
    const fotos = await this.store.listarFotos(localId);
    this.fotos.set(
      fotos.map((f) => ({
        file: new File([f.blob], f.nombre, { type: f.mimeType || 'image/jpeg' }),
        previewUrl: URL.createObjectURL(f.blob),
      })),
    );
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    const nuevas = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    this.fotos.update((prev) => [...prev, ...nuevas]);
    input.value = '';
  }

  quitarFoto(index: number): void {
    this.fotos.update((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return copy;
    });
  }

  volver(): void {
    void this.router.navigateByUrl('/terreno');
  }

  async guardarBorrador(): Promise<void> {
    if (this.form.controls.nombreTerreno.invalid) {
      this.form.controls.nombreTerreno.markAsTouched();
      this.snack.open('Indica al menos el nombre del terreno para guardar.', 'Cerrar', {
        duration: 3500,
      });
      return;
    }
    this.guardando.set(true);
    try {
      const reg = await this.persistirLocal('borrador');
      this.localId.set(reg.localId);
      this.snack.open('Borrador guardado en este teléfono (offline).', 'Cerrar', {
        duration: 3500,
      });
    } catch (err) {
      this.snack.open(mensajeErrorHttp(err, 'No se pudo guardar el borrador.'), 'Cerrar', {
        duration: 5000,
      });
    } finally {
      this.guardando.set(false);
    }
  }

  async enviar(): Promise<void> {
    if (this.form.invalid || this.enviando()) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    try {
      const reg = await this.persistirLocal('pendiente');
      this.localId.set(reg.localId);

      const resultado = await this.sync.sincronizarPendientes();
      if (resultado.sinConexion) {
        this.snack.open(
          'Sin conexión: el registro quedó pendiente y se enviará al recuperar red.',
          'Cerrar',
          { duration: 5000 },
        );
        void this.router.navigateByUrl('/terreno/registros');
        return;
      }

      if (resultado.sincronizados > 0) {
        const actualizado = await this.store.obtenerRegistro(reg.localId);
        this.snack.open(
          actualizado?.serverId
            ? `Registro #${actualizado.serverId} enviado.`
            : 'Registro sincronizado.',
          'Cerrar',
          { duration: 4000 },
        );
        if (actualizado?.serverId) {
          void this.router.navigate(['/terreno/registros', actualizado.serverId]);
        } else {
          void this.router.navigateByUrl('/terreno/registros');
        }
        return;
      }

      this.snack.open(
        'Quedó pendiente de sincronizar. Revisa “Mis registros” o intenta de nuevo con red.',
        'Cerrar',
        { duration: 5000 },
      );
      void this.router.navigateByUrl('/terreno/registros');
    } catch (err) {
      this.snack.open(mensajeErrorHttp(err, 'No se pudo preparar el envío.'), 'Cerrar', {
        duration: 5500,
      });
    } finally {
      this.enviando.set(false);
    }
  }

  private async persistirLocal(estado: 'borrador' | 'pendiente'): Promise<RegistroLocal> {
    const v = this.form.getRawValue();
    const usuarioId = this.session.usuarioId();
    if (!usuarioId) throw new Error('Sesión inválida. Vuelve a iniciar sesión.');

    const servicioId = v.servicioEcoingenId > 0 ? v.servicioEcoingenId : null;
    const servicio = this.servicios().find((s) => s.id === servicioId) ?? null;
    const carpeta = subcarpetaBlobParaRegistro(v.nombreTerreno, servicioId);
    const ahora = new Date().toISOString();
    const id = this.localId() ?? this.store.nuevoLocalId();
    const existente = await this.store.obtenerRegistro(id);

    const registro: RegistroLocal = {
      localId: id,
      usuarioId,
      nombreTerreno: v.nombreTerreno.trim(),
      descripcion: v.descripcion,
      observacion: v.observacion.trim(),
      blobStorage: carpeta,
      servicioId,
      servicioEtiqueta: servicio ? etiquetaServicio(servicio) : '',
      estadoSync: estado,
      serverId: existente?.serverId ?? null,
      ultimoError: null,
      fotosEsperadas: this.fotos().length,
      fechaCreacion: existente?.fechaCreacion ?? ahora,
      fechaModificacion: ahora,
    };

    await this.store.guardarRegistro(registro);
    await this.store.reemplazarFotos(
      id,
      this.fotos().map((f, orden) => ({
        nombre: f.file.name || `foto_${orden + 1}.jpg`,
        mimeType: f.file.type || 'image/jpeg',
        blob: f.file,
        orden,
      })),
    );
    return registro;
  }
}
