import { expect, it } from "vitest";
import { allStep, checkStep, selectionFixture } from "../../probes/fixtures";
import { planAct, readScreen } from "../index";

it("plans one press on eligible rows, reads the same selection, and leaves tables' own check and sort intact", () => {
  const { screen, defs } = selectionFixture();
  const initialRead = readScreen(screen, defs);
  expect(initialRead).toContain("selected none [bulk/all press]");
  expect(initialRead).not.toContain("[bulk/r1 press]");
  const tick = planAct(screen, defs, {}, [checkStep]);
  expect(tick).toMatchObject({ ok: true, changed: ["table/r2/pick check = true"] });
  if (!tick.ok) return;
  expect(readScreen(screen, defs, tick.values)).toContain("selected r2 [bulk/all press]");
  const result = planAct(screen, defs, tick.values, [allStep]);
  expect(result).toEqual({
    ok: true,
    changed: ["bulk/all press"],
    links: [],
    values: {
      "home/table/r1/pick": true,
      "home/table/$check/r1/pick": true,
      "home/table/r2/pick": true,
      "home/table/$check/r2/pick": true,
    },
  });
  if (!result.ok) return;
  const read = readScreen(screen, defs, result.values);
  expect(read).toContain("selected r1,r2");
  expect(read).toContain("[bulk/r1 press]");
  expect(read).not.toContain("[bulk/all press]");
  expect(read).not.toContain("r3/pick");
  const sort = { address: "table/header", action: "select", value: 1 };
  const rest = planAct(screen, defs, result.values, [sort, checkStep]);
  expect(rest).toMatchObject({ ok: true, values: { "home/table/$sort": 1 } });
  if (rest.ok) expect(readScreen(screen, defs, rest.values)).toContain("selected r1 [bulk/all press]");
});

it("recomputes availability after an earlier step changes selection in the same plan", () => {
  const { screen, defs } = selectionFixture({ requireSelection: true });
  expect(readScreen(screen, defs)).not.toContain("[bulk/all press]");
  expect(planAct(screen, defs, {}, [allStep])).toMatchObject({ ok: false, code: "not_actionable" });
  expect(planAct(screen, defs, {}, [checkStep, allStep])).toMatchObject({
    ok: true,
    changed: ["table/r2/pick check = true", "bulk/all press"],
    values: { "home/table/r1/pick": true, "home/table/r2/pick": true },
  });
});

it("honors the declared instance rather than the first table or another screen's check values", () => {
  const { screen, defs, tableEntry } = selectionFixture({ source: "table" });
  screen.components.unshift({ ...tableEntry, id: "decoy" });
  const stale = { "home/decoy/$check/r2/pick": true, "elsewhere/table/$check/r2/pick": true };
  expect(readScreen(screen, defs, stale)).toContain("selected none [bulk/all press]");
  const result = planAct(screen, defs, stale, [allStep]);
  expect(result).toMatchObject({ ok: true, values: { "home/table/r2/pick": true } });
  if (result.ok) expect(result.values["home/decoy/r1/pick"]).toBeUndefined();
  screen.components = screen.components.filter(({ id }) => id !== "table");
  expect(readScreen(screen, defs, stale)).not.toContain("[bulk/all press]");
  expect(planAct(screen, defs, stale, [allStep])).toMatchObject({ ok: false, code: "not_actionable" });
});

it("withholds bound actions for missing, ambiguous, inactive, or unselectable sources", () => {
  const { screen, defs, tableEntry } = selectionFixture();
  const bulk = screen.components[1]!;
  for (const sources of [
    [],
    [tableEntry, { ...tableEntry, id: "decoy" }],
    [{ ...tableEntry, state: "loading" as const }],
    [{ ...tableEntry, selectable: false }],
  ]) {
    const candidate = { ...screen, components: [...sources, bulk] };
    const values = { "home/table/$check/r1/pick": true };
    expect(readScreen(candidate, defs, values)).not.toMatch(/\[bulk\//);
    expect(planAct(candidate, defs, values, [allStep])).toMatchObject({ ok: false, code: "not_actionable" });
    expect(planAct(candidate, defs, values, [{ address: "bulk/r1", action: "press" }])).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  }
});
