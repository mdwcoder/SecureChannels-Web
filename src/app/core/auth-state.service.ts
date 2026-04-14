import { Injectable, computed, signal } from '@angular/core';
import { EffectivePermissions, MembershipInfo, PermissionKey, UserProfile } from './api.models';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly tokenSignal = signal<string | null>(this.storageGet('sc_token'));
  private readonly userSignal = signal<UserProfile | null>(this.readJson<UserProfile>('sc_user'));
  private readonly membershipsSignal = signal<MembershipInfo[]>(this.readJson<MembershipInfo[]>('sc_memberships') ?? []);
  private readonly companyIdSignal = signal<number | null>(this.readNumber('sc_company_id'));
  private readonly effectivePermissionsSignal = signal<EffectivePermissions>(this.readJson<EffectivePermissions>('sc_effective_permissions') ?? {});

  readonly token = computed(() => this.tokenSignal());
  readonly user = computed(() => this.userSignal());
  readonly memberships = computed(() => this.membershipsSignal());
  readonly companyId = computed(() => this.companyIdSignal());
  readonly effectivePermissions = computed(() => this.effectivePermissionsSignal());
  readonly isAuthenticated = computed(() => !!this.tokenSignal());
  readonly activeMembership = computed(() => {
    const companyId = this.companyIdSignal();
    if (!companyId) {
      return null;
    }

    return this.membershipsSignal().find((entry) => entry.membership.company_id === companyId) ?? null;
  });
  readonly mustChangePassword = computed(() => Boolean(this.activeMembership()?.membership.must_change_password));
  readonly isInternalUser = computed(() => this.activeMembership()?.membership.user_type === 'internal');
  readonly isClientUser = computed(() => this.activeMembership()?.membership.user_type === 'client');

  setSession(payload: { token: string; user: UserProfile; memberships: MembershipInfo[]; companyId?: number | null; effectivePermissions?: EffectivePermissions | null }): void {
    this.tokenSignal.set(payload.token);
    this.userSignal.set(payload.user);
    this.membershipsSignal.set(payload.memberships);
    this.companyIdSignal.set(payload.companyId ?? null);
    this.effectivePermissionsSignal.set(payload.effectivePermissions ?? {});

    this.storageSet('sc_token', payload.token);
    this.storageSet('sc_user', JSON.stringify(payload.user));
    this.storageSet('sc_memberships', JSON.stringify(payload.memberships));
    this.storageSet('sc_effective_permissions', JSON.stringify(payload.effectivePermissions ?? {}));

    if (payload.companyId) {
      this.storageSet('sc_company_id', String(payload.companyId));
    } else {
      this.storageRemove('sc_company_id');
    }
  }

  syncProfile(payload: { user: UserProfile; memberships: MembershipInfo[]; effectivePermissions?: EffectivePermissions | null }): void {
    this.userSignal.set(payload.user);
    this.membershipsSignal.set(payload.memberships);
    this.effectivePermissionsSignal.set(payload.effectivePermissions ?? {});
    this.storageSet('sc_user', JSON.stringify(payload.user));
    this.storageSet('sc_memberships', JSON.stringify(payload.memberships));
    this.storageSet('sc_effective_permissions', JSON.stringify(payload.effectivePermissions ?? {}));
  }

  setCompanyContext(payload: { companyId: number | null; effectivePermissions?: EffectivePermissions | null }): void {
    const { companyId, effectivePermissions } = payload;
    this.companyIdSignal.set(companyId);
    this.effectivePermissionsSignal.set(effectivePermissions ?? {});
    if (companyId === null) {
      this.storageRemove('sc_company_id');
    } else {
      this.storageSet('sc_company_id', String(companyId));
    }
    this.storageSet('sc_effective_permissions', JSON.stringify(effectivePermissions ?? {}));
  }

  updateMembershipPasswordRequirement(companyId: number, mustChangePassword: boolean): void {
    this.membershipsSignal.update((rows) =>
      rows.map((row) =>
        row.membership.company_id === companyId
          ? { ...row, membership: { ...row.membership, must_change_password: mustChangePassword } }
          : row,
      ),
    );
    this.storageSet('sc_memberships', JSON.stringify(this.membershipsSignal()));
  }

  can(permission: PermissionKey): boolean {
    return Boolean(this.effectivePermissionsSignal()[permission]);
  }

  clear(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.membershipsSignal.set([]);
    this.companyIdSignal.set(null);
    this.effectivePermissionsSignal.set({});
    this.storageRemove('sc_token');
    this.storageRemove('sc_user');
    this.storageRemove('sc_memberships');
    this.storageRemove('sc_company_id');
    this.storageRemove('sc_effective_permissions');
  }

  private readJson<T>(key: string): T | null {
    const raw = this.storageGet(key);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private readNumber(key: string): number | null {
    const value = this.storageGet(key);
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private storageGet(key: string): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage.getItem(key);
  }

  private storageSet(key: string, value: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(key, value);
  }

  private storageRemove(key: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(key);
  }
}
