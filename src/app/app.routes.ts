import { Routes } from '@angular/router';
import { authGuard, blockIfMustChangePasswordGuard, companySelectedGuard, forcePasswordPageGuard } from './core/auth.guard';
import { CompanySelectorComponent } from './features/company-selector/company-selector.component';
import { ForcePasswordComponent } from './features/force-password/force-password.component';
import { LandingComponent } from './features/landing/landing.component';
import { LoginComponent } from './features/login/login.component';
import { WorkspaceComponent } from './features/workspace/workspace.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'select-company', component: CompanySelectorComponent, canActivate: [authGuard] },
  { path: 'force-password', component: ForcePasswordComponent, canActivate: [authGuard, companySelectedGuard, forcePasswordPageGuard] },
  { path: 'app', component: WorkspaceComponent, canActivate: [authGuard, companySelectedGuard, blockIfMustChangePasswordGuard] },
  { path: '**', redirectTo: '' },
];
