import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { ConnectivityService } from '../../core/services/connectivity.service';
import { mensajeErrorHttp } from '../../core/utils/http-error';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  readonly cargando = signal(false);
  readonly mostrarPassword = signal(false);
  readonly online = this.connectivity.online;

  readonly form = this.fb.nonNullable.group({
    usuario: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(4)]],
    recordar: [true],
  });

  ngOnInit(): void {
    if (this.session.autenticado()) {
      void this.router.navigateByUrl('/panel');
      return;
    }
    const remembered = this.session.credencialesRecordadas();
    if (remembered) {
      this.form.patchValue({
        usuario: remembered.usuario,
        password: remembered.password,
        recordar: true,
      });
    }
  }

  enviar(): void {
    if (this.form.invalid || this.cargando()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.cargando.set(true);
    this.auth
      .login(v.usuario.trim(), v.password, v.recordar)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/panel'),
        error: (err) =>
          this.snack.open(mensajeErrorHttp(err, 'No se pudo iniciar sesión.'), 'Cerrar', {
            duration: 5000,
          }),
      });
  }
}
