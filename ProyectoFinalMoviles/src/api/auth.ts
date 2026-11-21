import { request } from './client';
import { User } from '@/types';

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

/** POST /api/login/ -> returns the user's token. */
export function login(username: string, password: string) {
  return request<{ token: string }>('/login/', {
    method: 'POST',
    body: { username, password },
  });
}

/** POST /api/register/ -> creates the account and also returns the token. */
export function registerUser(data: RegisterInput) {
  return request<{ id: number; username: string; email: string; token: string }>('/register/', {
    method: 'POST',
    body: data,
  });
}

/** GET /api/profile/ -> data of the token owner (including whether they are an admin). */
export function getProfile() {
  return request<User>('/profile/');
}

/** POST /api/logout/ -> the server deletes the token, it no longer works for other requests. */
export function logoutOnServer() {
  return request<{ detail: string }>('/logout/', { method: 'POST' });
}
