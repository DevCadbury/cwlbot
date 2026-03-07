import { getToken } from './auth';

// All requests go through /api/backend — the real API URL stays server-side only
const API_BASE = '/api/backend';

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `API error ${res.status}`);
  }

  return res.json();
}

// ── Auth ──

export async function apiLogin(phone: string, password: string) {
  return apiFetch<{
    accessToken: string;
    refreshToken: string;
    user: { phone: string; displayName: string; roles: string[] };
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
}

export async function apiRefreshToken(token: string) {
  return apiFetch<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiChangePassword(oldPassword: string, newPassword: string) {
  return apiFetch<{ success: boolean }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
  });
}

export async function apiLogout(token?: string) {
  // Allow passing token explicitly for logout when clearing state
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  else {
    const stored = getToken();
    if (stored) headers['Authorization'] = `Bearer ${stored}`;
  }
  return fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers,
    credentials: 'include',
  }).then(r => r.json());
}

// ── User ──

export async function apiGetProfile() {
  return apiFetch<any>('/users/me');
}

export async function apiUpdateLinkedPlayer(playerTag: string) {
  return apiFetch<any>('/users/me/linked-player', {
    method: 'PUT',
    body: JSON.stringify({ playerTag }),
  });
}

// ── Admin: Dashboard ──

export async function apiGetDashboard() {
  return apiFetch<any>('/admin/dashboard');
}

// ── Admin: Users ──

export async function apiListUsers(params: { page?: number; limit?: number; search?: string } = {}) {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.search) q.set('search', params.search);
  return apiFetch<any>(`/admin/users?${q}`);
}

export async function apiUpdateUserRoles(phone: string, roles: string[]) {
  return apiFetch<any>(`/admin/users/${encodeURIComponent(phone)}/roles`, {
    method: 'PUT',
    body: JSON.stringify({ roles }),
  });
}

export async function apiDeleteUser(phone: string) {
  return apiFetch<any>(`/admin/users/${encodeURIComponent(phone)}`, {
    method: 'DELETE',
  });
}

export async function apiResetUserPassword(phone: string, newPassword: string) {
  return apiFetch<any>(`/admin/users/${encodeURIComponent(phone)}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
  });
}

// ── Admin: Groups ──

export async function apiListGroups(params: { page?: number; limit?: number } = {}) {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  return apiFetch<any>(`/admin/groups?${q}`);
}

// ── Admin: Sessions ──

export async function apiListSessions(params: { page?: number; limit?: number; status?: string } = {}) {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.status) q.set('status', params.status);
  return apiFetch<any>(`/admin/sessions?${q}`);
}

// ── Admin: Audit Logs ──

export async function apiListAuditLogs(params: { page?: number; limit?: number; action?: string } = {}) {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.action) q.set('action', params.action);
  return apiFetch<any>(`/admin/audit?${q}`);
}

// ── Admin: Snapshots ──

export async function apiGetSnapshotHistory(clanTag: string) {
  const tag = clanTag.replace('#', '');
  return apiFetch<any>(`/admin/snapshots/${tag}`);
}

// ── Clans ──

export async function apiListClans(params: { page?: number; limit?: number } = {}) {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  return apiFetch<any>(`/clans?${q}`);
}

export async function apiAddClan(clanTag: string) {
  return apiFetch<any>('/admin/clans', {
    method: 'POST',
    body: JSON.stringify({ clanTag }),
  });
}

export async function apiDeleteClan(clanTag: string) {
  const tag = clanTag.replace('#', '');
  return apiFetch<any>(`/clans/${encodeURIComponent(tag)}`, {
    method: 'DELETE',
  });
}

export async function apiGetClan(clanTag: string) {
  const tag = clanTag.replace('#', '');
  return apiFetch<any>(`/clans/${encodeURIComponent(tag)}`);
}

export async function apiExportClan(clanTag: string, format: 'excel' | 'pdf'): Promise<Blob> {
  const tag = clanTag.replace('#', '');
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/clans/${encodeURIComponent(tag)}/export?format=${format}`, {
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as any).error || `Export failed ${res.status}`);
  }
  return res.blob();
}

// ── Admin: My Group ──

export async function apiGetMyGroup() {
  return apiFetch<any>('/admin/my-group');
}

export async function apiGenerateGroupOtp(chatID: string) {
  return apiFetch<{
    otp: string;
    expiresInMinutes: number;
    chatID: string;
    groupTitle: string;
    instruction: string;
  }>(`/admin/groups/${encodeURIComponent(chatID)}/generate-otp`, { method: 'POST' });
}

export async function apiGetGroupLinkLogs(chatID: string) {
  return apiFetch<{ logs: any[] }>(`/admin/groups/${encodeURIComponent(chatID)}/link-logs`);
}

export async function apiGetGroupReminder(chatID: string) {
  return apiFetch<{ reminder: { enabled: boolean; hoursBeforeEnd: number; message: string } }>(
    `/admin/groups/${encodeURIComponent(chatID)}/reminder`
  );
}

export async function apiUpdateGroupReminder(
  chatID: string,
  config: { enabled: boolean; hoursBeforeEnd: number; message: string }
) {
  return apiFetch<{ success: boolean; reminder: any }>(
    `/admin/groups/${encodeURIComponent(chatID)}/reminder`,
    { method: 'PUT', body: JSON.stringify(config) }
  );
}

// ── Admin: Group CWL session ──

export async function apiGetGroupSession(chatID: string) {
  return apiFetch<{ session: any | null }>(`/admin/group-session/${encodeURIComponent(chatID)}`);
}

export async function apiAdminAssignPlayer(
  sessionId: string,
  userPhone: string,
  clanTag: string,
  playerTag?: string
) {
  return apiFetch<{ success: boolean; session: any }>(`/admin/sessions/${encodeURIComponent(sessionId)}/assign`, {
    method: 'POST',
    body: JSON.stringify({ userPhone, clanTag, playerTag }),
  });
}

export async function apiAdminUnassignPlayer(
  sessionId: string,
  userPhone: string,
  playerTag?: string
) {
  return apiFetch<{ success: boolean; session: any }>(`/admin/sessions/${encodeURIComponent(sessionId)}/unassign`, {
    method: 'POST',
    body: JSON.stringify({ userPhone, playerTag }),
  });
}

export async function apiAdminAssignMultiple(
  sessionId: string,
  assignments: Array<{ userPhone: string; playerTag?: string; clanTag: string }>
) {
  return apiFetch<{ success: boolean; assignedCount: number }>(
    `/admin/sessions/${encodeURIComponent(sessionId)}/assign-multi`,
    { method: 'POST', body: JSON.stringify({ assignments }) }
  );
}

export async function apiGetSessionDetail(sessionId: string) {
  return apiFetch<{ session: any }>(`/admin/sessions/${encodeURIComponent(sessionId)}/detail`);
}

// ── Admin: Registrations ──

export async function apiGetRegistrations() {
  return apiFetch<{ registrations: any[] }>('/admin/registrations');
}

export async function apiGetGroupDetail(chatID: string) {
  return apiFetch<{
    group: any;
    members: any[];
    linkedUsers: any[];
    activeSession: any | null;
    sessions: any[];
  }>(`/admin/groups/${encodeURIComponent(chatID)}/detail`);
}

export async function apiReopenSession(sessionId: string) {
  return apiFetch<{ success: boolean; sessionId: string; status: string }>(
    `/admin/sessions/${encodeURIComponent(sessionId)}/reopen`,
    { method: 'POST' }
  );
}

export async function apiCloseSession(sessionId: string) {
  return apiFetch<{ success: boolean; sessionId: string; status: string }>(
    `/admin/sessions/${encodeURIComponent(sessionId)}/close`,
    { method: 'POST' }
  );
}

// ── User: Linked Players ──

export async function apiGetLinkedPlayers() {
  return apiFetch<{ linkedPlayers: any[] }>('/users/me/linked-players');
}

export async function apiAddLinkedPlayer(playerTag: string, clanTag?: string, note?: string) {
  return apiFetch<{ linkedPlayers: any[] }>('/users/me/linked-players', {
    method: 'POST',
    body: JSON.stringify({ playerTag, clanTag, note }),
  });
}

export async function apiUpdateLinkedPlayerEntry(
  playerTag: string,
  data: { clanTag?: string; assignedClanTag?: string; note?: string }
) {
  return apiFetch<{ linkedPlayers: any[] }>(
    `/users/me/linked-players/${encodeURIComponent(playerTag)}`,
    { method: 'PUT', body: JSON.stringify(data) }
  );
}

export async function apiRemoveLinkedPlayer(playerTag: string) {
  return apiFetch<{ linkedPlayers: any[] }>(
    `/users/me/linked-players/${encodeURIComponent(playerTag)}`,
    { method: 'DELETE' }
  );
}

// ── User: My Clans (dashboard + bot-synced) ──

export async function apiGetUserClans() {
  return apiFetch<{ userClans: any[] }>('/users/me/clans');
}

export async function apiAddUserClan(clanTag: string, source: 'bot' | 'dashboard' = 'dashboard') {
  return apiFetch<{ userClans: any[] }>('/users/me/clans', {
    method: 'POST',
    body: JSON.stringify({ clanTag, source }),
  });
}

export async function apiRemoveUserClan(clanTag: string) {
  return apiFetch<{ userClans: any[] }>(
    `/users/me/clans/${encodeURIComponent(clanTag)}`,
    { method: 'DELETE' }
  );
}

/** Pull latest bot profile and reconcile userClans + linkedPlayers */
export async function apiSyncUserClans() {
  return apiFetch<{ synced: boolean; changed: boolean; userClans: any[]; linkedPlayers: any[] }>(
    '/users/me/clans/sync',
    { method: 'POST' }
  );
}

/** Fetch real-time CoC clan data for ANY clan tag (not just admin-tracked) */
export async function apiGetClanLive(clanTag: string) {
  const tag = clanTag.replace('#', '');
  return apiFetch<{ clan: any }>(`/users/me/clans/${encodeURIComponent(tag)}/live`);
}

/** Fetch live player data from CoC API */
export async function apiGetPlayerLive(playerTag: string) {
  const tag = playerTag.replace('#', '');
  return apiFetch<{ player: any }>(`/users/me/players/${encodeURIComponent(tag)}/live`);
}

/** Fetch basic clan info (badge, name, level) from CoC API via the backend */
export async function apiGetClanInfo(clanTag: string) {
  const tag = encodeURIComponent(clanTag.replace('#', ''));
  const res = await apiFetch<{ clan: any }>(`/users/me/clans/${tag}/live`);
  return res.clan;
}

/**
 * Fetch basic player info (name, TH level, league, trophies) from CoC API.
 * Used to display rich player cards instead of raw tags on the registrations page.
 */
export async function apiGetPlayerInfo(playerTag: string) {
  const tag = encodeURIComponent(playerTag.replace('#', ''));
  const res = await apiFetch<{ player: any }>(`/users/me/players/${tag}/live`);
  return res.player;
}

/** Fetch current war for a clan */
export async function apiGetClanWar(clanTag: string) {
  const tag = clanTag.replace('#', '');
  return apiFetch<{ war: any | null }>(`/users/me/clans/${encodeURIComponent(tag)}/war`);
}

/** Get the current user's own CWL session registration status */
export async function apiGetMyCwlRegistration() {
  return apiFetch<{ session: any | null; registrations: any[] }>('/users/me/cwl-registration');
}

// ── Export ──

export async function apiGetExport(sessionId: string, format: 'excel' | 'pdf') {
  const params = new URLSearchParams({ format });
  if (sessionId) params.set('sessionId', sessionId);
  return apiFetch<any>(`/export?${params}`);
}
