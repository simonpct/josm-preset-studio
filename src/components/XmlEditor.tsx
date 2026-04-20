import CodeMirror from '@uiw/react-codemirror';
import { xml } from '@codemirror/lang-xml';

export function XmlEditor({
  value,
  onChange,
  readOnly = false,
}: {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
      <CodeMirror
        value={value}
        height="60vh"
        extensions={[xml()]}
        onChange={(v) => onChange?.(v)}
        editable={!readOnly}
        basicSetup={{ lineNumbers: true, foldGutter: true }}
      />
    </div>
  );
}
