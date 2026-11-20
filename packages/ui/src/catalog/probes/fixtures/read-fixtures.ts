import type { ActStep, DeviceData } from "../../agent";
import type { Meta } from "../../meta";
import type { StateName } from "../../types";
import type { ReadProbe } from "../types";

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
