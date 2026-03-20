import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ThemePicker } from "../ThemePicker";
import { ThemeColors } from "../ThemePreview";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

interface Parsed {
  mode: "single" | "adaptive";
  single: string;
  light: string;
  dark: string;
}

function parseValue(raw: string): Parsed {
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

export function ThemeField({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [lightColors, setLightColors]   = useState<ThemeColors | null>(null);
  const [darkColors,  setDarkColors]    = useState<ThemeColors | null>(null);
  const [singleColors, setSingleColors] = useState<ThemeColors | null>(null);

  const parsed = parseValue(value);

  useEffect(() => {
    let cancelled = false;
    const loadOne = (name: string): Promise<ThemeColors | null> =>
      name
        ? invoke<ThemeColors>("get_theme", { name }).catch(() => null)
        : Promise.resolve(null);

    if (parsed.mode === "single") {
      loadOne(parsed.single).then((c) => { if (!cancelled) setSingleColors(c); });
    } else {
      loadOne(parsed.light).then((c) => { if (!cancelled) setLightColors(c); });
      loadOne(parsed.dark).then((c)  => { if (!cancelled) setDarkColors(c); });
    }
    return () => { cancelled = true; };
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const swatches = (colors: ThemeColors | null) =>
    colors?.palette.slice(1, 9).map((c, i) => (
      <span key={i} className="tp-swatch" style={{ background: `#${c}` }} />
    ));

  return (
    <>
      <div className="field-row">
        <div className="field-info">
          <label className="field-label">theme</label>
          <p className="field-desc">
            配色主题。支持单一主题，或使用"跟随系统"模式分别指定浅色/深色主题。
          </p>
        </div>

        <div className="theme-field-control">
          {parsed.mode === "single" ? (
            /* ── Single mode ── */
            <>
              {singleColors && (
                <span className="theme-field-swatches">{swatches(singleColors)}</span>
              )}
              <span className="theme-field-name">
                {parsed.single || <span style={{ opacity: 0.4 }}>未设置</span>}
              </span>
            </>
          ) : (
            /* ── Adaptive mode ── */
            <div className="theme-field-adaptive">
              <div className="theme-field-slot">
                <span className="theme-field-slot-label">☀️</span>
                {lightColors && (
                  <span className="theme-field-swatches">{swatches(lightColors)}</span>
                )}
                <span className="theme-field-name">
                  {parsed.light || <span style={{ opacity: 0.4 }}>未设置</span>}
                </span>
              </div>
              <div className="theme-field-slot">
                <span className="theme-field-slot-label">🌙</span>
                {darkColors && (
                  <span className="theme-field-swatches">{swatches(darkColors)}</span>
                )}
                <span className="theme-field-name">
                  {parsed.dark || <span style={{ opacity: 0.4 }}>未设置</span>}
                </span>
              </div>
            </div>
          )}

          <button className="btn btn--secondary" onClick={() => setOpen(true)}>
            选择主题…
          </button>
        </div>
      </div>

      {open && (
        <ThemePicker
          current={value}
          onApply={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
