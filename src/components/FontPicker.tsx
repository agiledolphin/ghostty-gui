import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Props {
  current: string;
  onApply: (font: string) => void;
  onClose: () => void;
}

const SAMPLE_TEXT = "The quick brown fox jumps over the lazy dog  0123456789";
const MONO_SAMPLE = "function hello() {\n  return 'world'; // comment\n}";

export function FontPicker({ current, onApply, onClose }: Props) {
  const [fonts, setFonts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(current);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    invoke<string[]>("list_fonts")
      .then((f) => { setFonts(f); setLoading(false); })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, []);

  // Scroll active item into view when fonts load
  useEffect(() => {
    if (!loading && fonts.length > 0 && current) {
      const idx = filtered.findIndex((f) => f === selected);
      if (idx >= 0 && listRef.current) {
        const item = listRef.current.children[idx] as HTMLElement;
        item?.scrollIntoView({ block: "center" });
      }
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = query
    ? fonts.filter((f) => f.toLowerCase().includes(query.toLowerCase()))
    : fonts;

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Enter" && selected) { onApply(selected); onClose(); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const idx = filtered.indexOf(selected);
        const next =
          e.key === "ArrowDown"
            ? Math.min(idx + 1, filtered.length - 1)
            : Math.max(idx - 1, 0);
        setSelected(filtered[next]);
        const item = listRef.current?.children[next] as HTMLElement;
        item?.scrollIntoView({ block: "nearest" });
      }
    },
    [filtered, selected, onApply, onClose]
  );

  return (
    <div
      className="font-picker-overlay"
      tabIndex={-1}
      onKeyDown={handleKey}
    >
      {/* Header */}
      <div className="tp-header">
        <span className="tp-header-title">选择字体</span>
        <input
          className="tp-search"
          placeholder="搜索字体…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="tp-header-actions">
          <button
            className="btn btn--primary"
            disabled={!selected}
            onClick={() => { onApply(selected); onClose(); }}
          >
            应用
          </button>
          <button className="btn btn--secondary" onClick={onClose}>
            取消
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="tp-body-layout">
        {/* Font list */}
        <div className="tp-list" ref={listRef}>
          {loading && <div className="tp-loading">加载系统字体中…</div>}
          {error && <div className="tp-error">{error}</div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="tp-loading">无匹配字体</div>
          )}
          {filtered.map((name) => (
            <div
              key={name}
              className={`tp-item${name === selected ? " tp-item--active" : ""}`}
              onClick={() => setSelected(name)}
              onDoubleClick={() => { onApply(name); onClose(); }}
            >
              <span className="tp-item-name">{name}</span>
            </div>
          ))}
        </div>

        {/* Preview panel */}
        <div className="font-picker-preview">
          {selected ? (
            <>
              <div className="font-picker-preview-name">{selected}</div>
              <div className="font-picker-samples">
                <div className="font-picker-sample-label">普通文本</div>
                <div
                  className="font-picker-sample-text"
                  style={{ fontFamily: `"${selected}", sans-serif` }}
                >
                  {SAMPLE_TEXT}
                </div>
                <div className="font-picker-sample-label">代码示例</div>
                <pre
                  className="font-picker-sample-code"
                  style={{ fontFamily: `"${selected}", monospace` }}
                >
                  {MONO_SAMPLE}
                </pre>
                <div className="font-picker-size-row">
                  {[10, 12, 14, 16, 20, 24].map((size) => (
                    <span
                      key={size}
                      className="font-picker-size-sample"
                      style={{ fontFamily: `"${selected}", monospace`, fontSize: size }}
                    >
                      Aa {size}px
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="tp-preview-empty">从左侧选择字体</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="tp-footer">
        <span>↑↓ 导航</span>
        <span>Enter 应用</span>
        <span>Esc 关闭</span>
        <span>双击直接应用</span>
        <span className="tp-count">{filtered.length} / {fonts.length} 个字体</span>
      </div>
    </div>
  );
}
