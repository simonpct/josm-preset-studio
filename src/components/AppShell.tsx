import { Link, NavLink, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { beginLogin, getToken, logout } from '@/lib/auth';
import { getUserDetails, type OsmUser } from '@/lib/osmPrefs';
import { Button } from './ui';
import { cn } from '@/lib/cn';

export function AppShell() {
  const [user, setUser] = useState<OsmUser | null>(null);
  const [loading, setLoading] = useState(false);
  const token = getToken();

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setUser(null);
      return;
    }
    setLoading(true);
    getUserDetails()
      .then((u) => !cancelled && setUser(u))
      .catch(() => !cancelled && setUser(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token?.access_token]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="text-lg font-semibold">
            JOSM Preset Studio
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <NavLink to="/" end className={navClass}>
              Home
            </NavLink>
            <NavLink to="/editor" className={navClass}>
              New preset
            </NavLink>
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-slate-600 dark:text-slate-400">{user.display_name}</span>
                <Button
                  variant="ghost"
                  onClick={() => {
                    logout();
                    location.href = '/';
                  }}
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => beginLogin(location.pathname + location.search + location.hash)}
                disabled={loading}
              >
                Sign in with OSM
              </Button>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-500 dark:border-slate-800">
        Client-only React app. Presets stored on Cloudflare KV, index synced via OSM user
        preferences.
      </footer>
    </div>
  );
}

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    'hover:text-slate-900 dark:hover:text-white',
    isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500',
  );
}
