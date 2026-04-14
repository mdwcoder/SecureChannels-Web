import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStateService } from './auth-state.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authState = inject(AuthStateService);
  const token = authState.token();
  const companyId = authState.companyId();

  let headers = req.headers;

  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  if (companyId && req.url.includes('/api/')) {
    headers = headers.set('X-Company-Id', String(companyId));
  }

  return next(req.clone({ headers }));
};
