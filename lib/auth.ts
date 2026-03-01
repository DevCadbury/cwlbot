import Cookies from 'js-cookie';

const TOKEN_KEY = 'cwl_access_token';
const USER_KEY = 'cwl_user';

export function setAuth(accessToken: string, user: any) {
  Cookies.set(TOKEN_KEY, accessToken, {
    expires: 1 / 96, // ~15 min
    secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
    sameSite: 'strict',
  });
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

export function getUser(): any | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearAuth() {
  Cookies.remove(TOKEN_KEY);
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_KEY);
  }
}

export function isAdmin(user: any): boolean {
  return user?.roles?.includes('admin') || user?.roles?.includes('superadmin');
}

export function isSuperAdmin(user: any): boolean {
  return user?.roles?.includes('superadmin');
}
