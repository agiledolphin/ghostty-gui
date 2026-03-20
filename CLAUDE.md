# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Tauri v2 desktop GUI for configuring the Ghostty terminal emulator. It reads and writes `~/.config/ghostty/config` (key = value format) and can send SIGHUP to Ghostty to apply changes without restarting.

## Commands

```bash
# Development: starts Vite dev server AND opens Tauri window (HMR enabled)
npm run tauri dev

# Start only the Vite dev server (no Tauri context, invoke() will not work)
npm run dev

# Production build (TypeScript check → Vite bundle → Tauri build)
npm run build

# Lint (ESLint on src/)
npm run lint

# Run Tauri CLI directly
npm run tauri
```

No test scripts are configured. TypeScript strict mode (`strict`, `noUnusedLocals`, `noUnusedParameters`) enforces type safety at build time via `tsc`.

ESLint config is in `eslint.config.js` using `@eslint/js`, `typescript-eslint`, and `eslint-plugin-react-hooks`.

## Architecture

### Data Flow

```
~/.config/ghostty/config
        ↕ Rust (config.rs)
  Tauri IPC commands
        ↕ invoke()
  Zustand store (configStore.ts)
        ↕
  React components
```

### Rust Backend (`src-tauri/src/`)

| File | Role |
|------|------|
| `lib.rs` | Tauri command registration and entry point |
| `config.rs` | Config file parsing, serialization, read/write. Uses `Vec<Line>` (not HashMap) to preserve comments and blank lines |
| `schema.rs` | Defines `ConfigField` metadata (key, type, category, default, description) for all supported settings |

**IPC Commands:**
- `load_config() → Record<string,string>` — reads config file, returns key/value map
- `save_config(entries)` — merges entries into existing lines (preserving comments), writes back
- `reload_ghostty()` — sends SIGHUP via `pkill -HUP ghostty`
- `get_schema() → ConfigField[]` — returns field metadata to drive UI rendering
- `get_config_path() → string` — returns resolved config file path

### Frontend (`src/`)

| Path | Role |
|------|------|
| `store/configStore.ts` | Zustand store: entries, original (for dirty detection), schema, load/set/save/reset |
| `components/Sidebar.tsx` | Category navigation (字体/外观/窗口/终端/鼠标/其他) |
| `components/SearchBar.tsx` | Filters fields by key or description across all categories |
| `components/SettingsPanel.tsx` | Renders filtered list of `ConfigField` components |
| `components/ConfigField.tsx` | Dispatches to the correct field component based on `field_type` |
| `components/fields/` | `BoolField` (toggle), `StringField`, `NumberField`, `ColorField`, `EnumField` |

### Adding a New Config Option

1. Add a `ConfigField` entry to `schema.rs` `get_schema()` with the correct `FieldType` and category
2. No frontend changes needed — the UI renders from schema automatically

### Adding a New Field Type

1. Add variant to `FieldType` enum in `schema.rs`
2. Add matching TypeScript type in `configStore.ts`
3. Create a new field component in `src/components/fields/`
4. Add a case in `ConfigField.tsx`
