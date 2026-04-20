// OSM OAuth 2.0 Authorization Code + PKCE flow, browser-only.
// Endpoints: https://wiki.openstreetmap.org/wiki/OAuth
//   Authorize:  {oauthBase}/oauth2/authorize
//   Token:      {oauthBase}/oauth2/token
// Public client (no secret). Token is stored in localStorage; adequate for a
// toy/personal tool, not for high-security needs.

import { env } from './env';

const STORAGE_KEY = 'jps.auth.token.v1';
const VERIFIER_KEY = 'jps.auth.pkce.verifier';
const STATE_KEY = 'jps.auth.pkce.state';
const RETURN_KEY = 'jps.auth.return_to';

export interface StoredToken {
  access_token: string;
  token_type: string;
  scope: string;
  created_at: number; // unix seconds
}

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomBytes(len: number): Uint8Array {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return a;
}

async function sha256(str: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
}

export function getToken(): StoredToken | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredToken;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function beginLogin(returnTo?: string): Promise<void> {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(await sha256(verifier));
  const state = b64url(randomBytes(16));

  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);
  if (returnTo) sessionStorage.setItem(RETURN_KEY, returnTo);

  const u = new URL(`${env.oauthBase}/oauth2/authorize`);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', env.clientId);
  u.searchParams.set('redirect_uri', env.redirectUri);
  u.searchParams.set('scope', env.scopes.join(' '));
  u.searchParams.set('state', state);
  u.searchParams.set('code_challenge', challenge);
  u.searchParams.set('code_challenge_method', 'S256');

  window.location.assign(u.toString());
}

export interface CallbackResult {
  token: StoredToken;
  returnTo: string | null;
}

export async function completeLogin(search: string): Promise<CallbackResult> {
  const params = new URLSearchParams(search);
  const code = params.get('code');
  const state = params.get('state');
  const err = params.get('error');
  if (err) throw new Error(`OAuth error: ${err} ${params.get('error_description') ?? ''}`);
  if (!code || !state) throw new Error('Missing code/state in OAuth callback');

  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!expectedState || state !== expectedState) throw new Error('OAuth state mismatch');
  if (!verifier) throw new Error('Missing PKCE verifier');

  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', code);
  body.set('redirect_uri', env.redirectUri);
  body.set('client_id', env.clientId);
  body.set('code_verifier', verifier);

  const res = await fetch(`${env.oauthBase}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as Omit<StoredToken, 'created_at'>;
  const token: StoredToken = { ...data, created_at: Math.floor(Date.now() / 1000) };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(token));

  const returnTo = sessionStorage.getItem(RETURN_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(RETURN_KEY);

  return { token, returnTo };
}

export function authHeader(): HeadersInit {
  const t = getToken();
  if (!t) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${t.access_token}` };
}
