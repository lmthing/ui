import { numberLine } from "../../../catalog";
import type { DeviceEntry } from "..";
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
