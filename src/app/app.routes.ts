import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'panel' },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'panel',
    canActivate: [authGuard],
    loadComponent: () => import('./features/panel/panel.page').then((m) => m.PanelPage),
  },
  {
    path: 'terreno',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/terreno/modulo/terreno-modulo.page').then((m) => m.TerrenoModuloPage),
  },
  {
    path: 'terreno/nuevo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/terreno/formulario/formulario.page').then((m) => m.FormularioPage),
  },
  {
    path: 'terreno/registros',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/terreno/registros/registros.page').then((m) => m.RegistrosPage),
  },
  {
    path: 'terreno/registros/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/terreno/detalle/detalle.page').then((m) => m.DetallePage),
  },
  {
    path: 'terreno/servicios',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/terreno/servicios/servicios.page').then((m) => m.ServiciosPage),
  },
  {
    path: 'arranque',
    canActivate: [authGuard],
    loadComponent: () => import('./features/arranque/arranque.page').then((m) => m.ArranquePage),
  },
  { path: '**', redirectTo: 'panel' },
];
