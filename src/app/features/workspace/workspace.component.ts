import { CommonModule } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { forkJoin } from 'rxjs';
import { Observable } from 'rxjs';
import { AuthStateService } from '../../core/auth-state.service';
import { apiErrorMessage } from '../../core/api-error.util';
import {
  Channel,
  MembershipListRow,
  MessageItem,
  PermissionKey,
  PresenceRow,
  SearchMessageResult,
  SectionRow,
  SessionRow,
  UserCreationRequest,
} from '../../core/api.models';
import { SecureChannelsApiService } from '../../core/secure-channels-api.service';

type MenuKey = 'dashboard' | 'members' | 'sections' | 'channels' | 'chat' | 'search' | 'security' | 'settings';

interface MenuEntry {
  key: MenuKey;
  label: string;
  icon: string;
  requiresInternal?: boolean;
  anyPermission?: PermissionKey[];
}

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatButtonModule,
    MatInputModule,
    MatCardModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatSnackBarModule,
  ],
  template: `
    <mat-sidenav-container class="container">
      <mat-sidenav [mode]="isMobile() ? 'over' : 'side'" [opened]="!isMobile() || drawerOpen()" class="left" (closedStart)="drawerOpen.set(false)">
        <div class="brand">SecureChannels</div>
        <button mat-button class="nav-btn" *ngFor="let item of visibleMenu()" [class.active]="menu() === item.key" (click)="selectMenu(item.key)">
          <mat-icon>{{ item.icon }}</mat-icon>
          <span>{{ item.label }}</span>
        </button>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar class="topbar">
          <button mat-icon-button *ngIf="isMobile()" (click)="drawerOpen.set(!drawerOpen())"><mat-icon>menu</mat-icon></button>
          <span>{{ activeCompanyName() }}</span>
          <span class="spacer"></span>
          <span>{{ userName() }}</span>
          <button mat-icon-button (click)="logout()"><mat-icon>logout</mat-icon></button>
        </mat-toolbar>

        <div class="error-banner" *ngIf="error()">{{ error() }}</div>

        <section class="content" *ngIf="menu() === 'dashboard'">
          <mat-card>
            <h2>Dashboard</h2>
            <p>Empresa activa: {{ activeCompanyName() }}</p>
            <p>Canales visibles: {{ channels().length }}</p>
            <p>Memberships cargadas: {{ memberships().length }}</p>
            <button mat-raised-button color="primary" (click)="refreshDashboard()">Refrescar</button>
          </mat-card>
        </section>

        <section class="content" *ngIf="menu() === 'members'">
          <mat-card>
            <div class="header-row">
              <h2>Members</h2>
              <button mat-stroked-button (click)="loadMembersModule()">Refrescar</button>
            </div>

            <div class="inline-form" *ngIf="can('can_manage_users') && isInternal()">
              <input matInput placeholder="Nombre" [(ngModel)]="newInternalUser.name" />
              <input matInput placeholder="Email" [(ngModel)]="newInternalUser.email" />
              <mat-select [(ngModel)]="newInternalUser.role">
                <mat-option value="admin">admin</mat-option>
                <mat-option value="manager">manager</mat-option>
                <mat-option value="user">user</mat-option>
              </mat-select>
              <input matInput placeholder="Permisos CSV" [(ngModel)]="newInternalUser.permissionsCsv" />
              <input matInput placeholder="Secciones IDs CSV" [(ngModel)]="newInternalUser.sectionIdsCsv" />
              <button mat-raised-button color="primary" (click)="createInternalUser()">Crear interno</button>
            </div>

            <div class="inline-form" *ngIf="isInternal()">
              <input matInput placeholder="Solicitud: Nombre" [(ngModel)]="newUserRequest.name" />
              <input matInput placeholder="Solicitud: Email" [(ngModel)]="newUserRequest.email" />
              <mat-select [(ngModel)]="newUserRequest.requested_role">
                <mat-option value="admin">admin</mat-option>
                <mat-option value="manager">manager</mat-option>
                <mat-option value="user">user</mat-option>
              </mat-select>
              <mat-select [(ngModel)]="newUserRequest.requested_user_type">
                <mat-option value="internal">internal</mat-option>
                <mat-option value="client">client</mat-option>
              </mat-select>
              <button mat-raised-button (click)="createUserRequest()">Crear request</button>
            </div>

            <div class="inline-form" *ngIf="can('can_generate_client_invites')">
              <input matInput placeholder="Invite email_hint" [(ngModel)]="newInvite.email_hint" />
              <input matInput placeholder="max_uses" type="number" [(ngModel)]="newInvite.max_uses" />
              <button mat-raised-button (click)="createInviteCode()">Crear invite</button>
            </div>

            <h3>Company Memberships</h3>
            <div class="list-box">
              <article *ngFor="let row of memberships()" class="list-item">
                <div>
                  <strong>{{ row.user.name }}</strong>
                  <small>{{ row.user.email }} · {{ row.membership.role }} · {{ row.membership.user_type }} · {{ row.membership.status }}</small>
                </div>
                <div class="actions" *ngIf="can('can_manage_users')">
                  <button mat-button (click)="suspendMembership(row.membership.id)">Suspender</button>
                  <button mat-button (click)="activateMembership(row.membership.id)">Activar</button>
                </div>
              </article>
            </div>

            <h3>User Creation Requests</h3>
            <div class="list-box">
              <article *ngFor="let req of userRequests()" class="list-item">
                <div>
                  <strong>{{ req.name }}</strong>
                  <small>{{ req.email }} · {{ req.requested_role }} · {{ req.status }}</small>
                </div>
                <div class="actions" *ngIf="can('can_manage_users') && req.status === 'pending'">
                  <button mat-button (click)="approveRequest(req.id)">Aprobar</button>
                  <button mat-button (click)="rejectRequest(req.id)">Rechazar</button>
                </div>
              </article>
            </div>

            <h3>Client Invite Codes</h3>
            <div class="list-box">
              <article *ngFor="let invite of inviteCodes()" class="list-item">
                <div>
                  <strong>{{ invite.code }}</strong>
                  <small>{{ invite.email_hint || 'sin email_hint' }} · usos {{ invite.used_count }}/{{ invite.max_uses }} · {{ invite.is_active ? 'active' : 'inactive' }}</small>
                </div>
              </article>
            </div>
          </mat-card>
        </section>

        <section class="content" *ngIf="menu() === 'sections'">
          <mat-card>
            <div class="header-row">
              <h2>Sections</h2>
              <button mat-stroked-button (click)="loadSections()">Refrescar</button>
            </div>

            <div class="inline-form" *ngIf="isInternal() && can('can_manage_sections')">
              <input matInput placeholder="Nombre sección" [(ngModel)]="newSection.name" />
              <input matInput placeholder="Descripción" [(ngModel)]="newSection.description" />
              <input matInput placeholder="permission_keys CSV" [(ngModel)]="newSection.permissionKeysCsv" />
              <button mat-raised-button color="primary" (click)="createSection()">Crear</button>
            </div>

            <div class="list-box">
              <article *ngFor="let row of sections()" class="list-item">
                <div>
                  <strong>{{ row.section.name }}</strong>
                  <small>ID {{ row.section.id }} · miembros: {{ row.members_count }} · {{ row.section.is_active ? 'active' : 'inactive' }}</small>
                </div>
                <div class="actions" *ngIf="can('can_manage_sections')">
                  <button mat-button (click)="deactivateSection(row.section.id)">Desactivar</button>
                  <button mat-button (click)="addMemberToSection(row.section.id)">+ miembro</button>
                </div>
              </article>
            </div>
          </mat-card>
        </section>

        <section class="content" *ngIf="menu() === 'channels'">
          <mat-card>
            <div class="header-row">
              <h2>Channels</h2>
              <button mat-stroked-button (click)="loadChannels()">Refrescar</button>
            </div>

            <div class="inline-form" *ngIf="can('can_create_channels')">
              <input matInput placeholder="Nombre canal" [(ngModel)]="newChannel.name" />
              <mat-select [(ngModel)]="newChannel.visibility_type">
                <mat-option value="private">private</mat-option>
                <mat-option value="company_public">company_public</mat-option>
                <mat-option value="shared_public">shared_public</mat-option>
              </mat-select>
              <input matInput placeholder="IDs miembros CSV" [(ngModel)]="newChannel.memberIdsCsv" />
              <input matInput placeholder="IDs secciones CSV" [(ngModel)]="newChannel.sectionIdsCsv" />
              <button mat-raised-button color="primary" (click)="createChannel()">Crear</button>
            </div>

            <div class="inline-form" *ngIf="memberships().length > 0">
              <input matInput placeholder="target_membership_id para DM" [(ngModel)]="directMessageTargetMembershipId" />
              <button mat-button (click)="createDirectMessage()">Abrir DM</button>
            </div>

            <div class="list-box">
              <article *ngFor="let channel of channels()" class="list-item clickable" (click)="selectChannel(channel)">
                <div>
                  <strong># {{ channel.name }}</strong>
                  <small>{{ channel.visibility_type }} · {{ channel.is_archived ? 'archived' : 'active' }}</small>
                </div>
                <div class="actions" *ngIf="can('can_manage_channel_members')">
                  <button mat-button (click)="toggleArchive(channel); $event.stopPropagation()">{{ channel.is_archived ? 'Unarchive' : 'Archive' }}</button>
                  <button mat-button (click)="addMemberToChannel(channel.id); $event.stopPropagation()">+ miembro</button>
                  <button mat-button (click)="addSectionToChannel(channel.id); $event.stopPropagation()">+ sección</button>
                </div>
              </article>
            </div>
          </mat-card>
        </section>

        <section class="content" *ngIf="menu() === 'chat'">
          <mat-card>
            <div class="header-row">
              <h2>Chat</h2>
              <button mat-stroked-button (click)="reloadActiveChannelMessages()" [disabled]="!selectedChannelId()">Refrescar</button>
            </div>

            <p *ngIf="!selectedChannelId()">Selecciona un canal en "Channels" para cargar mensajes.</p>
            <div *ngIf="selectedChannelId()">
              <div class="messages">
                <article *ngFor="let item of messages()" class="msg-row">
                  <div>
                    <strong>{{ item.sender?.name || 'Unknown' }}</strong>
                    <small>{{ item.sent_at | date:'short' }} {{ item.is_edited ? '(editado)' : '' }}</small>
                    <p>{{ item.content || '[deleted]' }}</p>
                  </div>
                  <div class="actions">
                    <button mat-button *ngIf="item.content" (click)="prepareEdit(item)">Editar</button>
                    <button mat-button (click)="deleteMessage(item.id)">Eliminar</button>
                    <button mat-button (click)="loadRevisions(item.id)">Revisiones</button>
                  </div>
                </article>
              </div>

              <div class="inline-form">
                <input matInput placeholder="Mensaje" [(ngModel)]="newMessage" />
                <button mat-raised-button color="primary" (click)="sendMessage()">Enviar</button>
              </div>

              <div class="inline-form" *ngIf="editingMessageId()">
                <input matInput placeholder="Editar mensaje" [(ngModel)]="editingContent" />
                <button mat-stroked-button (click)="updateMessage()">Guardar edición</button>
                <button mat-button (click)="cancelEdit()">Cancelar</button>
              </div>

              <pre *ngIf="messageRevisionsRaw()">{{ messageRevisionsRaw() }}</pre>
            </div>
          </mat-card>
        </section>

        <section class="content" *ngIf="menu() === 'search'">
          <mat-card>
            <h2>Search</h2>
            <div class="inline-form">
              <input matInput placeholder="Texto" [(ngModel)]="searchForm.q" />
              <input matInput placeholder="channel_id" [(ngModel)]="searchForm.channel_id" />
              <input matInput placeholder="sender_membership_id" [(ngModel)]="searchForm.sender_membership_id" />
              <input matInput placeholder="date_from YYYY-MM-DD" [(ngModel)]="searchForm.date_from" />
              <input matInput placeholder="date_to YYYY-MM-DD" [(ngModel)]="searchForm.date_to" />
              <button mat-raised-button color="primary" (click)="searchMessages()">Buscar</button>
            </div>

            <div class="list-box">
              <article *ngFor="let result of searchResults()" class="list-item">
                <div>
                  <strong># {{ result.channel_name }}</strong>
                  <small>{{ result.sender_name }} · {{ result.sent_at }}</small>
                  <p [innerHTML]="result.snippet"></p>
                </div>
              </article>
            </div>
          </mat-card>
        </section>

        <section class="content" *ngIf="menu() === 'security'">
          <mat-card>
            <div class="header-row">
              <h2>Security</h2>
              <button mat-stroked-button (click)="loadSecurity()">Refrescar</button>
            </div>

            <h3>Sessions</h3>
            <div class="list-box">
              <article *ngFor="let session of sessions()" class="list-item">
                <div>
                  <strong>Session {{ session.id }}</strong>
                  <small>{{ session.device_label || 'device n/a' }} · last seen {{ session.last_seen_at || 'n/a' }}</small>
                </div>
                <div class="actions">
                  <button mat-button (click)="revokeSession(session.id)">Revoke</button>
                </div>
              </article>
            </div>

            <h3 *ngIf="can('can_view_login_logs')">Login Audits</h3>
            <pre *ngIf="can('can_view_login_logs')">{{ loginAuditsRaw() }}</pre>

            <h3 *ngIf="can('can_view_security_audit')">Security Audits</h3>
            <pre *ngIf="can('can_view_security_audit')">{{ securityAuditsRaw() }}</pre>

            <h3 *ngIf="can('can_view_online_status')">Presence</h3>
            <div class="list-box" *ngIf="can('can_view_online_status')">
              <article *ngFor="let row of presence()" class="list-item">
                <div>
                  <strong>{{ row.name }}</strong>
                  <small>{{ row.email }} · {{ row.is_online ? 'online' : 'offline' }}</small>
                </div>
              </article>
            </div>
          </mat-card>
        </section>

        <section class="content" *ngIf="menu() === 'settings'">
          <mat-card>
            <h2>Settings</h2>
            <div class="inline-form">
              <mat-select [(ngModel)]="switchCompanyId">
                <mat-option *ngFor="let row of authState.memberships()" [value]="row.membership.company_id">{{ row.company.name }}</mat-option>
              </mat-select>
              <button mat-raised-button (click)="switchCompany()">Cambiar empresa</button>
            </div>
            <button mat-raised-button color="warn" (click)="logout()">Cerrar sesión</button>
          </mat-card>
        </section>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `.container { height: 100vh; background: radial-gradient(circle at 20% 10%, #17283a, #0a1017 65%); }
     .left { width: 245px; background: #0d1621; color: #dbe7f5; border-right: 1px solid #2a3a4f; padding: 14px; display: flex; flex-direction: column; gap: 6px; }
     .brand { font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #8fc9ff; }
     .nav-btn { justify-content: flex-start; gap: 8px; }
     .nav-btn.active { background: #1a2b3d; }
     .topbar { background: #102132; color: #e7f1fb; }
     .spacer { flex: 1 1 auto; }
     .content { padding: 16px; }
     mat-card { background: #101d2b; color: #ecf2f9; border: 1px solid #2b3f57; }
     .header-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
     .inline-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; align-items: center; margin-bottom: 14px; }
     .messages { display: grid; gap: 10px; max-height: 420px; overflow: auto; margin-bottom: 10px; border: 1px solid #2f4155; padding: 10px; border-radius: 8px; background: #0c1621; }
     .msg-row { display: flex; gap: 10px; justify-content: space-between; border-bottom: 1px solid #27394d; padding-bottom: 8px; }
     .list-box { display: grid; gap: 8px; margin-bottom: 14px; }
     .list-item { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; border: 1px solid #2d4156; border-radius: 8px; padding: 8px; background: #0c1622; }
     .list-item.clickable { cursor: pointer; }
     .actions { display: flex; flex-wrap: wrap; gap: 4px; }
     .error-banner { margin: 8px 16px 0; background: #4b2020; color: #ffd8d8; padding: 10px 12px; border: 1px solid #713333; border-radius: 8px; }
     pre { white-space: pre-wrap; background: #0b141e; border-radius: 8px; padding: 8px; border: 1px solid #243447; max-height: 350px; overflow: auto; }
     @media (max-width: 900px) { .left { width: 220px; } .content { padding: 10px; } }`,
  ],
})
export class WorkspaceComponent implements OnInit {
  readonly menu = signal<MenuKey>('dashboard');
  readonly drawerOpen = signal(false);
  readonly isMobile = signal(false);

  readonly memberships = signal<MembershipListRow[]>([]);
  readonly userRequests = signal<UserCreationRequest[]>([]);
  readonly inviteCodes = signal<Array<{ id: number; code: string; email_hint: string | null; max_uses: number; used_count: number; is_active: boolean }>>([]);
  readonly sections = signal<SectionRow[]>([]);
  readonly channels = signal<Channel[]>([]);
  readonly selectedChannelId = signal<number | null>(null);
  readonly messages = signal<MessageItem[]>([]);
  readonly searchResults = signal<SearchMessageResult[]>([]);
  readonly sessions = signal<SessionRow[]>([]);
  readonly presence = signal<PresenceRow[]>([]);

  readonly loginAuditsRaw = signal('[]');
  readonly securityAuditsRaw = signal('[]');
  readonly messageRevisionsRaw = signal('');
  readonly editingMessageId = signal<number | null>(null);

  readonly error = signal<string | null>(null);

  readonly userName = computed(() => this.authState.user()?.name ?? 'Unknown');
  readonly activeCompanyName = computed(() => this.authState.activeMembership()?.company.name ?? 'No company selected');

  readonly visibleMenu = computed(() => {
    const entries: MenuEntry[] = [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { key: 'members', label: 'Members', icon: 'groups', anyPermission: ['can_manage_users'], requiresInternal: true },
      { key: 'sections', label: 'Sections', icon: 'view_list', anyPermission: ['can_manage_sections'], requiresInternal: true },
      { key: 'channels', label: 'Channels', icon: 'tag' },
      { key: 'chat', label: 'Chat', icon: 'chat' },
      { key: 'search', label: 'Search', icon: 'search' },
      { key: 'security', label: 'Security', icon: 'security', anyPermission: ['can_view_login_logs', 'can_view_security_audit', 'can_view_online_status'] },
      { key: 'settings', label: 'Settings', icon: 'settings' },
    ];

    return entries.filter((entry) => {
      if (entry.requiresInternal && !this.authState.isInternalUser()) {
        return false;
      }
      if (!entry.anyPermission || entry.anyPermission.length === 0) {
        return true;
      }
      return entry.anyPermission.some((permission) => this.can(permission));
    });
  });

  newInternalUser = {
    name: '',
    email: '',
    role: 'user' as 'admin' | 'manager' | 'user',
    permissionsCsv: '',
    sectionIdsCsv: '',
  };

  newUserRequest = {
    name: '',
    email: '',
    requested_role: 'user' as 'admin' | 'manager' | 'user',
    requested_user_type: 'internal' as 'internal' | 'client',
  };

  newInvite = {
    email_hint: '',
    max_uses: 1,
  };

  newSection = {
    name: '',
    description: '',
    permissionKeysCsv: '',
  };

  newChannel = {
    name: '',
    visibility_type: 'shared_public' as 'private' | 'company_public' | 'shared_public',
    memberIdsCsv: '',
    sectionIdsCsv: '',
  };

  directMessageTargetMembershipId = '';
  newMessage = '';
  editingContent = '';

  searchForm = {
    q: '',
    channel_id: '',
    sender_membership_id: '',
    date_from: '',
    date_to: '',
  };

  switchCompanyId: number | null = null;

  constructor(
    private readonly api: SecureChannelsApiService,
    readonly authState: AuthStateService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly breakpointObserver: BreakpointObserver,
  ) {}

  ngOnInit(): void {
    this.switchCompanyId = this.authState.companyId();

    this.breakpointObserver.observe('(max-width: 900px)').subscribe(({ matches }) => {
      this.isMobile.set(matches);
      if (!matches) {
        this.drawerOpen.set(false);
      }
    });

    this.refreshContext();
  }

  can(permission: PermissionKey): boolean {
    return this.authState.can(permission);
  }

  isInternal(): boolean {
    return this.authState.isInternalUser();
  }

  selectMenu(menu: MenuKey): void {
    this.menu.set(menu);
    if (this.isMobile()) {
      this.drawerOpen.set(false);
    }

    if (menu === 'members') {
      this.loadMembersModule();
    }
    if (menu === 'sections') {
      this.loadSections();
    }
    if (menu === 'channels') {
      this.loadChannels();
    }
    if (menu === 'search') {
      this.searchResults.set([]);
    }
    if (menu === 'security') {
      this.loadSecurity();
    }
  }

  refreshContext(): void {
    this.api.me().subscribe({
      next: ({ data }) => {
        if (!data) {
          return;
        }

        this.authState.syncProfile({
          user: data.user,
          memberships: data.memberships,
          effectivePermissions: data.effective_permissions,
        });

        this.loadChannels();
      },
      error: (err) => this.handleError(err, 'No se pudo cargar /auth/me'),
    });
  }

  refreshDashboard(): void {
    this.loadChannels();
    this.loadMembersModule();
  }

  loadMembersModule(): void {
    if (!this.can('can_manage_users')) {
      return;
    }

    this.api.listMemberships().subscribe({
      next: ({ data }) => this.memberships.set(data ?? []),
      error: (err) => this.handleError(err, 'No se pudo listar memberships'),
    });

    this.api.listUserCreationRequests().subscribe({
      next: ({ data }) => this.userRequests.set(data?.data ?? []),
      error: (err) => this.handleError(err, 'No se pudo listar requests'),
    });

    if (this.can('can_generate_client_invites')) {
      this.api.listClientInviteCodes().subscribe({
        next: ({ data }) => this.inviteCodes.set(data?.data ?? []),
        error: (err) => this.handleError(err, 'No se pudieron listar invites'),
      });
    }
  }

  createInternalUser(): void {
    if (!this.newInternalUser.name.trim() || !this.newInternalUser.email.trim()) {
      return;
    }

    this.api.createInternalUser({
      name: this.newInternalUser.name.trim(),
      email: this.newInternalUser.email.trim(),
      role: this.newInternalUser.role,
      permissions: this.csvToStrings(this.newInternalUser.permissionsCsv),
      section_ids: this.csvToNumbers(this.newInternalUser.sectionIdsCsv),
    }).subscribe({
      next: ({ data }) => {
        this.snackBar.open(`Usuario creado. Password temporal: ${data?.temporary_password ?? 'N/A'}`, 'OK', { duration: 8000 });
        this.newInternalUser = { name: '', email: '', role: 'user', permissionsCsv: '', sectionIdsCsv: '' };
        this.loadMembersModule();
      },
      error: (err) => this.handleError(err, 'No se pudo crear usuario interno'),
    });
  }

  suspendMembership(membershipId: number): void {
    this.api.suspendMembership(membershipId).subscribe({
      next: () => {
        this.snackBar.open('Membership suspendida', 'OK', { duration: 3000 });
        this.loadMembersModule();
      },
      error: (err) => this.handleError(err, 'No se pudo suspender membership'),
    });
  }

  activateMembership(membershipId: number): void {
    this.api.activateMembership(membershipId).subscribe({
      next: () => {
        this.snackBar.open('Membership activada', 'OK', { duration: 3000 });
        this.loadMembersModule();
      },
      error: (err) => this.handleError(err, 'No se pudo activar membership'),
    });
  }

  createUserRequest(): void {
    if (!this.newUserRequest.name.trim() || !this.newUserRequest.email.trim()) {
      return;
    }

    this.api.createUserCreationRequest({
      name: this.newUserRequest.name.trim(),
      email: this.newUserRequest.email.trim(),
      requested_role: this.newUserRequest.requested_role,
      requested_user_type: this.newUserRequest.requested_user_type,
    }).subscribe({
      next: () => {
        this.snackBar.open('Request creada', 'OK', { duration: 3000 });
        this.newUserRequest = { name: '', email: '', requested_role: 'user', requested_user_type: 'internal' };
        this.loadMembersModule();
      },
      error: (err) => this.handleError(err, 'No se pudo crear request'),
    });
  }

  approveRequest(requestId: number): void {
    this.api.approveUserCreationRequest(requestId).subscribe({
      next: ({ data }) => {
        this.snackBar.open(`Request aprobada. Password temporal: ${data?.temporary_password ?? 'N/A'}`, 'OK', { duration: 8000 });
        this.loadMembersModule();
      },
      error: (err) => this.handleError(err, 'No se pudo aprobar request'),
    });
  }

  rejectRequest(requestId: number): void {
    this.api.rejectUserCreationRequest(requestId, 'Rejected from frontend').subscribe({
      next: () => {
        this.snackBar.open('Request rechazada', 'OK', { duration: 3000 });
        this.loadMembersModule();
      },
      error: (err) => this.handleError(err, 'No se pudo rechazar request'),
    });
  }

  createInviteCode(): void {
    const maxUses = Number(this.newInvite.max_uses) || 1;

    this.api.createClientInviteCode({
      email_hint: this.newInvite.email_hint.trim() || undefined,
      max_uses: maxUses,
    }).subscribe({
      next: ({ data }) => {
        this.snackBar.open(`Invite creado: ${data?.invite?.code ?? 'N/A'}`, 'OK', { duration: 7000 });
        this.newInvite = { email_hint: '', max_uses: 1 };
        this.loadMembersModule();
      },
      error: (err) => this.handleError(err, 'No se pudo crear invite'),
    });
  }

  loadSections(): void {
    this.api.listSections().subscribe({
      next: ({ data }) => this.sections.set(data ?? []),
      error: (err) => this.handleError(err, 'No se pudieron listar secciones'),
    });
  }

  createSection(): void {
    if (!this.newSection.name.trim()) {
      return;
    }

    this.api.createSection({
      name: this.newSection.name.trim(),
      description: this.newSection.description.trim() || undefined,
      permission_keys: this.csvToStrings(this.newSection.permissionKeysCsv),
    }).subscribe({
      next: () => {
        this.snackBar.open('Sección creada', 'OK', { duration: 3000 });
        this.newSection = { name: '', description: '', permissionKeysCsv: '' };
        this.loadSections();
      },
      error: (err) => this.handleError(err, 'No se pudo crear sección'),
    });
  }

  deactivateSection(sectionId: number): void {
    this.api.deactivateSection(sectionId).subscribe({
      next: () => {
        this.snackBar.open('Sección desactivada', 'OK', { duration: 3000 });
        this.loadSections();
      },
      error: (err) => this.handleError(err, 'No se pudo desactivar sección'),
    });
  }

  addMemberToSection(sectionId: number): void {
    const membershipId = prompt('membership_id para agregar a sección');
    if (!membershipId) {
      return;
    }

    this.api.addSectionMembers(sectionId, [Number(membershipId)]).subscribe({
      next: () => {
        this.snackBar.open('Miembro agregado a sección', 'OK', { duration: 3000 });
        this.loadSections();
      },
      error: (err) => this.handleError(err, 'No se pudo agregar miembro a sección'),
    });
  }

  loadChannels(): void {
    this.api.listChannels().subscribe({
      next: ({ data }) => this.channels.set(data?.data ?? []),
      error: (err) => this.handleError(err, 'No se pudieron listar canales'),
    });
  }

  createChannel(): void {
    if (!this.newChannel.name.trim()) {
      return;
    }

    this.api.createChannel({
      name: this.newChannel.name.trim(),
      visibility_type: this.newChannel.visibility_type,
      initial_member_ids: this.csvToNumbers(this.newChannel.memberIdsCsv),
      initial_section_ids: this.csvToNumbers(this.newChannel.sectionIdsCsv),
    }).subscribe({
      next: () => {
        this.snackBar.open('Canal creado', 'OK', { duration: 3000 });
        this.newChannel = { name: '', visibility_type: 'shared_public', memberIdsCsv: '', sectionIdsCsv: '' };
        this.loadChannels();
      },
      error: (err) => this.handleError(err, 'No se pudo crear canal'),
    });
  }

  toggleArchive(channel: Channel): void {
    const request = channel.is_archived ? this.api.unarchiveChannel(channel.id) : this.api.archiveChannel(channel.id);
    request.subscribe({
      next: () => {
        this.snackBar.open(channel.is_archived ? 'Canal desarchivado' : 'Canal archivado', 'OK', { duration: 3000 });
        this.loadChannels();
      },
      error: (err) => this.handleError(err, 'No se pudo cambiar estado de archivo del canal'),
    });
  }

  addMemberToChannel(channelId: number): void {
    const membershipId = prompt('membership_id para agregar al canal');
    if (!membershipId) {
      return;
    }

    this.api.addChannelMembers(channelId, [Number(membershipId)]).subscribe({
      next: () => this.snackBar.open('Miembro agregado al canal', 'OK', { duration: 3000 }),
      error: (err) => this.handleError(err, 'No se pudo agregar miembro al canal'),
    });
  }

  addSectionToChannel(channelId: number): void {
    const sectionId = prompt('section_id para vincular al canal');
    if (!sectionId) {
      return;
    }

    this.api.addChannelSections(channelId, [Number(sectionId)]).subscribe({
      next: () => this.snackBar.open('Sección vinculada al canal', 'OK', { duration: 3000 }),
      error: (err) => this.handleError(err, 'No se pudo vincular sección al canal'),
    });
  }

  createDirectMessage(): void {
    const targetMembershipId = Number(this.directMessageTargetMembershipId);
    if (!Number.isFinite(targetMembershipId) || targetMembershipId <= 0) {
      return;
    }

    this.api.createDirectMessage(targetMembershipId).subscribe({
      next: ({ data }) => {
        this.snackBar.open('Canal DM listo', 'OK', { duration: 3000 });
        if (data?.channel) {
          this.selectChannel(data.channel);
        }
      },
      error: (err) => this.handleError(err, 'No se pudo abrir canal DM'),
    });
  }

  selectChannel(channel: Channel): void {
    this.selectedChannelId.set(channel.id);
    this.menu.set('chat');
    this.api.listMessages(channel.id).subscribe({
      next: ({ data }) => this.messages.set(data ?? []),
      error: (err) => this.handleError(err, 'No se pudieron cargar mensajes del canal'),
    });
  }

  reloadActiveChannelMessages(): void {
    const channelId = this.selectedChannelId();
    if (!channelId) {
      return;
    }

    this.api.listMessages(channelId).subscribe({
      next: ({ data }) => this.messages.set(data ?? []),
      error: (err) => this.handleError(err, 'No se pudieron refrescar mensajes'),
    });
  }

  sendMessage(): void {
    const channelId = this.selectedChannelId();
    const content = this.newMessage.trim();

    if (!channelId || !content) {
      return;
    }

    this.api.sendMessage(channelId, { content, mentions: [] }).subscribe({
      next: () => {
        this.newMessage = '';
        this.reloadActiveChannelMessages();
      },
      error: (err) => this.handleError(err, 'No se pudo enviar mensaje'),
    });
  }

  prepareEdit(item: MessageItem): void {
    if (!item.content) {
      return;
    }

    this.editingMessageId.set(item.id);
    this.editingContent = item.content;
  }

  cancelEdit(): void {
    this.editingMessageId.set(null);
    this.editingContent = '';
  }

  updateMessage(): void {
    const messageId = this.editingMessageId();
    const content = this.editingContent.trim();

    if (!messageId || !content) {
      return;
    }

    this.api.updateMessage(messageId, { content, mentions: [] }).subscribe({
      next: () => {
        this.snackBar.open('Mensaje actualizado', 'OK', { duration: 3000 });
        this.cancelEdit();
        this.reloadActiveChannelMessages();
      },
      error: (err) => this.handleError(err, 'No se pudo actualizar mensaje'),
    });
  }

  deleteMessage(messageId: number): void {
    this.api.deleteMessage(messageId).subscribe({
      next: () => {
        this.snackBar.open('Mensaje eliminado lógicamente', 'OK', { duration: 3000 });
        this.reloadActiveChannelMessages();
      },
      error: (err) => this.handleError(err, 'No se pudo eliminar mensaje'),
    });
  }

  loadRevisions(messageId: number): void {
    this.api.listMessageRevisions(messageId).subscribe({
      next: ({ data }) => this.messageRevisionsRaw.set(JSON.stringify(data ?? [], null, 2)),
      error: (err) => this.handleError(err, 'No se pudieron listar revisiones'),
    });
  }

  searchMessages(): void {
    if (!this.searchForm.q.trim()) {
      return;
    }

    this.api.searchMessages({
      q: this.searchForm.q.trim(),
      channel_id: this.toOptionalNumber(this.searchForm.channel_id),
      sender_membership_id: this.toOptionalNumber(this.searchForm.sender_membership_id),
      date_from: this.searchForm.date_from.trim() || undefined,
      date_to: this.searchForm.date_to.trim() || undefined,
    }).subscribe({
      next: ({ data }) => this.searchResults.set(data?.data ?? []),
      error: (err) => this.handleError(err, 'No se pudo ejecutar búsqueda'),
    });
  }

  loadSecurity(): void {
    const requests: Record<string, Observable<unknown>> = {
      sessions: this.api.listSessions(),
    };

    if (this.can('can_view_login_logs')) {
      requests['loginAudits'] = this.api.listLoginAudits();
    }
    if (this.can('can_view_security_audit')) {
      requests['securityAudits'] = this.api.listSecurityAudits();
    }
    if (this.can('can_view_online_status')) {
      requests['presence'] = this.api.listPresence();
    }

    forkJoin(requests).subscribe({
      next: (result: any) => {
        this.sessions.set(result.sessions?.data ?? []);
        this.loginAuditsRaw.set(JSON.stringify(result.loginAudits?.data?.data ?? [], null, 2));
        this.securityAuditsRaw.set(JSON.stringify(result.securityAudits?.data?.data ?? [], null, 2));
        this.presence.set(result.presence?.data ?? []);
      },
      error: (err) => this.handleError(err, 'No se pudo cargar módulo de seguridad'),
    });
  }

  revokeSession(sessionId: number): void {
    this.api.revokeSession(sessionId).subscribe({
      next: () => {
        this.snackBar.open('Sesión revocada', 'OK', { duration: 3000 });
        this.loadSecurity();
      },
      error: (err) => this.handleError(err, 'No se pudo revocar sesión'),
    });
  }

  switchCompany(): void {
    if (!this.switchCompanyId) {
      return;
    }

    this.api.switchCompany(this.switchCompanyId).subscribe({
      next: ({ data }) => {
        this.authState.setCompanyContext({
          companyId: this.switchCompanyId,
          effectivePermissions: data?.effective_permissions ?? null,
        });
        this.refreshContext();
        const mustChangePassword = Boolean(this.authState.activeMembership()?.membership.must_change_password);
        this.router.navigateByUrl(mustChangePassword ? '/force-password' : '/app');
      },
      error: (err) => this.handleError(err, 'No se pudo cambiar de empresa'),
    });
  }

  logout(): void {
    this.api.logout().subscribe({
      next: () => {
        this.authState.clear();
        this.router.navigateByUrl('/login');
      },
      error: () => {
        this.authState.clear();
        this.router.navigateByUrl('/login');
      },
    });
  }

  private handleError(error: unknown, fallback: string): void {
    const message = apiErrorMessage(error, fallback);
    this.error.set(message);
    this.snackBar.open(message, 'Cerrar', { duration: 5000 });
  }

  private csvToStrings(value: string): string[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private csvToNumbers(value: string): number[] {
    return value
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item) && item > 0);
  }

  private toOptionalNumber(value: string): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
}
