import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionService } from '../services/session.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const token = session.token().trim();
  if (!token) return next(req);

  // Storage acepta Bearer en Azure; el resto de endpoints también.
  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token.replace(/^Bearer\s+/i, '')}` },
  });
  return next(authReq);
};
