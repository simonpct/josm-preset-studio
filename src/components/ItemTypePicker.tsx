import { cn } from '@/lib/cn';

// JOSM item type tokens. The `type` attribute is a comma-separated list.
// Reference: https://josm.openstreetmap.de/wiki/TaggingPresets#item
const TOKENS = [
  { token: 'node', label: 'Node', icon: '/osm-elements/node.svg' },
  { token: 'way', label: 'Way', icon: '/osm-elements/area.svg' },
  { token: 'closedway', label: 'Closed way', icon: '/osm-elements/area.svg' },
  { token: 'multipolygon', label: 'Multipolygon', icon: '/osm-elements/area.svg' },
  { token: 'relation', label: 'Relation', icon: '/osm-elements/relation.svg' },
] as const;

type Token = (typeof TOKENS)[number]['token'];

function parse(value: string | undefined): Set<Token> {
  if (!value) return new Set();
  const out = new Set<Token>();
  for (const raw of value.split(',')) {
    const t = raw.trim();
    if ((TOKENS as readonly { token: string }[]).some((x) => x.token === t)) {
      out.add(t as Token);
    }
  }
  return out;
}

function serialize(set: Set<Token>): string {
  // Preserve the canonical order from TOKENS.
  return TOKENS.filter((t) => set.has(t.token)).map((t) => t.token).join(',');
}

export function ItemTypePicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
}) {
  const selected = parse(value);
  const toggle = (t: Token) => {
    const next = new Set(selected);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    const s = serialize(next);
    onChange(s || undefined);
  };

  return (
    <div className="space-y-1">
      <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">
        Applies to
      </span>
      <div className="flex flex-wrap gap-2">
        {TOKENS.map((t) => {
          const active = selected.has(t.token);
          return (
            <button
              key={t.token}
              type="button"
              onClick={() => toggle(t.token)}
              title={t.token}
              className={cn(
                'flex items-center gap-1.5 rounded-md border-2 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition dark:bg-slate-900 dark:text-slate-300',
                active
                  ? 'border-slate-900 dark:border-white'
                  : 'border-slate-200 opacity-60 hover:border-slate-300 hover:opacity-100 dark:border-slate-800 dark:hover:border-slate-700',
              )}
            >
              <img src={t.icon} alt="" width={16} height={16} className="flex-none" />
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
