import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  themeName,
  wordsFor,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController, KitProvider, renderers, Screen } from "@lmthing/ui/kit";
import { addressedElements, config, renderInstance } from "../../../../../test/render";

const { Offer } = components;
const { props, meta, examples, fallback, probes } = Offer;
const full: ReturnType<typeof fallback> = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const parts = (input = full, state: StateName = "filled") =>
  addressedElements(renderInstance("Offer", input, state, theme, { component: "o1" }));
const read = (input = full, state: StateName = "filled") =>
  readComponent(Offer, input, "o1", state).join("\n");
const controller = (input = full, options?: Partial<Parameters<typeof createScreenController>[0]>) =>
  createScreenController({
    screen: { id: "home", components: [{ ...input, id: "o1", c: "Offer" }] },
    defs: { Offer },
    ...options,
  });

beforeEach(() => vi.useFakeTimers({ now: new Date(2027, 4, 1, 12) }));
afterEach(() => vi.useRealTimers());

describe("Offer contract", () => {
  it.each(examples)("parses a hiring example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("preserves the registry gate, tiers and core and variant probes", () => {
    expect(createRegistry({ packs: ["hiring"] }).ids.includes(meta.id)).toBe(packReady("hiring"));
    expect(meta.tier).toBe("phone");
    expect(meta.partTiers).toEqual({
      send: "service",
      accept: "people",
      decline: "people",
      withdraw: "service",
    });
    expect(meta.confirmParts).toEqual(["decline", "withdraw"]);
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Offer" }),
        expect.objectContaining({ kind: "choose", expect: "Amount" }),
        expect.objectContaining({ kind: "write", variant: { axis: "arrange", value: "grid" } }),
        expect.objectContaining({ kind: "read", expect: { address: "o1/withdraw", action: "press" } }),
      ]),
    );
  });
});

describe("Offer bounds and fallback", () => {
  it("accepts exact limits and rejects invalid or derived values on the wire", () => {
    const atLimit = "x".repeat(32);
    expect(
      props.safeParse({
        ...full,
        offerId: atLimit,
        applicationId: atLimit,
        role: atLimit,
        employer: atLimit,
        candidate: "x".repeat(24),
        hoursPerWeek: 80,
        conditions: Array(6).fill("x".repeat(100)),
      }).success,
    ).toBe(true);
    for (const invalid of [
      { offerId: "x".repeat(33) },
      { candidate: "x".repeat(25) },
      { employer: "x".repeat(33) },
      { conditions: ["x".repeat(101)] },
      { conditions: Array(7).fill("Check") },
      { pay: -1 },
      { pay: Infinity },
      { per: "week" },
      { hoursPerWeek: 0 },
      { hoursPerWeek: 81 },
      { start: "2027-02-29" },
      { goto: "Edit offer" },
      { status: "hired" },
      { expired: false },
      { currency: "GBP" },
      { color: "green" },
    ])
      expect(props.safeParse({ ...full, ...invalid }).success).toBe(false);
  });
  it("takes usable content from the cast and uses neutral placeholders otherwise", () => {
    const things = [{ type: "record", fields: ["first", "second"] }];
    for (const values of [{ first: "Row name", second: "Row detail" }, { first: 4 }, undefined]) {
      const items = values ? [{ id: "a", type: "record", sample: true, ...values }] : [];
      expect(props.parse(fallback({ cast: { things, items }, lang: "en-GB" }))).toMatchObject({
        candidate: typeof values?.first === "string" ? values.first : placeholderTitle(0, "en-GB"),
        role: values?.second ?? wordsFor("en-GB").placeholderDetail,
        employer: placeholderTitle(1, "en-GB"),
        status: "draft",
      });
    }
  });
});

describe("Offer parts and states", () => {
  it("keeps every visible address in the grid and both finish variants", () => {
    const expected = meta.parts
      .filter((part) => !/^(edit|send|success|error)/.test(part))
      .map((part) => `home/o1/${part}`);
    const drawn = [...parts().keys()];
    expect(new Set(drawn)).toEqual(new Set(expected));
    expect([...parts({ ...full, arrange: "grid", surface: "outlined", density: "compact" }).keys()]).toEqual(
      drawn,
    );
    expect(parts({ ...full, conditions: [], respondBy: undefined }).has("home/o1/conditions")).toBe(false);
    expect(parts({ ...full, conditions: [], respondBy: undefined }).has("home/o1/respond_by")).toBe(false);
  });
  it.each(["loading", "success", "error"] as const)("contains no actions in %s", (state) => {
    expect([...parts(full, state).keys()]).toEqual(
      state === "loading" ? ["home/o1/root"] : ["home/o1/root", `home/o1/${state}`],
    );
    expect(read(full, state)).not.toContain("[o1/");
    const current = controller(full, {
      screen: { id: "home", components: [{ ...full, id: "o1", c: "Offer", state }] },
    });
    try {
      expect(current.press("o1/withdraw").ok).toBe(false);
    } finally {
      current.dispose();
    }
  });
  it("renders and reads using the same host currency", () => {
    const current = controller(full, { currency: "GBP", lang: "en-GB", interactive: false });
    try {
      const body = createElement(KitProvider, {
        theme,
        lang: "en-GB",
        controller: current,
        children: createElement(Screen, { controller: current, renderers }),
      });
      const html = renderToStaticMarkup(
        createElement(TamaguiProvider, { config, defaultTheme: themeName(theme) }, body),
      );
      expect(addressedElements(html).get("home/o1/pay")?.text).toEqual(["£20 / hr"]);
      expect(current.read()).toContain("£20 / hr");
      expect(current.read()).toContain("Respond by 1 May 2027");
    } finally {
      current.dispose();
    }
  });
});
