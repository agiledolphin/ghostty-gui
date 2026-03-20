interface Props {
  label: string;
  description: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function StringField({ label, description, value, placeholder, onChange }: Props) {
  return (
    <div className="field-row">
      <div className="field-info">
        <label className="field-label">{label}</label>
        <p className="field-desc">{description}</p>
      </div>
      <input
        className="field-input"
        type="text"
        value={value}
        placeholder={placeholder ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
