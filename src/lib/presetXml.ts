// JOSM tagging preset XML <-> typed model.
// Schema reference: https://josm.openstreetmap.de/wiki/TaggingPresets
// Namespace: http://josm.openstreetmap.de/tagging-preset-1.0
//
// Design notes:
//  - The typed model covers common elements (group, item, key/text/combo/
//    multiselect/check, label, space, separator, link, preset_link, optional,
//    roles/role, chunk, reference).
//  - Any element we don't recognize is preserved as a RawNode so round-tripping
//    an unknown preset doesn't silently drop data.
//  - Attribute order and whitespace are NOT preserved. If users need byte-exact
//    round-trip, they should use the raw XML tab.

export const PRESET_NS = 'http://josm.openstreetmap.de/tagging-preset-1.0';

export interface PresetsRoot {
  author?: string;
  version?: string;
  description?: string;
  shortdescription?: string;
  link?: string;
  icon?: string;
  baselanguage?: string;
  children: TopLevelNode[];
}

export type TopLevelNode = GroupNode | ItemNode | ChunkNode | RawNode;
export type ItemChild =
  | KeyNode
  | TextNode
  | ComboNode
  | MultiselectNode
  | CheckNode
  | LabelNode
  | SpaceNode
  | SeparatorNode
  | OptionalNode
  | LinkNode
  | PresetLinkNode
  | RolesNode
  | ReferenceNode
  | RawNode;

export interface GroupNode {
  kind: 'group';
  name: string;
  icon?: string;
  children: TopLevelNode[];
}

export interface ItemNode {
  kind: 'item';
  name: string;
  type?: string;
  preset_name_label?: string;
  icon?: string;
  name_template?: string;
  match_expression?: string;
  children: ItemChild[];
}

export interface ChunkNode {
  kind: 'chunk';
  id: string;
  children: ItemChild[];
}

export interface ReferenceNode {
  kind: 'reference';
  ref: string;
}

export interface KeyNode {
  kind: 'key';
  key: string;
  value?: string;
  match?: string;
}

export interface TextNode {
  kind: 'text';
  key: string;
  text?: string;
  default?: string;
  length?: string;
  use_last_as_default?: string;
  match?: string;
}

export interface ComboNode {
  kind: 'combo';
  key: string;
  text?: string;
  values?: string;
  default?: string;
  editable?: string;
  delimiter?: string;
  display_values?: string;
  short_descriptions?: string;
  values_sort?: string;
  match?: string;
  list_entries: ListEntry[];
}

export interface MultiselectNode {
  kind: 'multiselect';
  key: string;
  text?: string;
  values?: string;
  default?: string;
  delimiter?: string;
  display_values?: string;
  short_descriptions?: string;
  rows?: string;
  match?: string;
  list_entries: ListEntry[];
}

export interface ListEntry {
  value?: string;
  display_value?: string;
  short_description?: string;
  icon?: string;
}

export interface CheckNode {
  kind: 'check';
  key: string;
  text?: string;
  default?: string;
  value_on?: string;
  value_off?: string;
  disable_off?: string;
  match?: string;
}

export interface LabelNode {
  kind: 'label';
  text: string;
  icon?: string;
}

export interface SpaceNode {
  kind: 'space';
}

export interface SeparatorNode {
  kind: 'separator';
}

export interface OptionalNode {
  kind: 'optional';
  text?: string;
  children: ItemChild[];
}

export interface LinkNode {
  kind: 'link';
  wiki?: string;
  href?: string;
}

export interface PresetLinkNode {
  kind: 'preset_link';
  preset_name: string;
  text?: string;
}

export interface RolesNode {
  kind: 'roles';
  roles: RoleEntry[];
}

export interface RoleEntry {
  key: string;
  text?: string;
  requisite?: string;
  count?: string;
  type?: string;
  member_expression?: string;
  regexp?: string;
}

/** Preserve unknown elements verbatim (as serializable structure) so we don't lose data. */
export interface RawNode {
  kind: 'raw';
  tag: string;
  attrs: Record<string, string>;
  children: (RawNode | { kind: 'text'; value: string })[];
}

// --- Parsing --------------------------------------------------------------

export function parsePresetXml(xml: string): PresetsRoot {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const errNode = doc.querySelector('parsererror');
  if (errNode) {
    throw new Error(`XML parse error: ${errNode.textContent?.slice(0, 200) ?? 'unknown'}`);
  }
  const root = doc.documentElement;
  if (root.localName !== 'presets') {
    throw new Error(`Expected <presets> root, got <${root.localName}>`);
  }
  return {
    author: attr(root, 'author'),
    version: attr(root, 'version'),
    description: attr(root, 'description'),
    shortdescription: attr(root, 'shortdescription'),
    link: attr(root, 'link'),
    icon: attr(root, 'icon'),
    baselanguage: attr(root, 'baselanguage'),
    children: childElements(root).map(parseTopLevel),
  };
}

function attr(el: Element, name: string): string | undefined {
  const v = el.getAttribute(name);
  return v == null ? undefined : v;
}

function childElements(el: Element): Element[] {
  const out: Element[] = [];
  for (const c of el.childNodes) {
    if (c.nodeType === Node.ELEMENT_NODE) out.push(c as Element);
  }
  return out;
}

function parseTopLevel(el: Element): TopLevelNode {
  switch (el.localName) {
    case 'group':
      return {
        kind: 'group',
        name: attr(el, 'name') ?? '',
        icon: attr(el, 'icon'),
        children: childElements(el).map(parseTopLevel),
      };
    case 'item':
      return parseItem(el);
    case 'chunk':
      return {
        kind: 'chunk',
        id: attr(el, 'id') ?? '',
        children: childElements(el).map(parseItemChild),
      };
    default:
      return parseRaw(el);
  }
}

function parseItem(el: Element): ItemNode {
  return {
    kind: 'item',
    name: attr(el, 'name') ?? '',
    type: attr(el, 'type'),
    preset_name_label: attr(el, 'preset_name_label'),
    icon: attr(el, 'icon'),
    name_template: attr(el, 'name_template'),
    match_expression: attr(el, 'match_expression'),
    children: childElements(el).map(parseItemChild),
  };
}

function parseItemChild(el: Element): ItemChild {
  switch (el.localName) {
    case 'key':
      return {
        kind: 'key',
        key: attr(el, 'key') ?? '',
        value: attr(el, 'value'),
        match: attr(el, 'match'),
      };
    case 'text':
      return {
        kind: 'text',
        key: attr(el, 'key') ?? '',
        text: attr(el, 'text'),
        default: attr(el, 'default'),
        length: attr(el, 'length'),
        use_last_as_default: attr(el, 'use_last_as_default'),
        match: attr(el, 'match'),
      };
    case 'combo':
      return {
        kind: 'combo',
        key: attr(el, 'key') ?? '',
        text: attr(el, 'text'),
        values: attr(el, 'values'),
        default: attr(el, 'default'),
        editable: attr(el, 'editable'),
        delimiter: attr(el, 'delimiter'),
        display_values: attr(el, 'display_values'),
        short_descriptions: attr(el, 'short_descriptions'),
        values_sort: attr(el, 'values_sort'),
        match: attr(el, 'match'),
        list_entries: childElements(el)
          .filter((c) => c.localName === 'list_entry')
          .map(parseListEntry),
      };
    case 'multiselect':
      return {
        kind: 'multiselect',
        key: attr(el, 'key') ?? '',
        text: attr(el, 'text'),
        values: attr(el, 'values'),
        default: attr(el, 'default'),
        delimiter: attr(el, 'delimiter'),
        display_values: attr(el, 'display_values'),
        short_descriptions: attr(el, 'short_descriptions'),
        rows: attr(el, 'rows'),
        match: attr(el, 'match'),
        list_entries: childElements(el)
          .filter((c) => c.localName === 'list_entry')
          .map(parseListEntry),
      };
    case 'check':
      return {
        kind: 'check',
        key: attr(el, 'key') ?? '',
        text: attr(el, 'text'),
        default: attr(el, 'default'),
        value_on: attr(el, 'value_on'),
        value_off: attr(el, 'value_off'),
        disable_off: attr(el, 'disable_off'),
        match: attr(el, 'match'),
      };
    case 'label':
      return { kind: 'label', text: attr(el, 'text') ?? '', icon: attr(el, 'icon') };
    case 'space':
      return { kind: 'space' };
    case 'separator':
      return { kind: 'separator' };
    case 'optional':
      return {
        kind: 'optional',
        text: attr(el, 'text'),
        children: childElements(el).map(parseItemChild),
      };
    case 'link':
      return { kind: 'link', wiki: attr(el, 'wiki'), href: attr(el, 'href') };
    case 'preset_link':
      return {
        kind: 'preset_link',
        preset_name: attr(el, 'preset_name') ?? '',
        text: attr(el, 'text'),
      };
    case 'roles':
      return {
        kind: 'roles',
        roles: childElements(el)
          .filter((c) => c.localName === 'role')
          .map((r) => ({
            key: attr(r, 'key') ?? '',
            text: attr(r, 'text'),
            requisite: attr(r, 'requisite'),
            count: attr(r, 'count'),
            type: attr(r, 'type'),
            member_expression: attr(r, 'member_expression'),
            regexp: attr(r, 'regexp'),
          })),
      };
    case 'reference':
      return { kind: 'reference', ref: attr(el, 'ref') ?? '' };
    default:
      return parseRaw(el);
  }
}

function parseListEntry(el: Element): ListEntry {
  return {
    value: attr(el, 'value'),
    display_value: attr(el, 'display_value'),
    short_description: attr(el, 'short_description'),
    icon: attr(el, 'icon'),
  };
}

function parseRaw(el: Element): RawNode {
  const attrs: Record<string, string> = {};
  for (const a of el.attributes) attrs[a.name] = a.value;
  const children: RawNode['children'] = [];
  for (const c of el.childNodes) {
    if (c.nodeType === Node.ELEMENT_NODE) {
      children.push(parseRaw(c as Element));
    } else if (c.nodeType === Node.TEXT_NODE) {
      const v = c.nodeValue ?? '';
      if (v.trim()) children.push({ kind: 'text', value: v });
    }
  }
  return { kind: 'raw', tag: el.localName, attrs, children };
}

// --- Serialization --------------------------------------------------------

export function serializePresetXml(root: PresetsRoot): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  const rootAttrs: Record<string, string | undefined> = {
    xmlns: PRESET_NS,
    author: root.author,
    version: root.version,
    description: root.description,
    shortdescription: root.shortdescription,
    link: root.link,
    icon: root.icon,
    baselanguage: root.baselanguage,
  };
  if (root.children.length === 0) {
    lines.push(`<presets${renderAttrs(rootAttrs)} />`);
  } else {
    lines.push(`<presets${renderAttrs(rootAttrs)}>`);
    for (const c of root.children) lines.push(...renderNode(c, 1));
    lines.push('</presets>');
  }
  return lines.join('\n') + '\n';
}

function renderNode(node: TopLevelNode | ItemChild, depth: number): string[] {
  const pad = '  '.repeat(depth);
  switch (node.kind) {
    case 'group': {
      const attrs = { name: node.name, icon: node.icon };
      if (node.children.length === 0) return [`${pad}<group${renderAttrs(attrs)} />`];
      const out = [`${pad}<group${renderAttrs(attrs)}>`];
      for (const c of node.children) out.push(...renderNode(c, depth + 1));
      out.push(`${pad}</group>`);
      return out;
    }
    case 'item': {
      const attrs = {
        name: node.name,
        type: node.type,
        preset_name_label: node.preset_name_label,
        icon: node.icon,
        name_template: node.name_template,
        match_expression: node.match_expression,
      };
      if (node.children.length === 0) return [`${pad}<item${renderAttrs(attrs)} />`];
      const out = [`${pad}<item${renderAttrs(attrs)}>`];
      for (const c of node.children) out.push(...renderNode(c, depth + 1));
      out.push(`${pad}</item>`);
      return out;
    }
    case 'chunk': {
      const out = [`${pad}<chunk${renderAttrs({ id: node.id })}>`];
      for (const c of node.children) out.push(...renderNode(c, depth + 1));
      out.push(`${pad}</chunk>`);
      return out;
    }
    case 'reference':
      return [`${pad}<reference${renderAttrs({ ref: node.ref })} />`];
    case 'key':
      return [
        `${pad}<key${renderAttrs({ key: node.key, value: node.value, match: node.match })} />`,
      ];
    case 'text':
      return [
        `${pad}<text${renderAttrs({
          key: node.key,
          text: node.text,
          default: node.default,
          length: node.length,
          use_last_as_default: node.use_last_as_default,
          match: node.match,
        })} />`,
      ];
    case 'combo': {
      const attrs = {
        key: node.key,
        text: node.text,
        values: node.values,
        default: node.default,
        editable: node.editable,
        delimiter: node.delimiter,
        display_values: node.display_values,
        short_descriptions: node.short_descriptions,
        values_sort: node.values_sort,
        match: node.match,
      };
      if (node.list_entries.length === 0) return [`${pad}<combo${renderAttrs(attrs)} />`];
      const out = [`${pad}<combo${renderAttrs(attrs)}>`];
      for (const e of node.list_entries) {
        out.push(`${pad}  <list_entry${renderAttrs(e)} />`);
      }
      out.push(`${pad}</combo>`);
      return out;
    }
    case 'multiselect': {
      const attrs = {
        key: node.key,
        text: node.text,
        values: node.values,
        default: node.default,
        delimiter: node.delimiter,
        display_values: node.display_values,
        short_descriptions: node.short_descriptions,
        rows: node.rows,
        match: node.match,
      };
      if (node.list_entries.length === 0) return [`${pad}<multiselect${renderAttrs(attrs)} />`];
      const out = [`${pad}<multiselect${renderAttrs(attrs)}>`];
      for (const e of node.list_entries) {
        out.push(`${pad}  <list_entry${renderAttrs(e)} />`);
      }
      out.push(`${pad}</multiselect>`);
      return out;
    }
    case 'check':
      return [
        `${pad}<check${renderAttrs({
          key: node.key,
          text: node.text,
          default: node.default,
          value_on: node.value_on,
          value_off: node.value_off,
          disable_off: node.disable_off,
          match: node.match,
        })} />`,
      ];
    case 'label':
      return [`${pad}<label${renderAttrs({ text: node.text, icon: node.icon })} />`];
    case 'space':
      return [`${pad}<space />`];
    case 'separator':
      return [`${pad}<separator />`];
    case 'optional': {
      if (node.children.length === 0)
        return [`${pad}<optional${renderAttrs({ text: node.text })} />`];
      const out = [`${pad}<optional${renderAttrs({ text: node.text })}>`];
      for (const c of node.children) out.push(...renderNode(c, depth + 1));
      out.push(`${pad}</optional>`);
      return out;
    }
    case 'link':
      return [`${pad}<link${renderAttrs({ wiki: node.wiki, href: node.href })} />`];
    case 'preset_link':
      return [
        `${pad}<preset_link${renderAttrs({
          preset_name: node.preset_name,
          text: node.text,
        })} />`,
      ];
    case 'roles': {
      if (node.roles.length === 0) return [`${pad}<roles />`];
      const out = [`${pad}<roles>`];
      for (const r of node.roles) out.push(`${pad}  <role${renderAttrs(r)} />`);
      out.push(`${pad}</roles>`);
      return out;
    }
    case 'raw':
      return renderRaw(node, depth);
  }
}

function renderRaw(node: RawNode, depth: number): string[] {
  const pad = '  '.repeat(depth);
  const attrs = renderAttrs(node.attrs);
  const elChildren = node.children.filter((c) => c.kind === 'raw');
  const textChildren = node.children.filter((c) => c.kind === 'text');
  if (elChildren.length === 0 && textChildren.length === 0) {
    return [`${pad}<${node.tag}${attrs} />`];
  }
  const out = [`${pad}<${node.tag}${attrs}>`];
  for (const c of node.children) {
    if (c.kind === 'raw') out.push(...renderRaw(c, depth + 1));
    else out.push('  '.repeat(depth + 1) + escapeXml(c.value));
  }
  out.push(`${pad}</${node.tag}>`);
  return out;
}

function renderAttrs(attrs: object): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    parts.push(` ${k}="${escapeXml(String(v))}"`);
  }
  return parts.join('');
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// --- Factory helpers ------------------------------------------------------

export function emptyPreset(): PresetsRoot {
  return {
    version: '0.1',
    children: [
      {
        kind: 'group',
        name: 'My Preset Group',
        children: [
          {
            kind: 'item',
            name: 'My Item',
            type: 'node,way',
            children: [
              { kind: 'label', text: 'Edit tags:' },
              { kind: 'key', key: 'example', value: 'yes' },
              { kind: 'text', key: 'name', text: 'Name' },
            ],
          },
        ],
      },
    ],
  };
}
