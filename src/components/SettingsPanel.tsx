import { ConfigField as ConfigFieldType } from "../store/configStore";
import { ConfigField } from "./ConfigField";

interface Props {
  fields: ConfigFieldType[];
  entries: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function SettingsPanel({ fields, entries, onChange }: Props) {
  if (fields.length === 0) {
    return <div className="settings-empty">没有找到匹配的配置项</div>;
  }

  return (
    <div className="settings-panel">
      {fields.map((field) => (
        <ConfigField
          key={field.key}
          field={field}
          value={entries[field.key]}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
