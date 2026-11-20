import { expect, it } from "vitest";
import type { Definition } from "../../../../catalog";
import { WorkOrder } from "../../../../packs/requests";
import { createAgentAccess, createInteractionStore, createScreenController } from "../../index";

const order: Definition = {
  ...WorkOrder,
  meta: {
    ...WorkOrder.meta,
    live: {
      checks: { check: "done" },
      derive: (props) => ({
        finishable: (props.lines as { required?: boolean; done?: boolean }[]).every(
          ({ required, done }) => !required || done === true,
        ),
      }),
    },
  },
};
const defs = { [order.meta.id]: order };
const screen = {
  id: "s",
  components: [
    { ...WorkOrder.examples[0]!, id: "w", c: order.meta.id, status: "ready", blockedBy: undefined },
  ],
};
const start = { address: "w/clock", action: "start" };
const stop = { address: "w/clock", action: "stop" };
const check = { address: "w/r2/check", action: "check" };
const finish = { address: "w/finish", action: "press" };

it("stages clock transitions before evaluating finish in a standalone or mounted batch", () => {
  for (const mounted of [false, true]) {
    const store = createInteractionStore();
    const runtime = mounted
      ? createScreenController({ screen, defs, store })
      : createAgentAccess({ current: () => screen, defs, store });
    expect(runtime.act([check, start, finish])).toMatchObject({ ok: false, at: 2 });
    expect(store.get("s/w/$work")).toBeUndefined();
    expect(runtime.act([check, start]).ok).toBe(true);
    expect(runtime.read()).not.toContain("[w/finish press]");
    expect(runtime.act([stop, finish]).ok).toBe(true);
    expect(runtime.read()).toContain("[w/finish press]");
  }
});
