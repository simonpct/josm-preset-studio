import { useMemo, useState } from 'react';
import type {
  GroupNode,
  ItemChild,
  ItemNode,
  PresetsRoot,
  TopLevelNode,
} from '@/lib/presetXml';
import { Button, Input } from './ui';
import { IconBadgeButton } from './IconField';
import { ItemTypePicker } from './ItemTypePicker';
import { cn } from '@/lib/cn';

// A modest structured editor that covers the most common node kinds.
// For everything else, users fall back to the raw XML tab.

export function StructuredEditor({
  root,
  onChange,
}: {
  root: PresetsRoot;
  onChange: (next: PresetsRoot) => void;
}) {
  const update = (patch: Partial<PresetsRoot>) => onChange({ ...root, ...patch });

  const setChildren = (children: TopLevelNode[]) => update({ children });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Author">
          <Input value={root.author ?? ''} onChange={(e) => update({ author: e.target.value })} />
        </Field>
        <Field label="Version">
          <Input value={root.version ?? ''} onChange={(e) => update({ version: e.target.value })} />
        </Field>
        <Field label="Short description">
          <Input
            value={root.shortdescription ?? ''}
            onChange={(e) => update({ shortdescription: e.target.value })}
          />
        </Field>
        <Field label="Description">
          <Input
            value={root.description ?? ''}
            onChange={(e) => update({ description: e.target.value })}
          />
        </Field>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Contents</h3>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() =>
                setChildren([
                  ...root.children,
                  { kind: 'group', name: 'New group', children: [] },
                ])
              }
            >
              + Group
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                setChildren([
                  ...root.children,
                  { kind: 'item', name: 'New item', type: 'node', children: [] },
                ])
              }
            >
              + Item
            </Button>
          </div>
        </div>
        <NodeList
          nodes={root.children}
          onChange={setChildren}
          depth={0}
          topLevel
        />
      </div>
    </div>
  );
}

function NodeList({
  nodes,
  onChange,
  depth,
  topLevel = false,
}: {
  nodes: TopLevelNode[] | ItemChild[];
  onChange: (next: any[]) => void;
  depth: number;
  topLevel?: boolean;
}) {
  if (nodes.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 p-3 text-center text-sm text-slate-500 dark:border-slate-700">
        (empty)
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {nodes.map((node, i) => (
        <li key={i}>
          <NodeRow
            node={node}
            onChange={(next) => {
              if (next == null) {
                onChange(nodes.filter((_, j) => j !== i));
              } else {
                onChange(nodes.map((n, j) => (i === j ? next : n)));
              }
            }}
            onMove={(delta) => {
              const j = i + delta;
              if (j < 0 || j >= nodes.length) return;
              const next = [...nodes];
              [next[i], next[j]] = [next[j], next[i]];
              onChange(next);
            }}
            depth={depth}
            topLevel={topLevel}
          />
        </li>
      ))}
    </ul>
  );
}

function NodeRow({
  node,
  onChange,
  onMove,
  depth,
  topLevel,
}: {
  node: TopLevelNode | ItemChild;
  onChange: (next: TopLevelNode | ItemChild | null) => void;
  onMove: (delta: number) => void;
  depth: number;
  topLevel: boolean;
}) {
  const isContainer = node.kind === 'group' || node.kind === 'item';
  // Groups default expanded, items default collapsed — items usually have
  // many leaf children that just add noise when you're navigating the tree.
  const [collapsed, setCollapsed] = useState(node.kind === 'item');

  const iconPath = isContainer ? (node as GroupNode | ItemNode).icon : undefined;
  const nodeLabel = isContainer ? (node as GroupNode | ItemNode).name : undefined;
  const childCount = isContainer ? (node as GroupNode | ItemNode).children.length : 0;

  const header = (
    <div
      className={cn(
        'mb-2 flex items-center justify-between gap-2',
        isContainer && 'cursor-pointer select-none',
        collapsed && 'mb-0',
      )}
      onClick={
        isContainer
          ? (e) => {
              // Don't toggle when clicking on the action buttons.
              if ((e.target as HTMLElement).closest('[data-no-toggle]')) return;
              setCollapsed((v) => !v);
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2 min-w-0">
        {isContainer && (
          <span
            className="flex h-5 w-4 flex-none items-center justify-center text-slate-400"
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '▸' : '▾'}
          </span>
        )}
        {isContainer && (
          <span data-no-toggle>
            <IconBadgeButton
              value={iconPath}
              size={20}
              onChange={(icon) => onChange({ ...(node as GroupNode | ItemNode), icon })}
            />
          </span>
        )}
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {node.kind}
        </span>
        {nodeLabel && (
          <span className="truncate text-xs text-slate-400">· {nodeLabel}</span>
        )}
        {isContainer && collapsed && childCount > 0 && (
          <span className="flex-none rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {childCount}
          </span>
        )}
      </div>
      <div className="flex gap-1 flex-none" data-no-toggle>
        <Button variant="ghost" onClick={() => onMove(-1)}>
          ↑
        </Button>
        <Button variant="ghost" onClick={() => onMove(+1)}>
          ↓
        </Button>
        <Button variant="danger" onClick={() => onChange(null)}>
          ×
        </Button>
      </div>
    </div>
  );

  const boxClass =
    'rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900';

  if (node.kind === 'group') {
    return (
      <div className={boxClass}>
        {header}
        {!collapsed && (
          <>
            <Field label="Name">
              <Input
                value={node.name}
                onChange={(e) => onChange({ ...node, name: e.target.value } as GroupNode)}
              />
            </Field>
            <div className="mt-3 ml-4 border-l-2 border-slate-200 pl-3 dark:border-slate-800">
              <div className="mb-2 flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() =>
                    onChange({
                      ...node,
                      children: [
                        ...node.children,
                        { kind: 'group', name: 'New group', children: [] },
                      ],
                    })
                  }
                >
                  + Group
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    onChange({
                      ...node,
                      children: [
                        ...node.children,
                        { kind: 'item', name: 'New item', type: 'node', children: [] },
                      ],
                    })
                  }
                >
                  + Item
                </Button>
              </div>
              <NodeList
                nodes={node.children}
                onChange={(next) => onChange({ ...node, children: next })}
                depth={depth + 1}
                topLevel={topLevel}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  if (node.kind === 'item') {
    return (
      <div className={boxClass}>
        {header}
        {!collapsed && (
          <>
            <Field label="Name">
              <Input
                value={node.name}
                onChange={(e) => onChange({ ...node, name: e.target.value } as ItemNode)}
              />
            </Field>
            <div className="mt-2">
              <ItemTypePicker
                value={node.type}
                onChange={(type) => onChange({ ...node, type } as ItemNode)}
              />
            </div>
            <div className="mt-3 ml-4 border-l-2 border-slate-200 pl-3 dark:border-slate-800">
              <AddItemChild
                onAdd={(c) => onChange({ ...node, children: [...node.children, c] })}
              />
              <NodeList
                nodes={node.children}
                onChange={(next) => onChange({ ...node, children: next as ItemChild[] })}
                depth={depth + 1}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  // Leaf nodes — compact one-row layout
  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900">
      <KindBadge kind={node.kind} />
      <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
        <LeafFieldsCompact node={node} onChange={onChange} />
      </div>
      <div className="flex flex-none gap-0.5">
        <IconBtn title="Move up" onClick={() => onMove(-1)}>
          ↑
        </IconBtn>
        <IconBtn title="Move down" onClick={() => onMove(+1)}>
          ↓
        </IconBtn>
        <IconBtn title="Delete" onClick={() => onChange(null)} danger>
          ×
        </IconBtn>
      </div>
    </div>
  );
}

function KindBadge({ kind }: { kind: string }) {
  return (
    <span className="flex-none rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      {kind}
    </span>
  );
}

function IconBtn({
  onClick,
  children,
  title,
  danger = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={
        'flex h-6 w-6 items-center justify-center rounded text-xs text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white ' +
        (danger ? 'hover:bg-red-100! hover:text-red-700! dark:hover:bg-red-950!' : '')
      }
    >
      {children}
    </button>
  );
}

function CompactInput({
  value,
  onChange,
  placeholder,
  width = 'w-28',
  mono = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  width?: string;
  mono?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      title={placeholder}
      className={
        'rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-950 ' +
        width +
        (mono ? ' font-mono' : '')
      }
    />
  );
}

function AddItemChild({ onAdd }: { onAdd: (c: ItemChild) => void }) {
  return (
    <div className="mb-2 flex flex-wrap gap-1">
      <Button variant="ghost" onClick={() => onAdd({ kind: 'label', text: 'Label' })}>
        + label
      </Button>
      <Button variant="ghost" onClick={() => onAdd({ kind: 'key', key: 'key', value: 'value' })}>
        + key
      </Button>
      <Button variant="ghost" onClick={() => onAdd({ kind: 'text', key: 'name', text: 'Name' })}>
        + text
      </Button>
      <Button
        variant="ghost"
        onClick={() =>
          onAdd({ kind: 'combo', key: 'key', text: 'Label', values: 'a,b,c', list_entries: [] })
        }
      >
        + combo
      </Button>
      <Button
        variant="ghost"
        onClick={() => onAdd({ kind: 'check', key: 'key', text: 'Label' })}
      >
        + check
      </Button>
      <Button variant="ghost" onClick={() => onAdd({ kind: 'space' })}>
        + space
      </Button>
      <Button variant="ghost" onClick={() => onAdd({ kind: 'separator' })}>
        + separator
      </Button>
    </div>
  );
}

function LeafFieldsCompact({
  node,
  onChange,
}: {
  node: ItemChild | TopLevelNode;
  onChange: (next: any) => void;
}) {
  const set = (patch: object) => onChange({ ...node, ...patch });
  switch (node.kind) {
    case 'label':
      return (
        <CompactInput
          value={node.text}
          onChange={(v) => set({ text: v })}
          placeholder="label text"
          width="flex-1 min-w-[12rem]"
        />
      );
    case 'key':
      return (
        <>
          <CompactInput
            value={node.key}
            onChange={(v) => set({ key: v })}
            placeholder="key"
            mono
          />
          <span className="text-xs text-slate-400">=</span>
          <CompactInput
            value={node.value ?? ''}
            onChange={(v) => set({ value: v })}
            placeholder="value"
            mono
          />
        </>
      );
    case 'text':
      return (
        <>
          <CompactInput
            value={node.key}
            onChange={(v) => set({ key: v })}
            placeholder="key"
            mono
          />
          <CompactInput
            value={node.text ?? ''}
            onChange={(v) => set({ text: v })}
            placeholder="label"
          />
          <CompactInput
            value={node.default ?? ''}
            onChange={(v) => set({ default: v })}
            placeholder="default"
            width="w-20"
          />
        </>
      );
    case 'combo':
      return (
        <>
          <CompactInput
            value={node.key}
            onChange={(v) => set({ key: v })}
            placeholder="key"
            mono
          />
          <CompactInput
            value={node.text ?? ''}
            onChange={(v) => set({ text: v })}
            placeholder="label"
          />
          <CompactInput
            value={node.values ?? ''}
            onChange={(v) => set({ values: v })}
            placeholder="a,b,c"
            width="flex-1 min-w-[8rem]"
            mono
          />
          <CompactInput
            value={node.default ?? ''}
            onChange={(v) => set({ default: v })}
            placeholder="default"
            width="w-20"
          />
        </>
      );
    case 'check':
      return (
        <>
          <CompactInput
            value={node.key}
            onChange={(v) => set({ key: v })}
            placeholder="key"
            mono
          />
          <CompactInput
            value={node.text ?? ''}
            onChange={(v) => set({ text: v })}
            placeholder="label"
          />
          <select
            value={node.default ?? ''}
            onChange={(e) => set({ default: e.target.value || undefined })}
            className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="">default…</option>
            <option value="on">on</option>
            <option value="off">off</option>
          </select>
        </>
      );
    case 'space':
    case 'separator':
      return <span className="text-xs italic text-slate-400">—</span>;
    default:
      return (
        <span className="text-xs italic text-slate-400">
          edit in Raw XML tab
        </span>
      );
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

// suppress unused-import warning for useMemo in future if needed
void useMemo;
