import type { z } from "zod";
import type { StateName } from "../../catalog";
import type { deviceProps } from ".";
import { deviceRange, deviceValue, focusedDevice } from "./copy";
import { homeWordsFor } from "./lang";

type Input = z.output<typeof deviceProps>;
type Entry = Input["entries"][number] & { id?: string };

function readEntry(row: Entry, enlarged: boolean, lang?: string) {
  const { deviceLabels, devicePanel, deviceUnits } = homeWordsFor(lang);
  if (row.entryKind === "scene")
    return [
      [row.id, row.name].filter(Boolean).join(" "),
      row.secure ? deviceLabels.secure : deviceLabels.apply,
      row.secure ? devicePanel.secure : undefined,
    ];
  const range = deviceRange(row, lang);
  const unit = row.unit ?? "celsius";
  return [
    row.id,
    row.room,
    row.name,
    row.kind === "lock" ? (row.on ? deviceLabels.locked : deviceLabels.unlocked) : undefined,
    row.temp === undefined ? undefined : `${deviceLabels.setPoint} ${deviceValue(row.temp, "celsius", lang)}`,
    row.reading === undefined ? undefined : `${deviceLabels.reading} ${deviceValue(row.reading, unit, lang)}`,
    enlarged && row.temp !== undefined
      ? devicePanel.measure(deviceLabels.setPoint, deviceUnits.celsius)
      : undefined,
    enlarged && row.reading !== undefined
      ? devicePanel.measure(deviceLabels.reading, deviceUnits[unit])
      : undefined,
    range ? `${deviceLabels.normal} ${range.label}` : undefined,
    range?.status,
    row.linked ? devicePanel.controls : undefined,
  ];
}

/** Keep each projected device or scene beside its validator-owned addressed row. */
export function readDevices(input: unknown, state: StateName, lang?: string): string[] {
  if (state !== "filled") return [];
  const { entries, focus, style } = input as Input & { entries: Entry[] };
  const words = homeWordsFor(lang);
  const focused =
    style === "focused" &&
    focusedDevice(
      entries.filter((row) => row.entryKind === "device"),
      focus,
    );
  return [
    ...(focused ? [words.deviceFocus(JSON.stringify(focused.name))] : []),
    words.devicePanel.preview,
    ...(entries.some((row) => row.entryKind === "scene") ? [words.devicePanel.scenes] : []),
    ...entries.map((row) =>
      readEntry(row, row === focused, lang)
        .filter(Boolean)
        .join(" · "),
    ),
  ];
}
