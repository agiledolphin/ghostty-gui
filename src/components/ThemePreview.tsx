export interface ThemeColors {
  background: string;       // hex without #
  foreground: string;
  palette: string[];        // 16 hex colors without #
  cursor_color: string | null;
  selection_background: string | null;
  selection_foreground: string | null;
}

interface Props {
  colors: ThemeColors;
  name?: string;
}

function hex(c: string) {
  return `#${c}`;
}

export function ThemePreview({ colors, name }: Props) {
  const p = colors.palette;
  const bg = hex(colors.background);
  const fg = hex(colors.foreground);
  // Use bright variants (8–15) when available; fall back to regular
  const green   = hex(p[10] ?? p[2] ?? "50fa7b");
  const blue    = hex(p[12] ?? p[4] ?? "8be9fd");
  const magenta = hex(p[13] ?? p[5] ?? "ff79c6");
  const cyan    = hex(p[14] ?? p[6] ?? "8be9fd");
  const red     = hex(p[9]  ?? p[1] ?? "ff5555");
  const yellow  = hex(p[11] ?? p[3] ?? "f1fa8c");
  const dim     = hex(p[8]  ?? p[0] ?? "6272a4");
  const cursor  = colors.cursor_color ? hex(colors.cursor_color) : green;

  // Slightly lighten/darken bg for title bar — use CSS filter
  const titleBg = colors.background;

  return (
    <div className="theme-preview" style={{ background: bg, color: fg }}>
      {/* ── Window chrome ── */}
      <div className="tp-titlebar" style={{ background: `color-mix(in srgb, #${titleBg} 80%, #fff 20%)` }}>
        <span className="tp-dot" style={{ background: "#ff5f57" }} />
        <span className="tp-dot" style={{ background: "#febc2e" }} />
        <span className="tp-dot" style={{ background: "#28c840" }} />
        <span className="tp-title" style={{ color: fg, opacity: 0.6 }}>
          {name ? `${name} — zsh` : "ghostty — zsh"}
        </span>
      </div>

      {/* ── Terminal content ── */}
      <div className="tp-body">

        {/* Line 1: prompt */}
        <div className="tp-line">
          <span style={{ color: green }}>jiaming@MacBook-Pro</span>
          <span style={{ color: fg }}> </span>
          <span style={{ color: blue }}>~/projects/ghostty-gui</span>
          <span style={{ color: fg }}> on </span>
          <span style={{ color: magenta }}> main</span>
          <span style={{ color: green }}> ✓</span>
        </div>

        {/* Line 2: ls command */}
        <div className="tp-line">
          <span style={{ color: green }}>❯</span>
          <span style={{ color: fg }}> ls src/</span>
        </div>

        {/* Line 3–6: ls output */}
        <div className="tp-line">
          <span style={{ color: blue }}>components/</span>
          <span style={{ color: fg }}>  </span>
          <span style={{ color: blue }}>store/</span>
          <span style={{ color: fg }}>  App.tsx  App.css  main.tsx</span>
        </div>

        <div className="tp-line">&nbsp;</div>

        {/* Line 7: prompt */}
        <div className="tp-line">
          <span style={{ color: green }}>jiaming@MacBook-Pro</span>
          <span style={{ color: fg }}> </span>
          <span style={{ color: blue }}>~/projects/ghostty-gui</span>
          <span style={{ color: fg }}> on </span>
          <span style={{ color: magenta }}> main</span>
          <span style={{ color: green }}> ✓</span>
        </div>

        {/* Line 8: git diff */}
        <div className="tp-line">
          <span style={{ color: green }}>❯</span>
          <span style={{ color: fg }}> git diff --stat</span>
        </div>

        {/* diff stats */}
        <div className="tp-line">
          <span style={{ color: cyan }}>src/App.tsx</span>
          <span style={{ color: dim }}>  | 12 </span>
          <span style={{ color: green }}>++++++</span>
          <span style={{ color: red }}>------</span>
        </div>
        <div className="tp-line">
          <span style={{ color: cyan }}>src/App.css</span>
          <span style={{ color: dim }}>  |  8 </span>
          <span style={{ color: green }}>+++++</span>
          <span style={{ color: red }}>---</span>
        </div>
        <div className="tp-line">
          <span style={{ color: dim }}>2 files changed, </span>
          <span style={{ color: green }}>11 insertions(+)</span>
          <span style={{ color: dim }}>, </span>
          <span style={{ color: red }}>9 deletions(-)</span>
        </div>

        <div className="tp-line">&nbsp;</div>

        {/* palette row */}
        <div className="tp-line">
          <span style={{ color: dim }}>palette  </span>
          {p.slice(0, 8).map((c, i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                width: "1.1em",
                height: "1.1em",
                background: `#${c}`,
                borderRadius: "2px",
                marginRight: "2px",
                verticalAlign: "middle",
              }}
            />
          ))}
        </div>

        <div className="tp-line">&nbsp;</div>

        {/* echo */}
        <div className="tp-line">
          <span style={{ color: green }}>jiaming@MacBook-Pro</span>
          <span style={{ color: fg }}> </span>
          <span style={{ color: blue }}>~/projects/ghostty-gui</span>
          <span style={{ color: fg }}> on </span>
          <span style={{ color: magenta }}> main</span>
          <span style={{ color: green }}> ✓</span>
        </div>
        <div className="tp-line">
          <span style={{ color: green }}>❯</span>
          <span style={{ color: fg }}> echo </span>
          <span style={{ color: yellow }}>"Hello, Ghostty!"</span>
        </div>
        <div className="tp-line">
          <span style={{ color: fg }}>Hello, Ghostty!</span>
        </div>

        <div className="tp-line">&nbsp;</div>

        {/* cursor line */}
        <div className="tp-line">
          <span style={{ color: green }}>❯</span>
          <span style={{ color: fg }}> </span>
          <span
            className="tp-cursor"
            style={{ background: cursor, color: bg }}
          >
            █
          </span>
        </div>
      </div>
    </div>
  );
}
