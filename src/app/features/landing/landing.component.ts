import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthStateService } from '../../core/auth-state.service';
import { apiErrorMessage } from '../../core/api-error.util';
import { MembershipInfo } from '../../core/api.models';
import { SecureChannelsApiService } from '../../core/secure-channels-api.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTabsModule,
    MatSnackBarModule,
  ],
  template: `
    <main class="landing">
      <section class="hero">
        <p class="eyebrow">SecureChannels</p>
        <h1>Colaboración segura multiempresa con trazabilidad completa</h1>
        <p>
          Plataforma de comunicación interna y con clientes, con control de permisos por membership,
          auditoría y cifrado de mensajes por canal.
        </p>
      </section>

      <mat-card class="panel">
        <mat-tab-group dynamicHeight>
          <mat-tab label="Login">
            <form class="form" [formGroup]="loginForm" (ngSubmit)="login()">
              <mat-form-field appearance="outline"><mat-label>Email</mat-label><input matInput formControlName="email" type="email" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Password</mat-label><input matInput formControlName="password" type="password" /></mat-form-field>
              <button mat-raised-button color="primary" type="submit" [disabled]="loading()">Entrar</button>
            </form>
          </mat-tab>

          <mat-tab label="Crear empresa">
            <form class="form" [formGroup]="registerCompanyForm" (ngSubmit)="registerCompany()">
              <mat-form-field appearance="outline"><mat-label>Nombre empresa</mat-label><input matInput formControlName="company_name" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Slug empresa</mat-label><input matInput formControlName="company_slug" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Email empresa</mat-label><input matInput formControlName="company_email" type="email" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Nombre admin</mat-label><input matInput formControlName="admin_name" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Email admin</mat-label><input matInput formControlName="admin_email" type="email" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Password admin</mat-label><input matInput formControlName="admin_password" type="password" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Dirección</mat-label><input matInput formControlName="address" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Website</mat-label><input matInput formControlName="website" /></mat-form-field>
              <button mat-raised-button color="primary" type="submit" [disabled]="loading()">Crear empresa y entrar</button>
            </form>
          </mat-tab>

          <mat-tab label="Registro cliente">
            <form class="form" [formGroup]="clientRegisterForm" (ngSubmit)="registerClient()">
              <mat-form-field appearance="outline"><mat-label>Código de invitación</mat-label><input matInput formControlName="code" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Nombre</mat-label><input matInput formControlName="name" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Email</mat-label><input matInput formControlName="email" type="email" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Password</mat-label><input matInput formControlName="password" type="password" /></mat-form-field>
              <button mat-raised-button color="primary" type="submit" [disabled]="loading()">Registrarme como cliente</button>
            </form>
          </mat-tab>

          <mat-tab label="Registro usuario">
            <form class="form" [formGroup]="userRequestForm" (ngSubmit)="registerUserRequest()">
              <p class="hint">
                El alta de usuario interno se procesa como solicitud en /user-creation-requests y requiere sesión autenticada
                y empresa activa.
              </p>
              <mat-form-field appearance="outline"><mat-label>Nombre</mat-label><input matInput formControlName="name" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Email</mat-label><input matInput formControlName="email" type="email" /></mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Rol solicitado</mat-label>
                <mat-select formControlName="requested_role">
                  <mat-option value="admin">admin</mat-option>
                  <mat-option value="manager">manager</mat-option>
                  <mat-option value="user">user</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Tipo solicitado</mat-label>
                <mat-select formControlName="requested_user_type">
                  <mat-option value="internal">internal</mat-option>
                  <mat-option value="client">client</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit" [disabled]="loading()">Enviar solicitud de usuario</button>
            </form>
          </mat-tab>
        </mat-tab-group>

        <p class="error" *ngIf="error()">{{ error() }}</p>
      </mat-card>
    </main>
  `,
  styles: [
    `.landing { min-height: 100vh; padding: 24px; display: grid; grid-template-columns: minmax(260px, 1fr) minmax(320px, 680px); gap: 24px; background: radial-gradient(circle at 10% 20%, #21354b 0%, #0a1118 45%, #060a0f 100%); }
     .hero { color: #e8f1fb; align-self: center; }
     .eyebrow { letter-spacing: .12em; text-transform: uppercase; color: #8fc9ff; font-weight: 700; }
     h1 { font-size: clamp(1.8rem, 3.6vw, 3.1rem); line-height: 1.1; margin: 10px 0 16px; }
     .panel { background: #101b28; color: #eaf1f8; border: 1px solid #2a3c50; }
     .form { padding: 14px 0 8px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; align-items: end; }
     .form button { grid-column: 1 / -1; justify-self: start; }
     .hint { grid-column: 1 / -1; color: #a8bfd7; margin: 0 0 8px; }
     .error { margin-top: 12px; color: #ff9b9b; }
     @media (max-width: 980px) { .landing { grid-template-columns: 1fr; } }
    `,
  ],
})
export class LandingComponent {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly loginForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly registerCompanyForm = new FormGroup({
    company_name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    company_slug: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    company_email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    admin_name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    admin_email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    admin_password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    address: new FormControl('', { nonNullable: true }),
    website: new FormControl('', { nonNullable: true }),
  });

  readonly clientRegisterForm = new FormGroup({
    code: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  });

  readonly userRequestForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    requested_role: new FormControl<'admin' | 'manager' | 'user'>('user', { nonNullable: true, validators: [Validators.required] }),
    requested_user_type: new FormControl<'internal' | 'client'>('internal', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor(
    private readonly api: SecureChannelsApiService,
    private readonly authState: AuthStateService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
  ) {}

  login(): void {
    if (this.loginForm.invalid || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.api.login(this.loginForm.getRawValue()).subscribe({
      next: ({ data }) => {
        const memberships = (data?.memberships ?? []) as MembershipInfo[];
        const user = data?.user;
        const token = data?.token;
        const preselectedCompany = memberships.length === 1 ? memberships[0].membership.company_id : null;

        if (!token || !user) {
          this.error.set('Respuesta de login inválida.');
          this.loading.set(false);
          return;
        }

        this.authState.setSession({ token, user, memberships, companyId: preselectedCompany, effectivePermissions: null });

        if (!preselectedCompany) {
          this.router.navigateByUrl('/select-company');
          return;
        }

        this.api.switchCompany(preselectedCompany).subscribe({
          next: ({ data: switchData }) => {
            this.authState.setCompanyContext({ companyId: preselectedCompany, effectivePermissions: switchData?.effective_permissions ?? null });
            this.router.navigateByUrl(this.authState.mustChangePassword() ? '/force-password' : '/app');
          },
          error: (err) => this.setError(err, 'No se pudo seleccionar empresa activa'),
        });
      },
      error: (err) => {
        this.setError(err, 'No se pudo iniciar sesión');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  registerCompany(): void {
    if (this.registerCompanyForm.invalid || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.api.registerCompany(this.registerCompanyForm.getRawValue()).subscribe({
      next: ({ data }) => {
        const token = data?.token as string;
        const user = data?.user;
        const companyId = data?.membership?.company_id as number;
        const membership = data?.membership;
        const company = data?.company;

        if (!token || !user || !companyId || !membership || !company) {
          this.error.set('Respuesta de registro de empresa inválida.');
          this.loading.set(false);
          return;
        }

        this.authState.setSession({
          token,
          user,
          memberships: [{ membership, company }],
          companyId,
          effectivePermissions: data?.effective_permissions ?? null,
        });

        this.router.navigateByUrl('/app');
      },
      error: (err) => {
        this.setError(err, 'No se pudo crear la empresa');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  registerClient(): void {
    if (this.clientRegisterForm.invalid || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.api.registerClient(this.clientRegisterForm.getRawValue()).subscribe({
      next: ({ data }) => {
        const token = data?.token as string;
        const user = data?.user;
        const membership = data?.membership;

        if (!token || !user || !membership) {
          this.error.set('Respuesta de registro de cliente inválida.');
          this.loading.set(false);
          return;
        }

        this.authState.setSession({ token, user, memberships: [], companyId: null, effectivePermissions: null });
        this.api.me().subscribe({
          next: ({ data }) => {
            this.authState.syncProfile({ user: data.user, memberships: data.memberships, effectivePermissions: data.effective_permissions });
            if (data.memberships.length === 1) {
              const companyId = data.memberships[0].membership.company_id;
              this.api.switchCompany(companyId).subscribe({
                next: ({ data: sw }) => {
                  this.authState.setCompanyContext({ companyId, effectivePermissions: sw?.effective_permissions ?? null });
                  this.router.navigateByUrl('/app');
                },
                error: (err) => this.setError(err, 'Cliente registrado, pero no se pudo activar empresa'),
              });
            } else {
              this.router.navigateByUrl('/select-company');
            }
          },
          error: (err) => this.setError(err, 'Cliente registrado, pero no se pudo cargar perfil'),
        });
      },
      error: (err) => {
        this.setError(err, 'No se pudo registrar cliente');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  registerUserRequest(): void {
    if (this.userRequestForm.invalid || this.loading()) {
      return;
    }

    if (!this.authState.isAuthenticated() || !this.authState.companyId()) {
      this.error.set('Para registrar usuario interno primero debes iniciar sesión y seleccionar empresa.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.api.createUserCreationRequest(this.userRequestForm.getRawValue()).subscribe({
      next: () => {
        this.snackBar.open('Solicitud de usuario creada.', 'OK', { duration: 4000 });
        this.userRequestForm.reset({ name: '', email: '', requested_role: 'user', requested_user_type: 'internal' });
      },
      error: (err) => this.setError(err, 'No se pudo crear la solicitud de usuario'),
      complete: () => this.loading.set(false),
    });
  }

  private setError(err: unknown, fallback: string): void {
    this.error.set(apiErrorMessage(err, fallback));
  }
}
