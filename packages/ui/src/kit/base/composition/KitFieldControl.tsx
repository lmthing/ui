import { useWords } from "../../provider";
import { placeholderTitle, placeholderValue } from "../../../catalog";
import { KitAction, KitChip, KitTrack, KitInput } from "../input";
import { KitSlider } from "../slider";
import { KitContent, KitText } from "../text";
import { KitPhoto } from "../media";
import { KitTrail } from "../helpers";

export type FieldKind =
  "text" | "number" | "date" | "time" | "choice" | "repeat" | "toggle" | "slider" | "photo";
type FieldProps = {
  kind: FieldKind;
  label: string;
  value?: string | undefined;
  /** The options of a choice or repeat, and the one that is on. */
  choices?: readonly string[] | undefined;
  chosen?: string | undefined;
};

function ChoiceField({ kind, label, choices = [], chosen }: FieldProps) {
  const pills = kind === "repeat";
  return (
    <KitTrack
      look={pills ? "pills" : "segments"}
      part="field"
      role="radiogroup"
      label={label}
      wrapAsPills={!pills}
    >
      {choices.map((option) => (
        <KitChip
          key={option}
          item={null}
          label={option}
          role="radio"
          look={pills ? "pill" : "segment"}
          on={option === chosen}
        />
      ))}
    </KitTrack>
  );
}
function ToggleField({ value, label }: FieldProps) {
  const { fieldToggle } = useWords().words;
  return (
    <KitContent
      lineRole="body"
      lead={<KitTrail kind="toggle" label={label} on={value === "on"} part="field" />}
    >
      {value && (
        <KitText role="body" part={null}>
          {value === "on" || value === "off" ? fieldToggle[value] : value}
        </KitText>
      )}
    </KitContent>
  );
}
function SliderField({ value, label }: FieldProps) {
  const number = Number(value ?? placeholderValue);
  return (
    <>
      {value && (
        <KitText role="number" tabular part={null}>
          {value}
        </KitText>
      )}
      <KitSlider
        value={number}
        label={label}
        min={Math.min(0, number)}
        max={Math.max(10, number)}
        part="field"
      />
    </>
  );
}
function PhotoField({ value, label }: FieldProps) {
  const { photoLabels } = useWords().words;
  const photo = value ?? `lib:${placeholderTitle(0).toLowerCase().replace(/ /g, "_")}`;
  return (
    <>
      <KitPhoto photo={photo} label={label} shape="wide" part="photo" />
      <KitAction label={photoLabels.add} icon="camera" kind="secondary" part="field" full />
    </>
  );
}
function TextField({ kind, label, value }: FieldProps) {
  const inputKind = kind === "number" || kind === "date" || kind === "time" ? kind : "text";
  const icon = kind === "date" ? "calendar" : kind === "time" ? "clock" : undefined;
  return <KitInput label={label} hint={label} value={value} kind={inputKind} icon={icon} part="field" />;
}
const controls = {
  text: TextField,
  number: TextField,
  date: TextField,
  time: TextField,
  choice: ChoiceField,
  repeat: ChoiceField,
  toggle: ToggleField,
  slider: SliderField,
  photo: PhotoField,
};

/** One form field's addressed control, with the same part and actions for every kind. */
export function KitFieldControl(props: FieldProps) {
  const Control = controls[props.kind];
  return <Control {...props} />;
}
