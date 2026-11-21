import {
  components,
  createRegistry,
  packReady,
  stampItemIds,
  themeName,
  type CastLike,
  type Props,
  type ScreenLike,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController, KitProvider, PartScope, type ScreenController } from "@lmthing/ui/kit";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { addressedElements, config } from "../../../../../test/render";
import { BulkActions } from "../../components";

const def = components.BulkActions;
const { meta, props, examples, fallback, probes } = def;
const ledge = examples[0]!;
const defs = { BulkActions: { ...def, meta: BulkActions.boundMeta }, Table: components.Table };
const table = { ...components.Table.examples[0]!, id: "table", c: "Table", selectable: true };
const entry = { ...ledge, id: "bulk", c: "BulkActions" };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const screen = { id: "home", components: [table, entry] };
const at = (part: string) => `home/bulk/${part}`;
const firstCheck = "home/table/r1/pick";
const secondCheck = "home/table/r2/pick";
const confirm = { address: "home/confirm/confirm", action: "press" };
const cancel = { address: "home/confirm/cancel", action: "dismiss" };

function draw(controller: ScreenController, input: object = ledge, state: StateName = "filled") {
  const viewProps = stampItemIds(meta, props.parse(input)) as Props<typeof props, typeof meta>;
  const view = createElement(BulkActions.BulkActions, viewProps);
  return addressedElements(
    renderToStaticMarkup(
      createElement(
        TamaguiProvider,
        { config, defaultTheme: themeName(theme) },
        createElement(KitProvider, {
          theme,
          controller,
          children: createElement(PartScope, {
            screen: "home",
            component: "bulk",
            rev: 1,
            state,
            children: view,
          }),
        }),
      ),
    ),
  );
}

describe("BulkActions contract, fallback and probes", () => {
  it.each(examples)("accepts a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it.each([
    { items: [] },
    { items: [ledge.items[0]] },
    { items: Array.from({ length: 5 }, () => ledge.items[0]) },
    ...[
      { icon: "invalid" },
      { label: " " },
      { label: "x".repeat(15) },
      { danger: "false" },
      { id: "r1" },
    ].map((item) => ({ items: [{ ...ledge.items[0], ...item }, ledge.items[1]] })),
    { count: 2 },
    { $selection: { selected: ["r1"] } },
    { arrange: "pills" },
    { color: "red" },
  ])("rejects invalid BulkActions fields: %j", (change) => {
    expect(props.safeParse({ ...ledge, ...change }).success).toBe(false);
  });

  it("accepts four actions with the maximum label length, and reserves ids for the view", () => {
    const item = { icon: "check", label: "x".repeat(14), danger: false };
    const parsed = props.parse({ items: Array.from({ length: 4 }, () => item) });
    expect(parsed).toMatchObject({ arrange: "grid", surface: "card" });
    expect(stampItemIds(meta, parsed).items[3]).toEqual({ ...item, id: "r4" });
    expectTypeOf<Props<typeof props, typeof meta>["items"][number]["id"]>().toEqualTypeOf<string>();
  });

  it("uses cast labels when valid and never invents dangerous fallback actions", () => {
    const empty: CastLike = { things: [], items: [] };
    const cast: CastLike = {
      things: [{ type: "record", fields: ["name"] }],
      items: [{ id: "first", type: "record", sample: true, name: "First" }],
    };
    const malformed: CastLike = { ...cast, items: [{ ...cast.items[0]!, name: 4 }] };
    for (const source of [empty, cast, malformed])
      expect(props.parse(fallback({ cast: source })).items).toHaveLength(2);
    expect(fallback({ cast: empty }).items.map(({ label }) => label)).toEqual(["Item one", "Item two"]);
    expect(fallback({ cast }).items[0]).toEqual({ icon: "check", label: "First", danger: false });
    expect(fallback({ cast: malformed }).items[0]?.label).toBe("Item one");
  });

  it("keeps the bottom phone tier, Actions near miss, variant and danger probe", () => {
    expect(meta).toMatchObject({ region: "bottom", tier: "phone", confirmParts: ["confirm"] });
    expect(createRegistry({ packs: ["data"] }).ids.includes("BulkActions")).toBe(packReady("data"));
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Actions" }),
        expect.objectContaining({ kind: "choose", expect: "BulkActions" }),
        expect.objectContaining({ kind: "write", expect: "BulkActions" }),
        expect.objectContaining({ kind: "write", variant: { axis: "arrange", value: "rows" } }),
        expect.objectContaining({ kind: "read", expect: { address: "s1/r2/confirm", action: "press" } }),
      ]),
    );
  });
});

describe("BulkActions states and parts", () => {
  it("hides the bar without selection and renders exactly the shared selection and action parts", () => {
    const controller = createScreenController({ screen, defs });
    try {
      expect(draw(controller).size).toBe(0);
      expect(controller.press(at("all")).ok).toBe(false);
      expect(controller.press(secondCheck).ok).toBe(true);
      expect(controller.read()).toContain("1 selected — Select all [bulk/all press]");
      const active = draw(controller);
      expect(active.get(at("count"))?.text).toContain("1 selected");
      expect(active.get(at("all_label"))?.text).toContain("Select all");
      expect(active.get(at("r1/root"))?.attributes).toContain('role="button"');
      expect(active.get(at("r2/confirm"))?.attributes).toContain('role="button"');
      expect(active.get(at("r2/root"))?.attributes).not.toContain('role="button"');
      expect(active.get(at("r2/icon"))).toBeDefined();
      expect(active.get(at("r2/label"))?.text).toContain("Delete plants");
      expect([...draw(controller, { ...ledge, arrange: "rows", surface: "outlined" }).keys()].sort()).toEqual(
        [...active.keys()].sort(),
      );
      expect(draw(controller, ledge, "empty").size).toBe(0);
      expect(controller.press(at("all")).ok).toBe(true);
      expect(controller.store.get(firstCheck)).toBe(true);
      expect(controller.store.get(secondCheck)).toBe(true);
      expect(draw(controller).get(at("count"))?.text).toContain("2 selected");
      expect(draw(controller).has(at("all"))).toBe(false);
      expect(controller.press(at("all")).ok).toBe(false);
      expect(controller.snapshotScreen()).toEqual(screen);
    } finally {
      controller.dispose();
    }
  });

  it.each([
    [entry],
    [{ ...table, selectable: false }, entry],
    [{ ...table, state: "empty" }, entry],
    [table, { ...table, id: "other" }, entry],
  ] satisfies ScreenLike["components"][])(
    "does not use missing, inactive or ambiguous sources",
    (...entries) => {
      const controller = createScreenController({ screen: { id: "home", components: entries }, defs });
      try {
        controller.store.setMany({ [secondCheck]: true });
        expect(draw(controller).size).toBe(0);
        expect(controller.read()).not.toContain("[bulk/");
        expect(controller.press(at("r2/confirm")).ok).toBe(false);
      } finally {
        controller.dispose();
      }
    },
  );
});
describe("BulkActions confirmation", () => {
  it("excludes host-disabled checks and runs a dangerous command only on confirmation", () => {
    const onAction = vi.fn();
    const controller = createScreenController({ screen, defs, onAction });
    try {
      const enable = controller.registerDisabledPart(firstCheck);
      expect(controller.press(secondCheck).ok).toBe(true);
      expect(draw(controller).has(at("all"))).toBe(false);
      enable();
      expect(draw(controller).has(at("all"))).toBe(true);
      onAction.mockClear();
      expect(controller.act({ address: at("r2/root"), action: "press" }).ok).toBe(false);
      expect(controller.press(at("r1/root")).ok).toBe(true);
      expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: at("r1"), action: "press" });
      onAction.mockClear();
      expect(controller.press(at("r2/confirm")).ok).toBe(true);
      expect(controller.confirmation).toMatchObject({ source: at("r2/confirm"), kind: "danger" });
      expect(onAction).not.toHaveBeenCalled();
      expect(controller.act(cancel).ok).toBe(true);
      expect(onAction).not.toHaveBeenCalled();
      expect(controller.press(at("r2/confirm")).ok).toBe(true);
      expect(controller.act(confirm).ok).toBe(true);
      expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: at("r2/confirm"), action: "press" });
      expect(controller.press(secondCheck).ok).toBe(true);
      expect(draw(controller).size).toBe(0);
    } finally {
      controller.dispose();
    }
  });
});
