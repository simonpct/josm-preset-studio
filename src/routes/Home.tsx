import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { beginLogin, isAuthenticated } from '@/lib/auth';
import { loadIndex, type IndexEntry } from '@/lib/presetStore';
import { Button, Card } from '@/components/ui';

export function HomeRoute() {
  const [entries, setEntries] = useState<IndexEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const authed = isAuthenticated();

  useEffect(() => {
    if (!authed) return;
    loadIndex()
      .then(setEntries)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [authed]);

  if (!authed) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 text-center">
        <h1 className="text-3xl font-semibold">JOSM Preset Studio</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Build JOSM tagging presets in your browser. Sign in with your OpenStreetMap account
          to save presets to the cloud and get short shareable URLs — or skip sign-in and use
          anonymous permalinks that embed the whole preset in the URL.
        </p>
        <div className="flex justify-center gap-2">
          <Button onClick={() => beginLogin('/')}>Sign in with OpenStreetMap</Button>
          <Link to="/editor">
            <Button variant="ghost">Start without signing in</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your presets</h1>
        <Link to="/editor">
          <Button>New preset</Button>
        </Link>
      </div>
      {err && <Card className="text-sm text-red-600">Failed to load index: {err}</Card>}
      {!entries ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : entries.length === 0 ? (
        <Card className="text-center text-sm text-slate-500">
          No presets yet. Create your first one.
        </Card>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id}>
              <Link to={`/p/${e.id}/edit`}>
                <Card className="transition hover:border-slate-400 dark:hover:border-slate-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{e.title}</div>
                      <div className="text-xs text-slate-500">
                        {e.id} · updated {new Date(e.updatedAt * 1000).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
