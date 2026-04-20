import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  emptyPreset,
  parsePresetXml,
  serializePresetXml,
  type PresetsRoot,
} from '@/lib/presetXml';
import { StructuredEditor } from '@/components/StructuredEditor';
import { XmlEditor } from '@/components/XmlEditor';
import { Button, Card, Input } from '@/components/ui';
import { cn } from '@/lib/cn';
import { encodePermalink } from '@/lib/permalink';
import { beginLogin, isAuthenticated } from '@/lib/auth';
import {
  createPreset,
  deletePreset,
  fetchPreset,
  loadIndex,
  updatePreset,
  type IndexEntry,
} from '@/lib/presetStore';

type Tab = 'structured' | 'raw';

export function EditorRoute() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState('Untitled preset');
  const [tab, setTab] = useState<Tab>('structured');
  const [rawXml, setRawXml] = useState<string>(() => serializePresetXml(emptyPreset()));
  const [root, setRoot] = useState<PresetsRoot | null>(() => emptyPreset());
  const [parseError, setParseError] = useState<string | null>(null);

  const [entry, setEntry] = useState<IndexEntry | null>(null);
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [loadingPreset, setLoadingPreset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [permalink, setPermalink] = useState<string | null>(null);
  const [josmPermalinkUrl, setJosmPermalinkUrl] = useState<string | null>(null);

  // Load an existing saved preset when the URL has an id.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoadingPreset(true);
    (async () => {
      try {
        const p = await fetchPreset(id);
        if (cancelled) return;
        setTitle(p.title);
        setRawXml(p.xml);
        setOwnerId(p.ownerId);
        try {
          setRoot(parsePresetXml(p.xml));
          setParseError(null);
        } catch (e) {
          setRoot(null);
          setParseError(String(e));
        }
        if (isAuthenticated()) {
          const idx = await loadIndex();
          const found = idx.find((x) => x.id === id) ?? null;
          setEntry(found);
        }
      } catch (e) {
        setStatus(`Failed to load: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        if (!cancelled) setLoadingPreset(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Recompute anonymous permalinks whenever the XML changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await encodePermalink(rawXml);
        if (cancelled) return;
        const safeName =
          title.trim().replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'preset';
        setPermalink(`${location.origin}/p#preset=${token}`);
        setJosmPermalinkUrl(
          `${location.origin}/josm-preset?name=${safeName}&data=${token}`,
        );
      } catch {
        setPermalink(null);
        setJosmPermalinkUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rawXml, title]);

  // Sync structured → raw
  const applyStructured = (next: PresetsRoot) => {
    setRoot(next);
    setRawXml(serializePresetXml(next));
    setParseError(null);
  };

  // Sync raw → structured on tab switch.
  const switchTab = (t: Tab) => {
    if (t === 'structured' && tab === 'raw') {
      try {
        const parsed = parsePresetXml(rawXml);
        setRoot(parsed);
        setParseError(null);
      } catch (e) {
        setParseError(String(e));
        return;
      }
    }
    setTab(t);
  };

  const shortWebUrl = useMemo(
    () => (entry ? `${location.origin}/p/${entry.id}` : null),
    [entry],
  );
  const shortJosmUrl = useMemo(
    () => (entry ? `${location.origin}/josm-preset/${entry.id}` : null),
    [entry],
  );

  const isReadOnly = Boolean(id && entry == null && !loadingPreset); // viewing someone else's saved preset
  const canSave = !isReadOnly && !busy && rawXml.trim().length > 0;

  const save = async () => {
    if (!isAuthenticated()) {
      beginLogin(location.pathname);
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      if (entry) {
        const next = await updatePreset(entry, { title, xml: rawXml });
        setEntry(next);
        setStatus('Saved.');
      } else {
        const next = await createPreset(title, rawXml);
        setEntry(next);
        setOwnerId(null); // will be set next fetch if needed
        setStatus('Saved.');
        navigate(`/p/${next.id}/edit`, { replace: true });
      }
    } catch (e) {
      setStatus(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!entry) return;
    if (!confirm(`Delete "${entry.title}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deletePreset(entry);
      navigate('/');
    } catch (e) {
      setStatus(`Delete failed: ${e instanceof Error ? e.message : String(e)}`);
      setBusy(false);
    }
  };

  const downloadXml = () => {
    const blob = new Blob([rawXml], { type: 'application/xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const safeName =
      title.trim().replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'preset';
    a.download = `${safeName}.xml`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            disabled={isReadOnly}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={!canSave}>
            {isAuthenticated() ? (entry ? 'Save' : 'Save to cloud') : 'Sign in to save'}
          </Button>
          {entry && (
            <Button variant="danger" onClick={remove} disabled={busy}>
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={downloadXml}>
            Download XML
          </Button>
        </div>
      </div>

      {status && <Card className="text-sm">{status}</Card>}

      {isReadOnly && ownerId != null && (
        <Card className="text-sm">
          You're viewing a preset you don't own. Edits are local only — use "Save to cloud" to
          store a copy under your own OSM account.
        </Card>
      )}

      {shortWebUrl && shortJosmUrl && (
        <Card className="space-y-2 text-sm">
          <LinkRow label="Web view" url={shortWebUrl} />
          <LinkRow
            label="JOSM preset URL"
            url={shortJosmUrl}
            hint="Paste into JOSM → Preferences → Tagging Presets → + → URL"
          />
        </Card>
      )}

      <details className="rounded-md border border-slate-200 p-2 text-sm dark:border-slate-800">
        <summary className="cursor-pointer text-slate-600 dark:text-slate-400">
          Anonymous permalinks (no login required)
        </summary>
        <div className="mt-2 space-y-2">
          {permalink && josmPermalinkUrl ? (
            <>
              <LinkRow label="Web permalink" url={permalink} />
              <LinkRow
                label="JOSM permalink"
                url={josmPermalinkUrl}
                hint="Full preset embedded in the URL; no server storage."
              />
            </>
          ) : (
            <p className="text-xs text-slate-500">Encoding…</p>
          )}
        </div>
      </details>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        <TabButton active={tab === 'structured'} onClick={() => switchTab('structured')}>
          Structured
        </TabButton>
        <TabButton active={tab === 'raw'} onClick={() => switchTab('raw')}>
          Raw XML
        </TabButton>
      </div>

      {parseError && (
        <Card className="border-red-300 text-sm text-red-700 dark:border-red-700 dark:text-red-400">
          Parse error: {parseError}
        </Card>
      )}

      {tab === 'structured' ? (
        root ? (
          <StructuredEditor root={root} onChange={applyStructured} />
        ) : (
          <Card className="text-sm">
            The current XML can't be displayed in the structured editor. Fix parse errors in the
            Raw XML tab first.
          </Card>
        )
      ) : (
        <XmlEditor value={rawXml} onChange={(v) => setRawXml(v)} readOnly={isReadOnly} />
      )}
    </div>
  );
}

function LinkRow({
  label,
  url,
  hint,
}: {
  label: string;
  url: string;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="w-32 flex-none text-xs font-medium text-slate-500">{label}</span>
        <a
          className="flex-1 truncate font-mono text-xs text-slate-700 underline decoration-slate-300 hover:decoration-slate-500 dark:text-slate-300"
          href={url}
          target="_blank"
          rel="noreferrer"
          title={url}
        >
          {url}
        </a>
        <Button variant="ghost" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      {hint && <p className="ml-32 mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'border-b-2 px-4 py-2 text-sm font-medium transition',
        active
          ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
          : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
      )}
    >
      {children}
    </button>
  );
}
