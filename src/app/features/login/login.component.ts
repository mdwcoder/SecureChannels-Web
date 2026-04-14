import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthStateService } from '../../core/auth-state.service';
import { apiErrorMessage } from '../../core/api-error.util';
import { MembershipInfo } from '../../core/api.models';
import { SecureChannelsApiService } from '../../core/secure-channels-api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="auth-wrap">
      <mat-card>
        <h1>SecureChannels</h1>
        <p>Acceso a entorno empresarial</p>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput type="password" formControlName="password" />
          </mat-form-field>

          <button mat-raised-button color="primary" type="submit" [disabled]="loading()">Entrar</button>
        </form>

        <p class="error" *ngIf="error()">{{ error() }}</p>
      </mat-card>
    </div>
  `,
  styles: [
    `.auth-wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: radial-gradient(circle at 20% 10%, #21354b, #0a1118 45%, #060a0f 100%); }
     mat-card { width: 100%; max-width: 460px; background: #111a24; color: #e7eef7; border: 1px solid #2a3a4e; }
     h1 { margin: 0 0 8px; }
     p { margin: 0 0 20px; color: #9fb3ca; }
     form { display: flex; flex-direction: column; gap: 12px; }
     .error { margin-top: 16px; color: #ff9b9b; }`
  ]
})
export class LoginComponent {
  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(
    private readonly api: SecureChannelsApiService,
    private readonly authState: AuthStateService,
    private readonly router: Router,
  ) {}

  submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.api.login(this.form.getRawValue()).subscribe({
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

        this.authState.setSession({
          token,
          user,
          memberships,
          companyId: preselectedCompany,
          effectivePermissions: null,
        });

        if (!preselectedCompany) {
          this.router.navigateByUrl('/select-company');
          return;
        }

        this.api.switchCompany(preselectedCompany).subscribe({
          next: ({ data: switchData }) => {
            this.authState.setCompanyContext({
              companyId: preselectedCompany,
              effectivePermissions: switchData?.effective_permissions ?? null,
            });

            const mustChange = Boolean(this.authState.activeMembership()?.membership.must_change_password);
            this.router.navigateByUrl(mustChange ? '/force-password' : '/app');
          },
          error: (err) => {
            this.error.set(apiErrorMessage(err, 'No se pudo seleccionar la empresa activa'));
          },
        });
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'No se pudo iniciar sesión'));
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }
}
