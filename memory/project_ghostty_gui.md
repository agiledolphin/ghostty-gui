---
name: ghostty-gui project status
description: Current state of the ghostty-gui Tauri app — architecture, what's been built, and key decisions
type: project
---

A Tauri v2 + React + TypeScript desktop GUI for configuring the Ghostty terminal emulator (~/.config/ghostty/config).

**Why:** Replace manual config file editing with a GUI, with live theme preview.

**How to apply:** When resuming work, the core is done — focus on extending schema or UI polish rather than rebuilding foundations.

## What's been built

- **Rust backend**: config.rs (parse/serialize preserving comments), schema.rs (86 fields across 8 categories), lib.rs (IPC commands: load_config, save_config, reload_ghostty, get_schema, get_config_path, get_theme, get_all_themes)
- **Save logic**: only writes entries that differ from the original file — never writes untouched defaults
- **Frontend**: Zustand store, Sidebar (8 categories), SearchBar, SettingsPanel, ConfigField dispatcher, 5 field types (Bool/String/Number/Color/Enum)
- **Theme picker**: Full-screen modal with 463 Ghostty built-in themes, searchable list with palette swatches, live terminal simulation preview (ThemePreview), single-theme mode and adaptive light:X,dark:Y mode
- **ESLint**: configured with @eslint/js + typescript-eslint + eslint-plugin-react-hooks

## Key decisions

- `Vec<Line>` in Rust preserves comments/blank lines in config file
- Schema-driven UI: adding a config option only requires adding a ConfigField entry in schema.rs
- Theme stored at /Applications/Ghostty.app/Contents/Resources/ghostty/themes/ (463 themes)
- Adaptive theme format: `light:ThemeName,dark:ThemeName`
