import { useState } from "react";
import { FontPicker } from "../FontPicker";

interface Props {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}

export function FontFamilyField({ label, description, value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="field-row">
        <div className="field-info">
          <label className="field-label">{label}</label>
          <p className="field-desc">{description}</p>
        </div>
        <div className="font-family-control">
          <span
            className="font-family-preview"
            style={value ? { fontFamily: `"${value}", monospace` } : undefined}
          >
            {value || <span style={{ opacity: 0.4, fontFamily: "inherit" }}>未设置</span>}
          </span>
          <button className="btn btn--secondary" onClick={() => setOpen(true)}>
            选择字体…
          </button>
        </div>
      </div>

      {open && (
        <FontPicker
          current={value}
          onApply={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
