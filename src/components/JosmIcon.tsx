import { useEffect, useState } from 'react';
import { loadIconUrl } from '@/lib/josmIcons';
import { cn } from '@/lib/cn';

/**
 * Render a JOSM preset icon by its XML `icon` attribute value,
 * e.g. "presets/food/bar.svg". Shows a neutral placeholder while
 * loading or on failure.
 */
export function JosmIcon({
  path,
  size = 24,
  className,
}: {
  path: string | undefined | null;
  size?: number;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setUrl(null);
    setFailed(false);
    if (!path) return;
    let cancelled = false;
    loadIconUrl(path).then((u) => {
      if (cancelled) return;
      if (u) setUrl(u);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const style = { width: size, height: size };
  const base = 'inline-block flex-none';

  if (!path) {
    return (
      <span
        className={cn(
          base,
          'rounded border border-dashed border-slate-300 dark:border-slate-700',
          className,
        )}
        style={style}
      />
    );
  }
  if (failed) {
    return (
      <span
        className={cn(
          base,
          'rounded border border-red-300 bg-red-50 text-[10px] text-red-500 dark:border-red-800 dark:bg-red-950/50',
          className,
        )}
        style={style}
        title={`icon not found: ${path}`}
      >
        ?
      </span>
    );
  }
  if (!url) {
    return (
      <span
        className={cn(base, 'rounded bg-slate-100 dark:bg-slate-800', className)}
        style={style}
      />
    );
  }
  return <img src={url} alt="" className={cn(base, className)} style={style} />;
}
