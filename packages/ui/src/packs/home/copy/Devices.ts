import type { z } from "zod";
import { numberLine, type StateName } from "../../../catalog";
import type { DeviceEntry, deviceProps } from "..";
import { homeWordsFor } from "../lang";
export const { deviceLabels } = homeWordsFor();

export const { deviceUnits } = homeWordsFor();

export function deviceValue(value: number, unit: NonNullable<DeviceEntry["unit"]>, lang?: string) {
  const { devicePanel, deviceUnits } = homeWordsFor(lang);
  return devicePanel.value(numberLine(value, lang), deviceUnits[unit]);
}

export function thermostatCopy({ mode, coolTemp }: Pick<DeviceEntry, "mode" | "coolTemp">, lang?: string) {
  const { deviceLabels, thermostat } = homeWordsFor(lang);
  const setPoint = mode === undefined && coolTemp === undefined ? deviceLabels.setPoint : thermostat.heating;
  return {
    setPoint,
    heatingCaption: coolTemp === undefined ? setPoint : thermostat.heatTarget,
    coolingCaption: thermostat.coolTarget,
    mode: mode === undefined ? undefined : thermostat.mode(thermostat.modes[mode]),
    coolTemp: coolTemp === undefined ? undefined : thermostat.cooling(deviceValue(coolTemp, "celsius", lang)),
  };
}

export function deviceRange(row: DeviceEntry, lang?: string) {
  if (!row.normal || row.reading === undefined) return;
  const { low, high } = row.normal;
  const { deviceLabels, devicePanel } = homeWordsFor(lang);
  const outside = row.reading < low || row.reading > high;
  const span = high - low;
  return {
    low,
    high,
    min: Math.min(low - span, row.reading),
    max: Math.max(high + span, row.reading),
    value: row.reading,
    outside,
    label: devicePanel.limits(numberLine(low, lang), deviceValue(high, row.unit ?? "celsius", lang)),
    status: outside ? deviceLabels.outOfRange : undefined,
  };
}

export function focusedDevice<T extends { key: string }>(devices: readonly T[], focus?: string) {
  return devices.find((row) => row.key === focus) ?? devices[0];
}

type Input = z.output<typeof deviceProps>;
type Entry = Input["entries"][number] & { id?: string };

function readEntry(row: Entry, enlarged: boolean, grouped: boolean, lang?: string) {
  const { deviceLabels, devicePanel, deviceUnits, thermostat: words } = homeWordsFor(lang);
  if (row.entryKind === "scene")
    return [
      [row.id, row.name].filter(Boolean).join(" "),
      row.secure ? deviceLabels.secure : deviceLabels.apply,
      row.secure ? devicePanel.reviewScene(JSON.stringify(devicePanel.secure)) : undefined,
    ];
  const range = deviceRange(row, lang);
  const thermostat = thermostatCopy(row, lang);
  const unit = row.unit ?? "celsius";
  return [
    row.id,
    grouped ? row.room : undefined,
    row.name,
    row.kind === "lock" ? (row.on ? deviceLabels.locked : deviceLabels.unlocked) : undefined,
    thermostat.mode,
    row.temp === undefined ? undefined : `${thermostat.setPoint} ${deviceValue(row.temp, "celsius", lang)}`,
    thermostat.coolTemp,
    row.reading === undefined ? undefined : `${deviceLabels.reading} ${deviceValue(row.reading, unit, lang)}`,
    (enlarged || row.coolTemp !== undefined) && row.temp !== undefined
      ? devicePanel.measure(thermostat.heatingCaption, deviceUnits.celsius)
      : undefined,
    row.coolTemp === undefined
      ? undefined
      : devicePanel.measure(thermostat.coolingCaption, deviceUnits.celsius),
    row.coolTemp === undefined ? undefined : words.adjustHeat,
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
  const { entries, focus, style, group } = input as Input & { entries: Entry[] };
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
      readEntry(row, row === focused, group !== "none", lang)
        .filter(Boolean)
        .join(" · "),
    ),
  ];
}
