interface Props {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}

export function BoolField({ label, description, value, onChange }: Props) {
  const checked = value === "true";
  return (
    <div className="field-row">
      <div className="field-info">
        <label className="field-label">{label}</label>
        <p className="field-desc">{description}</p>
      </div>
      <label className="toggle">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked ? "true" : "false")}
        />
        <span className="toggle-slider" />
      </label>
    </div>
  );
}
