import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  ApiEnvelope,
  Channel,
  ClientInviteCode,
  EffectivePermissions,
  LoginData,
  MeData,
  MembershipListRow,
  MembershipRecord,
  MessageItem,
  MessageRevision,
  Pagination,
  PresenceRow,
  SearchMessageResult,
  Section,
  SectionRow,
  SessionRow,
  SwitchCompanyData,
  UserCreationRequest,
  UserProfile,
} from './api.models';

@Injectable({ providedIn: 'root' })
export class SecureChannelsApiService {
  constructor(private readonly api: ApiService) {}

  registerCompany(payload: {
    company_name: string;
    company_slug: string;
    company_email: string;
    admin_name: string;
    admin_email: string;
    admin_password: string;
    address?: string;
    website?: string;
  }): Observable<ApiEnvelope<{
    token: string;
    user: UserProfile;
    company: { id: number; name: string; slug: string };
    membership: MembershipRecord;
    effective_permissions: EffectivePermissions;
  }>> {
    return this.api.post<ApiEnvelope<{
      token: string;
      user: UserProfile;
      company: { id: number; name: string; slug: string };
      membership: MembershipRecord;
      effective_permissions: EffectivePermissions;
    }>>('/auth/register-company', payload);
  }

  registerClient(payload: { code: string; name: string; email: string; password: string }): Observable<ApiEnvelope<{
    token: string;
    user: UserProfile;
    membership: MembershipRecord;
  }>> {
    return this.api.post<ApiEnvelope<{ token: string; user: UserProfile; membership: MembershipRecord }>>('/client-register', payload);
  }

  login(payload: { email: string; password: string }): Observable<ApiEnvelope<LoginData>> {
    return this.api.post<ApiEnvelope<LoginData>>('/auth/login', payload);
  }

  me(): Observable<ApiEnvelope<MeData>> {
    return this.api.get<ApiEnvelope<MeData>>('/auth/me');
  }

  switchCompany(companyId: number): Observable<ApiEnvelope<SwitchCompanyData>> {
    return this.api.post<ApiEnvelope<SwitchCompanyData>>('/auth/switch-company', { company_id: companyId });
  }

  changePassword(payload: { current_password: string; new_password: string; new_password_confirmation: string }): Observable<ApiEnvelope<null>> {
    return this.api.post<ApiEnvelope<null>>('/auth/change-password', payload);
  }

  logout(): Observable<ApiEnvelope<null>> {
    return this.api.post<ApiEnvelope<null>>('/auth/logout', {});
  }

  listMemberships(filters?: { role?: string; user_type?: string; status?: string; search?: string }): Observable<ApiEnvelope<MembershipListRow[]>> {
    return this.api.get<ApiEnvelope<MembershipListRow[]>>('/memberships', filters);
  }

  createInternalUser(payload: {
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'user';
    permissions: string[];
    section_ids: number[];
  }): Observable<ApiEnvelope<{ membership: MembershipRecord; user: UserProfile; temporary_password: string }>> {
    return this.api.post<ApiEnvelope<{ membership: MembershipRecord; user: UserProfile; temporary_password: string }>>('/memberships/internal-users', payload);
  }

  updateMembership(membershipId: number, payload: {
    role?: 'admin' | 'manager' | 'user';
    status?: 'pending' | 'active' | 'suspended' | 'rejected';
    must_change_password?: boolean;
    permissions?: string[];
    section_ids?: number[];
  }): Observable<ApiEnvelope<{ membership: MembershipRecord }>> {
    return this.api.patch<ApiEnvelope<{ membership: MembershipRecord }>>(`/memberships/${membershipId}`, payload);
  }

  suspendMembership(membershipId: number): Observable<ApiEnvelope<{ membership: MembershipRecord }>> {
    return this.api.post<ApiEnvelope<{ membership: MembershipRecord }>>(`/memberships/${membershipId}/suspend`, {});
  }

  activateMembership(membershipId: number): Observable<ApiEnvelope<{ membership: MembershipRecord }>> {
    return this.api.post<ApiEnvelope<{ membership: MembershipRecord }>>(`/memberships/${membershipId}/activate`, {});
  }

  listUserCreationRequests(filters?: { status?: string }): Observable<ApiEnvelope<Pagination<UserCreationRequest>>> {
    return this.api.get<ApiEnvelope<Pagination<UserCreationRequest>>>('/user-creation-requests', filters);
  }

  createUserCreationRequest(payload: {
    name: string;
    email: string;
    requested_role: 'admin' | 'manager' | 'user';
    requested_user_type: 'internal' | 'client';
  }): Observable<ApiEnvelope<{ request: UserCreationRequest }>> {
    return this.api.post<ApiEnvelope<{ request: UserCreationRequest }>>('/user-creation-requests', payload);
  }

  approveUserCreationRequest(id: number): Observable<ApiEnvelope<{
    request: UserCreationRequest;
    membership: MembershipRecord;
    user: UserProfile;
    temporary_password: string;
  }>> {
    return this.api.post<ApiEnvelope<{ request: UserCreationRequest; membership: MembershipRecord; user: UserProfile; temporary_password: string }>>(`/user-creation-requests/${id}/approve`, {});
  }

  rejectUserCreationRequest(id: number, reviewNotes?: string): Observable<ApiEnvelope<{ request: UserCreationRequest }>> {
    return this.api.post<ApiEnvelope<{ request: UserCreationRequest }>>(`/user-creation-requests/${id}/reject`, {
      review_notes: reviewNotes?.trim() || null,
    });
  }

  listClientInviteCodes(): Observable<ApiEnvelope<Pagination<ClientInviteCode>>> {
    return this.api.get<ApiEnvelope<Pagination<ClientInviteCode>>>('/client-invite-codes');
  }

  createClientInviteCode(payload: { email_hint?: string; max_uses: number; expires_at?: string }): Observable<ApiEnvelope<{ invite: ClientInviteCode }>> {
    return this.api.post<ApiEnvelope<{ invite: ClientInviteCode }>>('/client-invite-codes', payload);
  }

  listSections(): Observable<ApiEnvelope<SectionRow[]>> {
    return this.api.get<ApiEnvelope<SectionRow[]>>('/sections');
  }

  createSection(payload: { name: string; slug?: string; description?: string; permission_keys?: string[] }): Observable<ApiEnvelope<{ section: Section }>> {
    return this.api.post<ApiEnvelope<{ section: Section }>>('/sections', payload);
  }

  updateSection(sectionId: number, payload: {
    name?: string;
    slug?: string;
    description?: string;
    is_active?: boolean;
    permission_keys?: string[];
  }): Observable<ApiEnvelope<{ section: Section }>> {
    return this.api.patch<ApiEnvelope<{ section: Section }>>(`/sections/${sectionId}`, payload);
  }

  deactivateSection(sectionId: number): Observable<ApiEnvelope<null>> {
    return this.api.delete<ApiEnvelope<null>>(`/sections/${sectionId}`);
  }

  addSectionMembers(sectionId: number, membershipIds: number[]): Observable<ApiEnvelope<null>> {
    return this.api.post<ApiEnvelope<null>>(`/sections/${sectionId}/members`, { membership_ids: membershipIds });
  }

  removeSectionMember(sectionId: number, membershipId: number): Observable<ApiEnvelope<null>> {
    return this.api.delete<ApiEnvelope<null>>(`/sections/${sectionId}/members/${membershipId}`);
  }

  listChannels(filters?: { type?: string; archived?: boolean; visibility?: string; search?: string }): Observable<ApiEnvelope<Pagination<Channel>>> {
    return this.api.get<ApiEnvelope<Pagination<Channel>>>('/channels', filters);
  }

  createChannel(payload: {
    name: string;
    visibility_type: 'private' | 'company_public' | 'shared_public';
    description?: string;
    initial_member_ids?: number[];
    initial_section_ids?: number[];
  }): Observable<ApiEnvelope<{ channel: Channel }>> {
    return this.api.post<ApiEnvelope<{ channel: Channel }>>('/channels', payload);
  }

  updateChannel(channelId: number, payload: {
    name?: string;
    description?: string;
    visibility_type?: 'private' | 'company_public' | 'shared_public';
    is_archived?: boolean;
  }): Observable<ApiEnvelope<{ channel: Channel }>> {
    return this.api.patch<ApiEnvelope<{ channel: Channel }>>(`/channels/${channelId}`, payload);
  }

  archiveChannel(channelId: number): Observable<ApiEnvelope<{ channel: Channel }>> {
    return this.api.post<ApiEnvelope<{ channel: Channel }>>(`/channels/${channelId}/archive`, {});
  }

  unarchiveChannel(channelId: number): Observable<ApiEnvelope<{ channel: Channel }>> {
    return this.api.post<ApiEnvelope<{ channel: Channel }>>(`/channels/${channelId}/unarchive`, {});
  }

  listChannelMembers(channelId: number): Observable<ApiEnvelope<Array<{
    membership_id: number;
    user_id: number;
    name: string;
    email: string;
    role: string;
    user_type: string;
  }>>> {
    return this.api.get<ApiEnvelope<Array<{ membership_id: number; user_id: number; name: string; email: string; role: string; user_type: string }>>>(`/channels/${channelId}/members`);
  }

  addChannelMembers(channelId: number, membershipIds: number[]): Observable<ApiEnvelope<null>> {
    return this.api.post<ApiEnvelope<null>>(`/channels/${channelId}/members`, { membership_ids: membershipIds });
  }

  removeChannelMember(channelId: number, membershipId: number): Observable<ApiEnvelope<null>> {
    return this.api.delete<ApiEnvelope<null>>(`/channels/${channelId}/members/${membershipId}`);
  }

  listChannelSections(channelId: number): Observable<ApiEnvelope<Array<{ id: number; name: string; slug: string; is_active: boolean }>>> {
    return this.api.get<ApiEnvelope<Array<{ id: number; name: string; slug: string; is_active: boolean }>>>(`/channels/${channelId}/sections`);
  }

  addChannelSections(channelId: number, sectionIds: number[]): Observable<ApiEnvelope<null>> {
    return this.api.post<ApiEnvelope<null>>(`/channels/${channelId}/sections`, { section_ids: sectionIds });
  }

  removeChannelSection(channelId: number, sectionId: number): Observable<ApiEnvelope<null>> {
    return this.api.delete<ApiEnvelope<null>>(`/channels/${channelId}/sections/${sectionId}`);
  }

  createDirectMessage(targetMembershipId: number): Observable<ApiEnvelope<{ channel: Channel }>> {
    return this.api.post<ApiEnvelope<{ channel: Channel }>>('/channels/direct-messages', { target_membership_id: targetMembershipId });
  }

  listMessages(channelId: number): Observable<ApiEnvelope<MessageItem[]>> {
    return this.api.get<ApiEnvelope<MessageItem[]>>(`/channels/${channelId}/messages`);
  }

  sendMessage(channelId: number, payload: {
    content: string;
    reply_to_message_id?: number;
    mentions?: number[];
    message_format?: 'plain' | 'markdown';
  }): Observable<ApiEnvelope<{ message: MessageItem; content: string }>> {
    return this.api.post<ApiEnvelope<{ message: MessageItem; content: string }>>(`/channels/${channelId}/messages`, payload);
  }

  updateMessage(messageId: number, payload: { content: string; mentions?: number[] }): Observable<ApiEnvelope<{ message: MessageItem }>> {
    return this.api.patch<ApiEnvelope<{ message: MessageItem }>>(`/messages/${messageId}`, payload);
  }

  deleteMessage(messageId: number): Observable<ApiEnvelope<{ message: MessageItem }>> {
    return this.api.delete<ApiEnvelope<{ message: MessageItem }>>(`/messages/${messageId}`);
  }

  listMessageRevisions(messageId: number): Observable<ApiEnvelope<MessageRevision[]>> {
    return this.api.get<ApiEnvelope<MessageRevision[]>>(`/messages/${messageId}/revisions`);
  }

  searchMessages(filters: {
    q: string;
    channel_id?: number;
    sender_membership_id?: number;
    date_from?: string;
    date_to?: string;
  }): Observable<ApiEnvelope<Pagination<SearchMessageResult>>> {
    return this.api.get<ApiEnvelope<Pagination<SearchMessageResult>>>('/search/messages', filters);
  }

  listLoginAudits(filters?: {
    event_type?: string;
    email_attempted?: string;
    success?: boolean;
    date_from?: string;
    date_to?: string;
  }): Observable<ApiEnvelope<Pagination<Record<string, unknown>>>> {
    return this.api.get<ApiEnvelope<Pagination<Record<string, unknown>>>>('/security/login-audits', filters);
  }

  listSecurityAudits(filters?: {
    action_type?: string;
    entity_type?: string;
    actor_membership_id?: number;
    date_from?: string;
    date_to?: string;
  }): Observable<ApiEnvelope<Pagination<Record<string, unknown>>>> {
    return this.api.get<ApiEnvelope<Pagination<Record<string, unknown>>>>('/security/audits', filters);
  }

  listSessions(): Observable<ApiEnvelope<SessionRow[]>> {
    return this.api.get<ApiEnvelope<SessionRow[]>>('/security/sessions');
  }

  revokeSession(sessionId: number): Observable<ApiEnvelope<{ session: SessionRow }>> {
    return this.api.delete<ApiEnvelope<{ session: SessionRow }>>(`/security/sessions/${sessionId}`);
  }

  listPresence(): Observable<ApiEnvelope<PresenceRow[]>> {
    return this.api.get<ApiEnvelope<PresenceRow[]>>('/security/presence');
  }

  resolveEffectivePermissionsFromMembership(membership: MembershipRecord): EffectivePermissions {
    return {
      can_self_confirm_user_requests: Boolean(membership.can_self_confirm_user_requests),
      can_view_login_logs: Boolean(membership.can_view_login_logs),
      can_view_security_audit: Boolean(membership.can_view_security_audit),
      can_manage_users: Boolean(membership.can_manage_users),
      can_manage_sections: Boolean(membership.can_manage_sections),
      can_create_channels: Boolean(membership.can_create_channels),
      can_create_company_public_channels: Boolean(membership.can_create_company_public_channels),
      can_create_shared_public_channels: Boolean(membership.can_create_shared_public_channels),
      can_manage_channel_members: Boolean(membership.can_manage_channel_members),
      can_generate_client_invites: Boolean(membership.can_generate_client_invites),
      can_view_online_status: Boolean(membership.can_view_online_status),
      can_edit_any_message: Boolean(membership.can_edit_any_message),
      can_delete_any_message: Boolean(membership.can_delete_any_message),
    };
  }
}
