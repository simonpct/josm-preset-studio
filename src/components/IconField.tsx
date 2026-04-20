import { useState } from 'react';
import { JosmIcon } from './JosmIcon';
import { IconPicker } from './IconPicker';
import { Button, Input } from './ui';
import { cn } from '@/lib/cn';

/**
 * Inline icon chooser: shows a preview, lets the user open a picker, and
 * also exposes the raw path as an input for power users (they can type a
 * custom path like `presets/food/bar.svg` or point at their own icon).
 */
export function IconField({
  value,
  onChange,
  label = 'Icon',
}: {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1">
      <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <JosmIcon path={value} size={28} />
        <Input
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder="presets/food/bar.svg"
        />
        <Button variant="ghost" onClick={() => setOpen(true)}>
          Browse…
        </Button>
      </div>
      <IconPicker
        open={open}
        current={value}
        onClose={() => setOpen(false)}
        onPick={(p) => onChange(p ?? undefined)}
      />
    </div>
  );
}

/**
 * Compact clickable icon badge: shows only the preview. Clicking opens the
 * picker. Used inside collapsed headers where a full form field is overkill.
 */
export function IconBadgeButton({
  value,
  onChange,
  size = 20,
  title = 'Change icon',
}: {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  size?: number;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        title={title}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          'flex-none cursor-pointer rounded border border-transparent p-0.5 transition',
          'hover:border-slate-300 hover:bg-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800',
        )}
      >
        <JosmIcon path={value} size={size} />
      </button>
      <IconPicker
        open={open}
        current={value}
        onClose={() => setOpen(false)}
        onPick={(p) => onChange(p ?? undefined)}
      />
    </>
  );
}
