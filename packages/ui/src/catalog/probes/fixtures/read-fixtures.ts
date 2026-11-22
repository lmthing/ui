import { z } from "zod";
import { driveTarget, type ActStep, type DeviceData, type ScreenLike } from "../../agent";
import { media, text } from "../../props";
import type { Meta } from "../../meta";
import type { StateName } from "../../types";
import type { Definition, ReadProbe } from "../types";

/** A setup action relative to the example component, performed before reading the screen. */
export type ReadProbeFixture = Omit<ActStep, "address"> & { part: string };

/** Resolve synthetic host records for an example without putting them into its wire props. */
export function exampleDeviceData(
  meta: Meta,
  input: Readonly<Record<string, unknown>>,
  state: StateName,
): DeviceData | undefined {
  return meta.deviceData?.length ? meta.previewDeviceData?.({ input, state }) : undefined;
}

const fixtures: readonly {
  component: string;
  screen: number;
  expect: ReadProbe["expect"];
  setup: ReadProbeFixture;
}[] = [
  {
    component: "TeamPicker",
    screen: 0,
    expect: { address: "t1/remake", action: "press" },
    setup: { part: "make", action: "press" },
  },
  {
    component: "Quiz",
    screen: 0,
    expect: { address: "q1/check", action: "press" },
    setup: { part: "root", action: "select", value: 0 },
  },
];

export function readFixtureFor(component: string, probe: ReadProbe): ReadProbeFixture | undefined {
  return fixtures.find(
    (fixture) =>
      fixture.component === component &&
      fixture.screen === probe.screen &&
      fixture.expect.address === probe.expect.address &&
      fixture.expect.action === probe.expect.action,
  )?.setup;
}

export type ReadProbeComposition = {
  siblings: NonNullable<ReadProbe["siblings"]>;
  defs: readonly Definition[];
};

export function mountReadSiblings(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  composition: ReadProbeComposition,
) {
  for (const { id, c, state, ...wire } of composition.siblings) {
    if (screen.components.some((entry) => entry.id === id))
      throw new Error(`Duplicate read probe instance ${id}`);
    const def = composition.defs.find((entry) => entry.meta.id === c);
    if (!def) throw new Error(`Unknown read probe sibling ${c}`);
    def.props.parse(wire);
    defs[c] = def;
    screen.components.push({ ...wire, id, c, ...(state ? { state } : {}) });
  }
}

/** Read fixtures are data-only. A drive target must offer seek and cover the example's offsets. */
export function mountSeekTarget(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  def: Definition,
  input: object,
  data?: DeviceData,
) {
  const c = def.meta.drives;
  if (typeof c !== "string") return;
  if (Object.hasOwn(defs, c)) throw new Error(`Conflicting seek target for ${def.meta.id} read fixture`);
  let id = "target";
  for (let n = 2; screen.components.some((entry) => entry.id === id); n++) id = `target${n}`;
  const parsed = def.props.parse(input) as Record<string, unknown>;
  const rows = parsed[def.meta.items?.key ?? ""];
  const seconds = Math.max(1, ...(Array.isArray(rows) ? rows.map((row) => Number(row.at) || 0) : []));
  const wire = { media: "lib:fixture", title: "Recording", seconds };
  defs[c] = {
    meta: {
      id: c,
      group: "content",
      purpose: "Play one recording.",
      pick: "Seek target for a read fixture.",
      region: "body",
      weight: 1,
      tier: "phone",
      realPath: "Read a recording on this device.",
      parts: ["scrubber"],
      actions: { parts: { scrubber: ["seek"] } },
    },
    props: z.strictObject({ media, title: text(40), seconds: z.int().positive() }),
    fallback: () => wire,
    examples: [wire],
    probes: [],
  };
  screen.components.unshift({ ...wire, id, c });
  if (!driveTarget(def.meta, screen, defs, {}, data))
    throw new Error(`No seek offer for ${c} in ${def.meta.id} read fixture`);
}
