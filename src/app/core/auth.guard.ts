import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthStateService } from './auth-state.service';
import { PermissionKey } from './api.models';

export const authGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (authState.isAuthenticated()) {
    return true;
  }

  return router.parseUrl('/login');
};

export const companySelectedGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (authState.companyId()) {
    return true;
  }

  return router.parseUrl('/select-company');
};

export const blockIfMustChangePasswordGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (authState.mustChangePassword()) {
    return router.parseUrl('/force-password');
  }

  return true;
};

export const forcePasswordPageGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (!authState.companyId()) {
    return router.parseUrl('/select-company');
  }

  if (authState.mustChangePassword()) {
    return true;
  }

  return router.parseUrl('/app');
};

export const internalOnlyGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (authState.isInternalUser()) {
    return true;
  }

  return router.parseUrl('/app');
};

export const permissionGuard = (...permissions: PermissionKey[]): CanActivateFn => {
  return () => {
    const authState = inject(AuthStateService);
    const router = inject(Router);

    if (permissions.every((permission) => authState.can(permission))) {
      return true;
    }

    return router.parseUrl('/app');
  };
};
