import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionService } from '../services/session.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const token = session.token().trim();
  if (!token) return next(req);

  let headers = req.headers.set(
    'Authorization',
    `Bearer ${token.replace(/^Bearer\s+/i, '')}`,
  );

  // Con FormData el browser debe poner el boundary; si queda un Content-Type
  // fijo, ASP.NET no bindea IFormFile y responde "No se recibió ningún archivo".
  if (typeof FormData !== 'undefined' && req.body instanceof FormData && headers.has('Content-Type')) {
    headers = headers.delete('Content-Type');
  }

  return next(req.clone({ headers }));
};
