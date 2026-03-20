interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <div className="search-bar">
      <span className="search-icon">⌕</span>
      <input
        className="search-input"
        type="search"
        placeholder="搜索配置项..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
