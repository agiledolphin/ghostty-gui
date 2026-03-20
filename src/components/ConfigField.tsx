import { ConfigField as ConfigFieldType } from "../store/configStore";
import { BoolField } from "./fields/BoolField";
import { StringField } from "./fields/StringField";
import { NumberField } from "./fields/NumberField";
import { ColorField } from "./fields/ColorField";
import { EnumField } from "./fields/EnumField";
import { ThemeField } from "./fields/ThemeField";
import { FontFamilyField } from "./fields/FontFamilyField";

interface Props {
  field: ConfigFieldType;
  value: string;
  onChange: (key: string, value: string) => void;
}

export function ConfigField({ field, value, onChange }: Props) {
  const { key, field_type, description, default: def } = field;
  const label = key;
  const effective = value !== undefined ? value : (def ?? "");
  const handle = (v: string) => onChange(key, v);

  // Special-case: theme gets a full picker instead of a plain text field
  if (key === "theme") {
    return <ThemeField value={value ?? ""} onChange={handle} />;
  }

  // Font family keys get a system font picker
  const fontFamilyKeys = ["font-family", "font-family-bold", "font-family-italic", "font-family-bold-italic"];
  if (fontFamilyKeys.includes(key)) {
    return (
      <FontFamilyField
        label={label}
        description={description}
        value={effective}
        onChange={handle}
      />
    );
  }

  switch (field_type.type) {
    case "Bool":
      return (
        <BoolField
          label={label}
          description={description}
          value={effective}
          onChange={handle}
        />
      );
    case "Color":
      return (
        <ColorField
          label={label}
          description={description}
          value={effective}
          onChange={handle}
        />
      );
    case "Enum":
      return (
        <EnumField
          label={label}
          description={description}
          value={effective}
          options={field_type.options}
          onChange={handle}
        />
      );
    case "Int":
      return (
        <NumberField
          label={label}
          description={description}
          value={effective}
          step={1}
          onChange={handle}
        />
      );
    case "Float":
      return (
        <NumberField
          label={label}
          description={description}
          value={effective}
          step={0.1}
          onChange={handle}
        />
      );
    default:
      return (
        <StringField
          label={label}
          description={description}
          value={effective}
          placeholder={def ?? ""}
          onChange={handle}
        />
      );
  }
}
