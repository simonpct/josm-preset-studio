import { useEffect, useMemo, useState } from 'react';
import { iconIndex, searchIcons, type IconEntry } from '@/lib/josmIcons';
import { JosmIcon } from './JosmIcon';
import { Button, Input } from './ui';
import { cn } from '@/lib/cn';

/**
 * Modal for picking a JOSM preset icon. Returns the XML path (e.g.
 * "presets/food/bar.svg") via onPick, or null for "clear".
 */
export function IconPicker({
  open,
  current,
  onPick,
  onClose,
}: {
  open: boolean;
  current?: string | null;
  onPick: (path: string | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const categories = useMemo(() => Object.keys(iconIndex.categories).sort(), []);
  const results = useMemo(() => searchIcons(query, category), [query, category]);
  // Only render the first N for performance; user can narrow search.
  const MAX_SHOWN = 240;
  const shown = results.slice(0, MAX_SHOWN);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mt-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <h2 className="text-base font-semibold">Pick a JOSM icon</h2>
          <div className="ml-auto flex gap-2">
            {current && (
              <Button
                variant="ghost"
                onClick={() => {
                  onPick(null);
                  onClose();
                }}
              >
                Clear
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-b border-slate-200 p-3 dark:border-slate-800 sm:flex-row">
          <Input
            placeholder="Search icons…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <select
            value={category ?? ''}
            onChange={(e) => setCategory(e.target.value || null)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c} ({iconIndex.categories[c].length})
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {shown.length === 0 ? (
            <p className="text-center text-sm text-slate-500">No icons match.</p>
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
                {shown.map((ic) => (
                  <IconTile
                    key={ic.path}
                    icon={ic}
                    selected={ic.path === current}
                    onSelect={() => {
                      onPick(ic.path);
                      onClose();
                    }}
                  />
                ))}
              </div>
              {results.length > MAX_SHOWN && (
                <p className="mt-3 text-center text-xs text-slate-500">
                  Showing {MAX_SHOWN} of {results.length}. Narrow your search to see more.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function IconTile({
  icon,
  selected,
  onSelect,
}: {
  icon: IconEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      title={icon.path}
      className={cn(
        'flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition',
        'hover:border-slate-400 dark:hover:border-slate-600',
        selected
          ? 'border-slate-900 bg-slate-100 dark:border-white dark:bg-slate-800'
          : 'border-slate-200 dark:border-slate-800',
      )}
    >
      <JosmIcon path={icon.path} size={32} />
      <span className="line-clamp-2 break-all text-center leading-tight text-slate-600 dark:text-slate-400">
        {icon.leaf}
      </span>
      {icon.subpath && (
        <span className="line-clamp-1 break-all text-center text-[9px] leading-tight text-slate-400">
          {icon.subpath}/
        </span>
      )}
    </button>
  );
}
