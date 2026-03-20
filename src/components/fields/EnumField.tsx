interface Props {
  label: string;
  description: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export function EnumField({ label, description, value, options, onChange }: Props) {
  return (
    <div className="field-row">
      <div className="field-info">
        <label className="field-label">{label}</label>
        <p className="field-desc">{description}</p>
      </div>
      <select
        className="field-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
