import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export type FieldType =
  | { type: "Bool" }
  | { type: "String" }
  | { type: "Int" }
  | { type: "Float" }
  | { type: "Color" }
  | { type: "Enum"; options: string[] };

export interface ConfigField {
  key: string;
  field_type: FieldType;
  category: string;
  default: string | null;
  description: string;
}

interface ConfigStore {
  entries: Record<string, string>;
  original: Record<string, string>;
  schema: ConfigField[];
  configPath: string;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;

  load: () => Promise<void>;
  set: (key: string, value: string) => void;
  save: () => Promise<void>;
  saveAndReload: () => Promise<void>;
  reset: () => void;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  entries: {},
  original: {},
  schema: [],
  configPath: "",
  isDirty: false,
  isLoading: false,
  error: null,

  load: async () => {
    if (!("__TAURI_INTERNALS__" in window)) {
      set({ error: "请通过 npm run tauri dev 启动应用，不支持在普通浏览器中运行。", isLoading: false });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const [entries, schema, configPath] = await Promise.all([
        invoke<Record<string, string>>("load_config"),
        invoke<ConfigField[]>("get_schema"),
        invoke<string>("get_config_path"),
      ]);
      set({
        entries,
        original: entries,
        schema,
        configPath,
        isDirty: false,
        isLoading: false,
      });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  set: (key, value) => {
    const { entries, original } = get();
    const next = { ...entries, [key]: value };
    const dirty = Object.keys(next).some((k) => next[k] !== original[k]) ||
      Object.keys(original).some((k) => !(k in next));
    set({ entries: next, isDirty: dirty });
  },

  save: async () => {
    set({ error: null });
    try {
      const { entries, original } = get();
      // Only send entries that differ from the config file's current content.
      // This ensures we never write default values the user hasn't touched.
      const changed: Record<string, string> = {};
      for (const [key, value] of Object.entries(entries)) {
        if (value !== original[key]) {
          changed[key] = value;
        }
      }
      if (Object.keys(changed).length > 0) {
        await invoke("save_config", { entries: changed });
      }
      set({ original: { ...original, ...changed }, isDirty: false });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  saveAndReload: async () => {
    await get().save();
    if (!get().error) {
      try {
        await invoke("reload_ghostty");
      } catch (e) {
        set({ error: String(e) });
      }
    }
  },

  reset: () => {
    const { original } = get();
    set({ entries: original, isDirty: false });
  },
}));
