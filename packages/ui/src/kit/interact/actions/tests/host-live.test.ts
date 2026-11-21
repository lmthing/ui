import { expect, it, vi } from "vitest";
import { z } from "zod";
import { type Definition, type DeviceData } from "@lmthing/ui/catalog";
import { createScreenController } from "../../index";

const record = z.strictObject({ id: z.string(), label: z.string(), goto: z.string() });
const def = {
  meta: {
    id: "LookupFixture",
    group: "input",
    purpose: "Find a record.",
    pick: "Look up a record.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Search records on the device.",
    items: { key: "matches", parts: ["root"] },
    actions: { parts: { search: ["type"] }, items: { root: ["press"] } },
    deviceData: ["records"],
    live: {
      text: { search: { prop: "query", max: 30 } },
      derive: (props, _instance, data) => ({
        matches: (data.records ?? []).flatMap((input) => {
          const parsed = record.safeParse(input);
          const query = props.query;
          return parsed.success && typeof query === "string" && query && parsed.data.label.startsWith(query)
            ? [parsed.data]
            : [];
        }),
      }),
    },
    read: (props: unknown) =>
      (props as { matches: { label: string }[] }).matches.map((row) => JSON.stringify(row.label)),
  },
  props: z.strictObject({}),
  fallback: () => ({}),
  examples: [],
  probes: [],
} satisfies Definition;

it("uses the typed search and host results in the view, read, and staged controller actions", () => {
  const screen = { id: "home", components: [{ id: "lookup", c: def.meta.id }] };
  let data: DeviceData = {
    records: [{ id: "r4", label: "Record One", goto: "detail" }],
    other: [{ id: "r8", label: "Record Two", goto: "other" }],
  };
  const onLink = vi.fn();
  const controller = createScreenController({
    screen,
    defs: { LookupFixture: def },
    get deviceData() {
      return data;
    },
    requireMounted: true,
    onLink,
  });
  controller.registerPart("lookup/search");
  const open = { address: "lookup/r4", action: "press" };
  expect(controller.read()).not.toContain("Record One");
  expect(controller.act(open)).toMatchObject({ ok: false, code: "not_actionable" });
  const type = { address: "lookup/search", action: "type", value: "Record" };
  expect(controller.act([type, open])).toMatchObject({ ok: true });
  expect(onLink).toHaveBeenCalledExactlyOnceWith("detail", "home/lookup/r4");
  expect(controller.liveControls(def.meta, {}, "lookup").matches).toEqual(data.records);
  expect(controller.read()).toContain('lookup LookupFixture "Record One"');
  expect(controller.read()).toContain("\n  r4 [lookup/r4 press→detail]");
  expect(controller.read()).not.toContain("Record Two");
  expect(controller.snapshotScreen()).toEqual(screen);

  controller.registerPart("lookup/r4");
  expect(controller.actionsAt("lookup/r4")).toEqual(["press"]);
  data = { records: [] };
  expect(controller.actionsAt("lookup/r4")).toEqual([]);
  expect(controller.read()).not.toContain("lookup/r4");
  expect(controller.act(open)).toMatchObject({ ok: false, code: "not_actionable" });
  expect(onLink).toHaveBeenCalledTimes(1);
  controller.dispose();
});
