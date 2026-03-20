import { useState, useEffect, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ThemePreview, ThemeColors } from "./ThemePreview";

// ── Value helpers ────────────────────────────────────────────────────────────

type Mode = "single" | "adaptive";

interface ThemeState {
  mode: Mode;
  single: string;
  light: string;
  dark: string;
}

function parseValue(raw: string): ThemeState {
  if (raw.includes("light:") || raw.includes("dark:")) {
    const lm = raw.match(/light:([^,]+)/);
    const dm = raw.match(/dark:([^,]+)/);
    return {
      mode: "adaptive",
      single: "",
      light: lm?.[1]?.trim() ?? "",
      dark: dm?.[1]?.trim() ?? "",
    };
  }
  return { mode: "single", single: raw, light: "", dark: "" };
}

function buildValue(s: ThemeState): string {
  if (s.mode === "adaptive") {
    if (s.light && s.dark) return `light:${s.light},dark:${s.dark}`;
    if (s.light) return `light:${s.light}`;
    if (s.dark) return `dark:${s.dark}`;
    return "";
  }
  return s.single;
}

// ── ThemeList sub-component ──────────────────────────────────────────────────

interface ListProps {
  themes: Record<string, ThemeColors>;
  filtered: string[];
  selected: string;
  hovered: string;
  loading: boolean;
  error: string | null;
  onHover: (name: string) => void;
  onSelect: (name: string) => void;
  onDoubleClick: (name: string) => void;
}

function ThemeList({
  themes, filtered, selected, hovered, loading, error,
  onHover, onSelect, onDoubleClick,
}: ListProps) {
  return (
    <>
      {loading && <div className="tp-loading">加载主题中…</div>}
      {error && <div className="tp-error">{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="tp-loading">未找到匹配主题</div>
      )}
      {filtered.map((name) => {
        const t = themes[name];
        const isActive = name === selected;
        const isHovered = name === hovered;
        return (
          <div
            key={name}
            data-theme={name}
            className={`tp-item ${isActive ? "tp-item--active" : ""} ${isHovered && !isActive ? "tp-item--hovered" : ""}`}
            onMouseEnter={() => onHover(name)}
            onClick={() => onSelect(name)}
            onDoubleClick={() => onDoubleClick(name)}
          >
            <span className="tp-item-name">{name}</span>
            <span className="tp-item-swatches">
              {t?.palette.slice(1, 9).map((c, i) => (
                <span key={i} className="tp-swatch" style={{ background: `#${c}` }} />
              ))}
            </span>
          </div>
        );
      })}
    </>
  );
}

// ── Main ThemePicker ─────────────────────────────────────────────────────────

interface Props {
  current: string;
  onApply: (value: string) => void;
  onClose: () => void;
}

export function ThemePicker({ current, onApply, onClose }: Props) {
  const [themes, setThemes] = useState<Record<string, ThemeColors>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Parse current value into structured state
  const [state, setState] = useState<ThemeState>(() => parseValue(current));

  // Which slot is being edited in adaptive mode
  const [activeSlot, setActiveSlot] = useState<"light" | "dark">("light");

  // Hovered name (for preview)
  const [hovered, setHovered] = useState<string>("");

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    invoke<Record<string, ThemeColors>>("get_all_themes")
      .then((data) => {
        setThemes(data);
        setLoading(false);
        // Scroll to current theme
        const current = state.mode === "single" ? state.single : (state.light || state.dark);
        if (current) {
          setTimeout(() => {
            document.querySelector(`[data-theme="${CSS.escape(current)}"]`)
              ?.scrollIntoView({ block: "center" });
          }, 80);
        }
      })
      .catch((e) => { setError(String(e)); setLoading(false); });

    setTimeout(() => searchRef.current?.focus(), 50);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sortedNames = useMemo(() => Object.keys(themes).sort(), [themes]);
  const filtered = useMemo(() => {
    if (!query.trim()) return sortedNames;
    const q = query.toLowerCase();
    return sortedNames.filter((n) => n.toLowerCase().includes(q));
  }, [sortedNames, query]);

  // Currently selected name for the active context
  const currentSelected = state.mode === "single"
    ? state.single
    : (activeSlot === "light" ? state.light : state.dark);

  const previewName = hovered || currentSelected;

  function handleSelect(name: string) {
    setHovered(name);
    if (state.mode === "single") {
      setState((s) => ({ ...s, single: name }));
    } else if (activeSlot === "light") {
      setState((s) => ({ ...s, light: name }));
    } else {
      setState((s) => ({ ...s, dark: name }));
    }
  }

  function handleDoubleClick(name: string) {
    handleSelect(name);
    const next = state.mode === "single"
      ? { ...state, single: name }
      : activeSlot === "light"
        ? { ...state, light: name }
        : { ...state, dark: name };
    onApply(buildValue(next));
    onClose();
  }

  function handleApply() {
    onApply(buildValue(state));
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "Enter") { handleApply(); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const idx = filtered.indexOf(previewName);
      const next = e.key === "ArrowDown"
        ? Math.min(idx + 1, filtered.length - 1)
        : Math.max(idx - 1, 0);
      const name = filtered[next];
      handleSelect(name);
      document.querySelector(`[data-theme="${CSS.escape(name)}"]`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }

  const canApply = state.mode === "single" ? !!state.single
    : (!!state.light || !!state.dark);

  const lightColors = themes[state.light] ?? null;
  const darkColors  = themes[state.dark]  ?? null;
  const singleColors = themes[previewName] ?? null;

  return (
    <div className="theme-picker-overlay" onKeyDown={handleKeyDown} tabIndex={-1}>

      {/* ── Header ── */}
      <div className="tp-header">
        <span className="tp-header-title">选择主题</span>

        {/* Mode toggle */}
        <div className="tp-mode-toggle">
          <button
            className={`tp-mode-btn ${state.mode === "single" ? "tp-mode-btn--active" : ""}`}
            onClick={() => setState((s) => ({ ...s, mode: "single" }))}
          >
            单一主题
          </button>
          <button
            className={`tp-mode-btn ${state.mode === "adaptive" ? "tp-mode-btn--active" : ""}`}
            onClick={() => setState((s) => ({ ...s, mode: "adaptive" }))}
          >
            🌗 跟随系统
          </button>
        </div>

        <input
          ref={searchRef}
          className="tp-search"
          type="search"
          placeholder="搜索主题..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="tp-header-actions">
          <button className="btn btn--ghost" onClick={onClose}>取消</button>
          <button className="btn btn--primary" disabled={!canApply} onClick={handleApply}>
            应用
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="tp-body-layout">

        {/* Left: list + slot tabs (adaptive mode) */}
        <div className="tp-list-col">
          {state.mode === "adaptive" && (
            <div className="tp-slot-tabs">
              <button
                className={`tp-slot-tab ${activeSlot === "light" ? "tp-slot-tab--active" : ""}`}
                onClick={() => setActiveSlot("light")}
              >
                ☀️ 浅色
                {state.light && (
                  <span className="tp-slot-name"> · {state.light}</span>
                )}
              </button>
              <button
                className={`tp-slot-tab ${activeSlot === "dark" ? "tp-slot-tab--active" : ""}`}
                onClick={() => setActiveSlot("dark")}
              >
                🌙 深色
                {state.dark && (
                  <span className="tp-slot-name"> · {state.dark}</span>
                )}
              </button>
            </div>
          )}
          <div className="tp-list" onMouseLeave={() => setHovered("")}>
            <ThemeList
              themes={themes}
              filtered={filtered}
              selected={currentSelected}
              hovered={hovered}
              loading={loading}
              error={error}
              onHover={setHovered}
              onSelect={handleSelect}
              onDoubleClick={handleDoubleClick}
            />
          </div>
        </div>

        {/* Right: preview panel */}
        <div className="tp-preview-panel">
          {state.mode === "single" ? (
            singleColors ? (
              <>
                <div className="tp-preview-name">{previewName}</div>
                <ThemePreview colors={singleColors} name={previewName} />
              </>
            ) : (
              <div className="tp-preview-empty">
                {loading ? "加载中…" : "悬停主题以预览"}
              </div>
            )
          ) : (
            /* Adaptive mode: show both light and dark previews */
            <div className="tp-dual-preview">
              <div className="tp-dual-col">
                <div className="tp-dual-label tp-dual-label--light">☀️ 浅色主题</div>
                {lightColors ? (
                  <ThemePreview
                    colors={activeSlot === "light" && themes[previewName]
                      ? themes[previewName]
                      : lightColors}
                    name={activeSlot === "light" ? (previewName || state.light) : state.light}
                  />
                ) : (
                  <div className="tp-preview-empty tp-preview-empty--sm">
                    {activeSlot === "light" ? "从列表中选择浅色主题" : "未设置"}
                  </div>
                )}
              </div>
              <div className="tp-dual-col">
                <div className="tp-dual-label tp-dual-label--dark">🌙 深色主题</div>
                {darkColors ? (
                  <ThemePreview
                    colors={activeSlot === "dark" && themes[previewName]
                      ? themes[previewName]
                      : darkColors}
                    name={activeSlot === "dark" ? (previewName || state.dark) : state.dark}
                  />
                ) : (
                  <div className="tp-preview-empty tp-preview-empty--sm">
                    {activeSlot === "dark" ? "从列表中选择深色主题" : "未设置"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="tp-footer">
        {state.mode === "adaptive" && (
          <span className="tp-footer-value">
            {buildValue(state) || "—"}
          </span>
        )}
        <span>↑↓ 导航</span>
        <span>Enter 应用</span>
        <span>Esc 关闭</span>
        <span>双击 直接应用</span>
        <span className="tp-count">{filtered.length} / {sortedNames.length} 个主题</span>
      </div>
    </div>
  );
}
