import type { z } from "zod";
import type { StateName } from "../../catalog";
import { homeWordsFor } from "./lang";
import { numberLine } from "../../catalog";
import type { deviceProps } from ".";

/** Keep each nested device/scene's label beside its validator-owned addressed row. */
export function readDevices(input: unknown, state: StateName, lang?: string): string[] {
  const { deviceUnits, deviceLabels } = homeWordsFor(lang);
  if (state !== "filled") return [];
  const { rooms, scenes, entries } = input as z.output<typeof deviceProps> & {
    entries: { id?: string }[];
  };
  const devices = rooms.flatMap((room) => room.devices.map((row) => ({ ...row, room: room.label })));
  return [
    ...devices.map((row, index) =>
      [
        entries[index]?.id,
        row.room,
        row.name,
        row.on === undefined
          ? ""
          : row.kind === "lock"
            ? row.on
              ? deviceLabels.locked
              : deviceLabels.unlocked
            : String(row.on),
        row.temp === undefined
          ? ""
          : `${deviceLabels.setPoint} ${numberLine(row.temp, lang)} ${deviceUnits.celsius}`,
        row.reading === undefined
          ? ""
          : `${deviceLabels.reading} ${numberLine(row.reading, lang)} ${deviceUnits[row.unit ?? "celsius"]}`,
        row.normal
          ? `${deviceLabels.normal} ${numberLine(row.normal.low, lang)}–${numberLine(row.normal.high, lang)}${row.reading! < row.normal.low || row.reading! > row.normal.high ? ` · ${deviceLabels.outOfRange}` : ""}`
          : "",
      ]
        .filter(Boolean)
        .join(" · "),
    ),
    ...scenes.map(
      (scene, index) =>
        `${entries[devices.length + index]?.id ?? ""} ${scene.name} · ${scene.targets.some((target) => devices.find((row) => row.key === target.key)?.kind === "lock") ? deviceLabels.secure : deviceLabels.apply}`,
    ),
  ];
}
