import { expect, it } from "vitest";
import { RequestResolution } from "../../../packs/requests";
import type { Definition } from "../../probes";
import { planAct, readScreen, type ScreenLike } from "../index";

it("admits the staged Resolution outcome without changing its strict reason refinement", () => {
  const def: Definition = {
    ...RequestResolution,
    meta: {
      ...RequestResolution.meta,
      selections: {
        outcome: { prop: "outcome", choices: { prop: "outcome_choices" }, runtime: true },
      },
      live: {
        text: { reason: { prop: "reason", max: 120 } },
        derive: (props) => ({
          outcome_choices: [
            "repaired",
            "workaround",
            ...(String(props.reason ?? "").trim() ? ["unable"] : []),
          ],
        }),
      },
    },
  };
  const defs = { [def.meta.id]: def };
  const wire = RequestResolution.examples[0]!;
  const screen: ScreenLike = {
    id: "s",
    components: [{ id: "r", c: def.meta.id, ...wire }],
  };
  const pick = { address: "r/outcome", action: "select", value: "unable" };
  expect(def.props.safeParse({ ...wire, outcome: "unable" }).success).toBe(false);
  expect(planAct(screen, defs, {}, [pick]).ok).toBe(false);
  const edit = planAct(screen, defs, {}, [{ address: "r/reason", action: "type", value: "Cannot proceed" }]);
  expect(edit.ok).toBe(true);
  if (!edit.ok) return;
  expect(readScreen(screen, defs, edit.values)).toContain('choices ["repaired","workaround","unable"]');
  const select = planAct(screen, defs, edit.values, [pick]);
  expect(select.ok).toBe(true);
  if (!select.ok) return;
  expect(readScreen(screen, defs, select.values)).toContain('[r/outcome select = "unable"');
});
