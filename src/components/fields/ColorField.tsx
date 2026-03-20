interface Props {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}

// Ghostty uses hex without '#'. We add/strip it for the color input.
export function ColorField({ label, description, value, onChange }: Props) {
  const hex = value.startsWith("#") ? value : `#${value}`;

  return (
    <div className="field-row">
      <div className="field-info">
        <label className="field-label">{label}</label>
        <p className="field-desc">{description}</p>
      </div>
      <div className="color-field">
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value.replace("#", ""))}
        />
        <input
          className="field-input field-input--color-hex"
          type="text"
          value={value}
          maxLength={6}
          onChange={(e) => onChange(e.target.value.replace("#", ""))}
        />
      </div>
    </div>
  );
}
