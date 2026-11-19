import type { z } from "zod";
import { deviceUnits, homeLabels, type StateName } from "../../catalog";
import type { deviceProps } from ".";

/** Keep each nested device/scene's label beside its validator-owned addressed row. */
export function readDevices(input: unknown, state: StateName): string[] {
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
              ? homeLabels.locked
              : homeLabels.unlocked
            : String(row.on),
        row.temp === undefined ? "" : `${homeLabels.setPoint} ${row.temp} ${deviceUnits.celsius}`,
        row.reading === undefined
          ? ""
          : `${homeLabels.reading} ${row.reading} ${deviceUnits[row.unit ?? "celsius"]}`,
        row.normal
          ? `${homeLabels.normal} ${row.normal.low}–${row.normal.high}${row.reading! < row.normal.low || row.reading! > row.normal.high ? ` · ${homeLabels.outOfRange}` : ""}`
          : "",
      ]
        .filter(Boolean)
        .join(" · "),
    ),
    ...scenes.map(
      (scene, index) =>
        `${entries[devices.length + index]?.id ?? ""} ${scene.name} · ${scene.targets.some((target) => devices.find((row) => row.key === target.key)?.kind === "lock") ? homeLabels.secure : homeLabels.apply}`,
    ),
  ];
}
