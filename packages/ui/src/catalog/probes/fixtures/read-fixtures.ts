import type { ActStep } from "../../agent";
import type { ReadProbe } from "../types";

/** A setup action relative to the example component, performed before reading the screen. */
export type ReadProbeFixture = Omit<ActStep, "address"> & { part: string };

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
