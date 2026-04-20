import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchPreset, type PresetPublic } from '@/lib/presetStore';
import { decodePermalink, parseHashPreset } from '@/lib/permalink';
import { XmlEditor } from '@/components/XmlEditor';
import { Button, Card } from '@/components/ui';
import { isAuthenticated } from '@/lib/auth';

/** /p/:id — public view of a KV-stored preset. */
export function SharedByIdRoute() {
  const { id } = useParams<{ id: string }>();
  const [preset, setPreset] = useState<PresetPublic | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchPreset(id)
      .then(setPreset)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [id]);

  if (err) return <Card className="text-sm text-red-600">Error: {err}</Card>;
  if (!preset) return <p className="text-sm text-slate-500">Loading…</p>;

  const josmUrl = `${location.origin}/josm-preset/${preset.id}`;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{preset.title}</h1>
        <p className="text-xs text-slate-500">
          by {preset.ownerName} · updated {new Date(preset.updatedAt * 1000).toLocaleString()}
        </p>
      </div>
      <Card className="text-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">JOSM preset URL</span>
          <code className="flex-1 truncate font-mono text-xs text-slate-700 dark:text-slate-300">
            {josmUrl}
          </code>
          <Button
            variant="ghost"
            onClick={() => navigator.clipboard.writeText(josmUrl).catch(() => undefined)}
          >
            Copy
          </Button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Paste into JOSM → Preferences → Tagging Presets → + → URL
        </p>
      </Card>
      <div className="flex gap-2">
        {isAuthenticated() && (
          <Link to={`/p/${preset.id}/edit`}>
            <Button>Open in editor</Button>
          </Link>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            const blob = new Blob([preset.xml], { type: 'application/xml' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${preset.title.replace(/[^a-z0-9._-]+/gi, '_')}.xml`;
            a.click();
          }}
        >
          Download XML
        </Button>
      </div>
      <XmlEditor value={preset.xml} readOnly />
    </div>
  );
}

/** /p#preset=... — decodes a self-contained anonymous permalink. */
export function SharedByHashRoute() {
  const [xml, setXml] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const token = parseHashPreset(location.hash);
    if (!token) {
      setErr('No #preset= fragment found');
      return;
    }
    decodePermalink(token)
      .then(setXml)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  if (err) return <Card className="text-sm text-red-600">Error: {err}</Card>;
  if (xml == null) return <p className="text-sm text-slate-500">Decoding…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Shared preset</h1>
      <p className="text-xs text-slate-500">
        This preset is encoded in the URL itself — no server involved.
      </p>
      <XmlEditor value={xml} readOnly />
      <Button
        variant="ghost"
        onClick={() => {
          const blob = new Blob([xml], { type: 'application/xml' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'preset.xml';
          a.click();
        }}
      >
        Download XML
      </Button>
    </div>
  );
}
