interface Props {
  label: string;
  description: string;
  value: string;
  step?: number;
  onChange: (value: string) => void;
}

export function NumberField({ label, description, value, step = 1, onChange }: Props) {
  return (
    <div className="field-row">
      <div className="field-info">
        <label className="field-label">{label}</label>
        <p className="field-desc">{description}</p>
      </div>
      <input
        className="field-input field-input--number"
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
