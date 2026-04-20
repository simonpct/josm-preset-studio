export const env = {
  clientId: import.meta.env.VITE_OSM_CLIENT_ID as string,
  apiBase: (import.meta.env.VITE_OSM_API_BASE as string) || 'https://api.openstreetmap.org',
  oauthBase: (import.meta.env.VITE_OSM_OAUTH_BASE as string) || 'https://www.openstreetmap.org',
  redirectUri: `${window.location.origin}/callback`,
  scopes: ['read_prefs', 'write_prefs'] as const,
};

if (!env.clientId) {
  console.warn(
    '[josm-preset-studio] VITE_OSM_CLIENT_ID is not set. Copy .env.local.example to .env.local and fill it in.',
  );
}
