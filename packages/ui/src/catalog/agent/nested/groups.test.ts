import { expect, it } from "vitest";
import { groupPolicies } from "./groups";

it("counts separate positions even when a projection reuses the same child object", () => {
  const spec = { action: "toggle", prop: "on", group: "limit" } as const;
  const nested = {
    key: "children",
    parts: { pick: spec },
    groups: { limit: { mode: "multi", max: 2 } },
  } as const;
  const active = { on: true };
  const controls = [active, active, { on: false }].map((item, at) => ({
    item,
    at,
    spec,
    target: `r1/pick_${at + 1}`,
    enabled: true,
  }));
  const policies = groupPolicies(nested, {}, controls);
  expect(policies.get("r1/pick_3")).toEqual({ blocked: true, remaining: 0, replace: [] });
  expect(policies.get("r1/pick_1")).toEqual({ blocked: false, remaining: 0, replace: [] });
});

it("rejects overlapping or undeclared policies on aliases of one field", () => {
  const groups = { smaller: { mode: "multi", max: 1 }, larger: { mode: "multi", max: 2 } } as const;
  const first = { action: "toggle", prop: "on", group: "smaller" } as const;
  for (const group of ["larger", "unknown"])
    expect(() =>
      groupPolicies({ key: "children", groups, parts: { first, alias: { ...first, group } } }, {}, []),
    ).toThrow("each field needs one declared policy");
});
