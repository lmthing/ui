import { photoLabels, placeholderTitle, placeholderValue } from "../../catalog";
import { KitAction } from "./KitAction";
import { KitChip, KitTrack } from "./KitChip";
import { KitContent } from "./KitContent";
import { KitInput } from "./KitInput";
import { KitPhoto } from "./KitPhoto";
import { KitSlider } from "./KitSlider";
import { KitText } from "./KitText";
import { KitTrail } from "./helpers";

export type FieldKind =
  "text" | "number" | "date" | "time" | "choice" | "repeat" | "toggle" | "slider" | "photo";

/**
 * The control of one form field, by kind: a text box (text, number, date, time), a track of options (a
 * `choice` of segments, a `repeat` of pills), a switch, a slider or a photo with an add button. Every
 * control is the part `field` that the field's actions act on (a photo also has the part `photo`).
 */
export function KitFieldControl({
  kind,
  label,
  value,
  choices = [],
  chosen,
}: {
  kind: FieldKind;
  label: string;
  value?: string | undefined;
  /** The options of a choice or repeat, and the one that is on. */
  choices?: readonly string[] | undefined;
  chosen?: string | undefined;
}) {
  if (kind === "choice" || kind === "repeat") {
    const pills = kind === "repeat";
    return (
      <KitTrack look={pills ? "pills" : "segments"} part="field" role="radiogroup" label={label}>
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
  if (kind === "toggle") {
    return (
      <KitContent lineRole="body" lead={<KitTrail kind="toggle" on={value === "on"} part="field" />}>
        {value && (
          <KitText role="body" part={null}>
            {value}
          </KitText>
        )}
      </KitContent>
    );
  }
  if (kind === "slider") {
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
  if (kind === "photo") {
    const photo = value ?? `lib:${placeholderTitle(0).toLowerCase().replace(/ /g, "_")}`;
    return (
      <>
        <KitPhoto photo={photo} label={label} shape="wide" part="photo" />
        <KitAction label={photoLabels.add} icon="camera" kind="secondary" part="field" full />
      </>
    );
  }
  const icon = kind === "date" ? "calendar" : kind === "time" ? "clock" : undefined;
  return <KitInput label={label} hint={label} value={value} kind={kind} icon={icon} part="field" />;
}
