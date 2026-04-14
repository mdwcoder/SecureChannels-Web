export type Role = 'admin' | 'manager' | 'user';
export type UserType = 'internal' | 'client';

export const PERMISSION_KEYS = [
  'can_self_confirm_user_requests',
  'can_view_login_logs',
  'can_view_security_audit',
  'can_manage_users',
  'can_manage_sections',
  'can_create_channels',
  'can_create_company_public_channels',
  'can_create_shared_public_channels',
  'can_manage_channel_members',
  'can_generate_client_invites',
  'can_view_online_status',
  'can_edit_any_message',
  'can_delete_any_message',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type EffectivePermissions = Partial<Record<PermissionKey, boolean>>;

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
  message: string | null;
  errors?: Record<string, string[]>;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  is_active?: boolean;
  last_global_login_at?: string | null;
}

export interface MembershipCompany {
  id: number;
  name: string;
  slug: string;
  company_email?: string;
  address?: string | null;
  website?: string | null;
  is_active?: boolean;
}

export interface MembershipRecord {
  id: number;
  company_id: number;
  user_id: number;
  role: Role;
  user_type: UserType;
  status: string;
  must_change_password: boolean;
  last_company_login_at?: string | null;
  company?: MembershipCompany;
  can_self_confirm_user_requests?: boolean;
  can_view_login_logs?: boolean;
  can_view_security_audit?: boolean;
  can_manage_users?: boolean;
  can_manage_sections?: boolean;
  can_create_channels?: boolean;
  can_create_company_public_channels?: boolean;
  can_create_shared_public_channels?: boolean;
  can_manage_channel_members?: boolean;
  can_generate_client_invites?: boolean;
  can_view_online_status?: boolean;
  can_edit_any_message?: boolean;
  can_delete_any_message?: boolean;
}

export interface MembershipInfo {
  membership: MembershipRecord;
  company: MembershipCompany;
}

export interface LoginData {
  token: string;
  user: UserProfile;
  memberships: MembershipInfo[];
  must_change_password: boolean;
}

export interface MeData {
  user: UserProfile;
  memberships: MembershipInfo[];
  active_membership: MembershipRecord | null;
  effective_permissions: EffectivePermissions | null;
}

export interface SwitchCompanyData {
  membership: MembershipRecord;
  company: MembershipCompany;
  effective_permissions: EffectivePermissions;
}

export interface Pagination<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number | null;
  last_page: number;
  last_page_url: string;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
}

export interface Channel {
  id: number;
  company_id: number;
  name: string;
  slug: string;
  description: string | null;
  channel_type: 'standard' | 'direct_message';
  visibility_type: 'private' | 'company_public' | 'shared_public';
  created_by_membership_id: number;
  is_active: boolean;
  is_archived: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MessageItem {
  id: number;
  channel_id: number;
  sender: {
    membership_id: number;
    user_id: number;
    name: string;
    email: string;
  } | null;
  reply_to_message_id: number | null;
  content: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  sent_at: string;
  deleted_at: string | null;
}

export interface MessageRevision {
  id: number;
  revision_number: number;
  editor_membership_id: number;
  edited_at: string;
  content: string;
}

export interface SearchMessageResult {
  message_id: number;
  channel_id: number;
  channel_name: string;
  sender_membership_id: number;
  sender_name: string;
  sender_email: string;
  sent_at: string;
  snippet: string;
}

export interface SectionPermission {
  permission_key: string;
  is_allowed: boolean;
}

export interface Section {
  id: number;
  company_id: number;
  name: string;
  slug: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  created_by_membership_id: number;
}

export interface SectionRow {
  section: Section;
  members_count: number;
  permissions: SectionPermission[];
}

export interface MembershipListRow {
  membership: MembershipRecord;
  user: UserProfile;
  sections: string[];
  effective_permissions: EffectivePermissions;
}

export interface UserCreationRequest {
  id: number;
  company_id: number;
  requested_by_membership_id: number;
  reviewed_by_membership_id: number | null;
  name: string;
  email: string;
  requested_role: Role;
  requested_user_type: UserType;
  status: string;
  review_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientInviteCode {
  id: number;
  company_id: number;
  created_by_membership_id: number;
  code: string;
  email_hint: string | null;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
}

export interface PresenceRow {
  company_membership_id: number;
  is_online: boolean;
  last_seen_at: string | null;
  last_activity_at: string | null;
  current_session_id: number | null;
  name: string;
  email: string;
  role: Role;
  user_type: UserType;
}

export interface SessionRow {
  id: number;
  user_id: number;
  company_id: number | null;
  device_label: string | null;
  ip_address: string | null;
  user_agent: string | null;
  last_seen_at: string | null;
  revoked_at: string | null;
  created_at: string;
}
