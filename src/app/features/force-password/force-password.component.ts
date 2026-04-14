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
import { SecureChannelsApiService } from '../../core/secure-channels-api.service';

@Component({
  selector: 'app-force-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="wrap">
      <mat-card>
        <h2>Cambio obligatorio de contraseña</h2>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline"><mat-label>Contraseña actual</mat-label><input matInput type="password" formControlName="current_password" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Nueva contraseña</mat-label><input matInput type="password" formControlName="new_password" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Confirmación</mat-label><input matInput type="password" formControlName="new_password_confirmation" /></mat-form-field>
          <button mat-raised-button color="primary" type="submit" [disabled]="loading()">Guardar</button>
        </form>
        <p class="error" *ngIf="error()">{{ error() }}</p>
      </mat-card>
    </div>
  `,
  styles: [
    `.wrap { min-height: 100vh; display: grid; place-items: center; background: linear-gradient(160deg, #102030, #081018); padding: 24px; }
     mat-card { width: 100%; max-width: 520px; background: #121f2b; color: #f0f4f8; border: 1px solid #283f56; }
     form { display: grid; gap: 10px; }
     .error { color: #ff8a8a; margin-top: 10px; }`
  ]
})
export class ForcePasswordComponent {
  readonly form = new FormGroup({
    current_password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    new_password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    new_password_confirmation: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
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

    this.api.changePassword(this.form.getRawValue()).subscribe({
      next: () => {
        const companyId = this.authState.companyId();
        if (companyId) {
          this.authState.updateMembershipPasswordRequirement(companyId, false);
        }
        this.router.navigateByUrl('/app');
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'No se pudo cambiar la contraseña'));
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }
}
