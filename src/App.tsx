import { useEffect, useState } from "react";
import { useConfigStore } from "./store/configStore";
import { Sidebar } from "./components/Sidebar";
import { SearchBar } from "./components/SearchBar";
import { SettingsPanel } from "./components/SettingsPanel";
import "./App.css";

function App() {
  const { load, set, save, saveAndReload, reset, schema, entries, isDirty, isLoading, error, configPath } =
    useConfigStore();
  const [activeCategory, setActiveCategory] = useState("font");
  const [query, setQuery] = useState("");

  useEffect(() => {
    load();
  }, [load]);

  const visibleFields = schema.filter((f) => {
    if (query.trim()) {
      const q = query.toLowerCase();
      return f.key.includes(q) || f.description.toLowerCase().includes(q);
    }
    return f.category === activeCategory;
  });

  const handleCategorySelect = (id: string) => {
    setActiveCategory(id);
    setQuery("");
  };

  return (
    <div className="app">
      <Sidebar active={activeCategory} onSelect={handleCategorySelect} />

      <div className="main">
        <header className="topbar">
          <SearchBar value={query} onChange={setQuery} />
          <div className="topbar-actions">
            {error && <span className="error-badge">{error}</span>}
            <button className="btn btn--ghost" onClick={reset} disabled={!isDirty}>
              撤销更改
            </button>
            <button className="btn btn--secondary" onClick={save} disabled={!isDirty}>
              保存
            </button>
            <button className="btn btn--primary" onClick={saveAndReload} disabled={!isDirty}>
              保存并重载
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="loading">加载中...</div>
        ) : (
          <SettingsPanel fields={visibleFields} entries={entries} onChange={set} />
        )}

        <footer className="footer">
          <span className="config-path">{configPath}</span>
          {isDirty && <span className="dirty-badge">未保存</span>}
        </footer>
      </div>
    </div>
  );
}

export default App;
