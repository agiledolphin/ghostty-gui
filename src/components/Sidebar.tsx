const CATEGORIES: { id: string; label: string }[] = [
  { id: "font", label: "字体" },
  { id: "appearance", label: "外观" },
  { id: "window", label: "窗口" },
  { id: "terminal", label: "终端" },
  { id: "mouse", label: "鼠标" },
  { id: "clipboard", label: "剪贴板" },
  { id: "macos", label: "macOS" },
  { id: "misc", label: "其他" },
];

interface Props {
  active: string;
  onSelect: (id: string) => void;
}

export function Sidebar({ active, onSelect }: Props) {
  return (
    <nav className="sidebar">
      <div className="sidebar-title">Ghostty 配置</div>
      <ul className="sidebar-list">
        {CATEGORIES.map((cat) => (
          <li key={cat.id}>
            <button
              className={`sidebar-item ${active === cat.id ? "sidebar-item--active" : ""}`}
              onClick={() => onSelect(cat.id)}
            >
              {cat.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
