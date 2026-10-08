import type { 
  Camera, 
  NewCameraPayload, 
  UpdateCameraPayload, 
  AuthUser, 
  LoginPayload, 
  LoginResponse, 
  NewUserPayload 
} from '../types';

// Use explicit backend API URL or relative proxy path
const BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

const TOKEN_KEY = 'vizai_auth_token';
const USER_KEY = 'vizai_auth_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredUser(): AuthUser | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null): void {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/* ==========================================================================
   AUTHENTICATION & USER APIS
   ========================================================================== */

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to authenticate.');
  }

  setStoredToken(data.token);
  setStoredUser(data.user);
  return data;
}

export function logout(): void {
  setStoredToken(null);
  setStoredUser(null);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const response = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      logout();
      return null;
    }
    const data = await response.json();
    if (data.success && data.user) {
      setStoredUser(data.user);
      return data.user;
    }
    return null;
  } catch {
    return getStoredUser();
  }
}

export async function fetchUsers(): Promise<AuthUser[]> {
  const response = await fetch(`${BASE_URL}/api/users`, {
    headers: getAuthHeaders(),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to load user directory.');
  }

  return data.data || [];
}

export async function createUser(payload: NewUserPayload): Promise<AuthUser> {
  const response = await fetch(`${BASE_URL}/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to create user account.');
  }

  return data.data;
}

export async function deleteUser(id: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to delete user.');
  }
}

/* ==========================================================================
   CAMERA APIS
   ========================================================================== */

export async function fetchCameras(): Promise<Camera[]> {
  try {
    const response = await fetch(`${BASE_URL}/api/cameras`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch cameras: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  } catch (error) {
    console.error('API Error [fetchCameras]:', error);
    try {
      const fallbackRes = await fetch('/api/cameras', { headers: getAuthHeaders() });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        return Array.isArray(fallbackData) ? fallbackData : (fallbackData.data || []);
      }
    } catch {
      // ignore secondary fallback error
    }
    throw error;
  }
}

export async function registerCamera(payload: NewCameraPayload): Promise<Camera> {
  const url = `${BASE_URL}/api/cameras`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const resJson = await response.json().catch(() => ({}));

  if (!response.ok || (resJson && resJson.success === false)) {
    const errorMsg = resJson?.error || `Server responded with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return resJson.data || resJson;
}

export async function updateCamera(id: string, payload: UpdateCameraPayload): Promise<Camera> {
  const url = `${BASE_URL}/api/cameras/${id}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const resJson = await response.json().catch(() => ({}));

  if (!response.ok || (resJson && resJson.success === false)) {
    const errorMsg = resJson?.error || `Server responded with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return resJson.data || resJson;
}

export async function deleteCamera(id: string): Promise<{ success: boolean; message: string }> {
  const url = `${BASE_URL}/api/cameras/${id}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const resJson = await response.json().catch(() => ({}));

  if (!response.ok || (resJson && resJson.success === false)) {
    const errorMsg = resJson?.error || `Server responded with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return resJson;
}

export async function checkSystemHealth(): Promise<{ online: boolean; message: string }> {
  try {
    const response = await fetch(`${BASE_URL}/`, { method: 'GET' });
    if (response.ok) {
      const data = await response.json();
      return { online: true, message: data.status || 'ONLINE' };
    }
    return { online: false, message: 'Unhealthy' };
  } catch {
    return { online: false, message: 'Offline' };
  }
}
