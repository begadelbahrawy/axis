const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function handle<T>(res: Response): Promise<T> {
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json().catch(() => ({})) : null;
  if (!res.ok) {
    throw new ApiError((body && (body as any).error) || res.statusText, res.status);
  }
  return body as T;
}

// Every mutating request echoes the (non-httpOnly) CSRF cookie back as a
// header — the backend's double-submit check rejects anything that doesn't
// match. A plain GET always precedes this in practice (the app boots with
// GET /auth/me), so the cookie is already set before any mutation is sent.
function csrfHeaders(): Record<string, string> {
  const token = readCookie('axis_csrf');
  return token ? { 'X-CSRF-Token': token } : {};
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  return handle<T>(res);
}

export async function apiSend<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...csrfHeaders(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handle<T>(res);
}

export async function apiUpload<T>(method: string, path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { method, credentials: 'include', headers: csrfHeaders(), body: formData });
  return handle<T>(res);
}

export const apiPost = <T>(path: string, body?: unknown) => apiSend<T>('POST', path, body);
export const apiPut = <T>(path: string, body?: unknown) => apiSend<T>('PUT', path, body);
export const apiPatch = <T>(path: string, body?: unknown) => apiSend<T>('PATCH', path, body);
export const apiDelete = <T>(path: string) => apiSend<T>('DELETE', path);
