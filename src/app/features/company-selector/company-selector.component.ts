import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AuthStateService } from '../../core/auth-state.service';
import { apiErrorMessage } from '../../core/api-error.util';
import { SecureChannelsApiService } from '../../core/secure-channels-api.service';

@Component({
  selector: 'app-company-selector',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  template: `
    <div class="selector-wrap">
      <mat-card>
        <h2>Selecciona empresa activa</h2>
        <div class="company-list">
          <button mat-stroked-button *ngFor="let row of memberships()" [disabled]="loading()" (click)="choose(row.membership.company_id)">
            <div>{{ row.company.name }}</div>
            <small>{{ row.membership.role }} · {{ row.membership.user_type }}</small>
          </button>
        </div>
        <p class="error" *ngIf="error()">{{ error() }}</p>
      </mat-card>
    </div>
  `,
  styles: [
    `.selector-wrap { min-height: 100vh; display: grid; place-items: center; background: #0b1118; padding: 24px; }
     mat-card { width: 100%; max-width: 600px; background: #101a25; color: #eaf1f8; border: 1px solid #263748; }
     .company-list { display: grid; gap: 12px; }
     button { justify-content: space-between; text-align: left; }
     .error { margin-top: 12px; color: #ff8a8a; }`
  ]
})
export class CompanySelectorComponent {
  readonly memberships = computed(() => this.authState.memberships());
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(
    private readonly authState: AuthStateService,
    private readonly api: SecureChannelsApiService,
    private readonly router: Router,
  ) {}

  choose(companyId: number): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.api.switchCompany(companyId).subscribe({
      next: ({ data }) => {
        this.authState.setCompanyContext({
          companyId,
          effectivePermissions: data?.effective_permissions ?? null,
        });

        const mustChangePassword = Boolean(this.authState.activeMembership()?.membership.must_change_password);
        this.router.navigateByUrl(mustChangePassword ? '/force-password' : '/app');
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'No se pudo cambiar de empresa'));
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }
}
