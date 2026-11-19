import { selectedIds } from "../../../../scripts/build";
import { expect, it } from "vitest";
import {
  affordancesOf,
  components,
  packOf,
  readComponent,
  stampItemIds,
  type Definition,
} from "@lmthing/ui/catalog";

it("offers every read-probe action on its actual example and reads all filled/state contracts", () => {
  const defs = Object.values(components).filter(
    (def) => (packOf as Record<string, string>)[def.meta.id] === "home",
  ) as Definition[];
  for (const def of defs.filter((def) => selectedIds([def.meta.id]).length)) {
    for (const probe of def.probes) {
      if (probe.kind !== "read") continue;
      const instance = probe.expect.address.split("/")[0]!;
      const example = def.examples[probe.screen];
      const parsed = stampItemIds(def.meta, def.props.parse(example));
      expect(affordancesOf(def.meta, parsed, instance)).toContainEqual(expect.objectContaining(probe.expect));
      expect(readComponent(def, example, instance).join("\n")).toContain(
        `[${probe.expect.address} ${probe.expect.action}`,
      );
    }
    for (const state of def.meta.states ?? [])
      expect(readComponent(def, def.examples[0], "x1", state).length).toBeGreaterThan(0);
  }
});

it("keeps device sensor controls read-only and direct/scene locks on confirming parts", () => {
  const def = components.Devices;
  const normal = readComponent(def, def.examples[0], "d1").join("\n");
  expect(normal).toContain("r1 · Living room · Thermostat");
  expect(normal).toContain("r4 Evening");
  expect(normal).not.toContain("[d1/r2 ");
  expect(normal).not.toContain("[d1/r2/");
  const locked = readComponent(def, def.examples[1], "d1").join("\n");
  expect(locked).toContain("[d1/r2/lock toggle");
  expect(locked).toContain("[d1/r8/secure press");
  expect(locked).not.toContain("[d1/r8/apply");
  expect(locked).toContain("asks first");
  expect(def.meta.confirmParts).toEqual(["lock", "secure"]);
});

it("addresses repeated events, prizes and baby tiles/logs without accepting derived input fields", () => {
  const rewards = readComponent(components.Rewards, components.Rewards.examples[0], "r1").join("\n");
  expect(rewards).toContain("r2 Choose a new plant");
  const agenda = readComponent(components.Agenda, components.Agenda.examples[0], "a1").join("\n");
  expect(agenda).toContain("r3 11:30 Repot the Monstera");
  const baby = readComponent(components.BabyLog, components.BabyLog.examples[0], "b1").join("\n");
  expect(baby).toContain("r5 Sleep");
  expect(baby).toContain("r6 Feed left");
  expect(baby).toContain("[b1/r5 stop]");
  expect(baby).not.toContain("[b1/r5 start]");
  const noPoints = {
    kids: [{ name: "Mia", points: 0, goto: "mia" }],
    prizes: [{ title: "Picnic", cost: 5, icon: "star" }],
  };
  expect(readComponent(components.Rewards, noPoints, "r1").join("\n")).not.toContain("/claim press");
});
