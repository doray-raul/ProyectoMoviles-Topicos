import { API_URL } from '@/config';

/**
 * Error returned by every API function.
 * The Django API always answers errors with the shape
 * { message, fields, status } (see catalog/exceptions.py in the backend).
 */
export class ApiError extends Error {
  status: number;
  fields: Record<string, string[]>;

  constructor(message: string, status: number, fields: Record<string, string[]> = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

/** Turns any error into a text that can be shown to the user. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Ocurrió un error inesperado.';
}

// The token is stored here so every request carries it without passing it each time.
// AuthContext updates it on login and logout.
let currentToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  currentToken = token;
}

export function setOnSessionExpired(callback: (() => void) | null) {
  onSessionExpired = callback;
}

type ParamValue = string | number | boolean | null | undefined;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, ParamValue>;
}

/** Builds the URL with the query parameters, skipping the empty ones. */
function buildUrl(path: string, params?: Record<string, ParamValue>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return API_URL + path + (parts.length ? `?${parts.join('&')}` : '');
}

/**
 * Central function to talk to the API. Every other function in /api uses it.
 * - Adds the "Authorization: Token ..." header when there is a session.
 * - If the body is FormData (image upload) it is sent as is; otherwise it is sent as JSON.
 * - If the response is not successful it throws an ApiError with the server message.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (currentToken) headers.Authorization = `Token ${currentToken}`;

  let requestBody: FormData | string | undefined;
  if (body instanceof FormData) {
    // Content-Type is not set: the browser adds it with the multipart "boundary"
    requestBody = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), { method, headers, body: requestBody });
  } catch {
    // fetch only fails like this when there was no response: server down, wrong URL or CORS
    throw new ApiError('No se pudo conectar con el servidor. Revisa que la API esté encendida.', 0);
  }

  // 204 = successful delete, no content
  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // Token expired or deleted elsewhere: the local session is closed
    if (response.status === 401 && currentToken && onSessionExpired) onSessionExpired();

    if (response.status >= 500) {
      throw new ApiError('El servidor tuvo un problema. Intenta de nuevo más tarde.', response.status);
    }
    throw new ApiError(data?.message ?? `Error ${response.status}`, response.status, data?.fields ?? {});
  }

  return data as T;
}
