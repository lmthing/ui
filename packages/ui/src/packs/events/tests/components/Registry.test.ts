import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  emptyLine,
  moneyLine,
  packReady,
  placeholderTitle,
  planAct,
  readComponent,
  type CastLike,
  type Props,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { pack } from "../..";
import { eventsWordsFor } from "../../lang";

const { Registry } = components;
const { props, meta, examples, fallback, probes } = Registry;
type Input = ReturnType<typeof fallback>;
const guest: Input = examples[0]!;
const host: Input = { ...guest, host: true };
const [first, second] = examples[0]!.gifts;
const owner = "Imani Cole";
const withNames = {
  ...guest,
  gifts: [
    { ...first!, by: owner },
    { ...second!, by: owner },
  ],
};
const words = eventsWordsFor().registry;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const render = (input: Input = guest, state: StateName = "filled", lang?: string) =>
  renderInstance("Registry", input, state, theme, { component: "r1", ...(lang ? { lang } : {}) });
const read = (input: Input = guest, state: StateName = "filled", lang?: string) =>
  readComponent(Registry, input, "r1", state, {}, lang).join("\n");
const screen = (input: Input, state: StateName = "filled") => ({
  id: "home",
  components: [{ id: "r1", c: "Registry", state, ...input }],
});
const plan = (target: string, input: Input, state?: StateName) =>
  planAct(screen(input, state), { Registry }, {}, [{ address: `r1/${target}`, action: "press" }]);
const address = (part: string) => `home/r1/${part}`;

describe("Registry schema and boundaries", () => {
  it.each(examples)("accepts each gift list", (input) => expect(props.safeParse(input).success).toBe(true));
  it("trims authored text and limits ownership data to claimed gifts in the host view", () => {
    const input = { ...withNames, gifts: withNames.gifts.map((gift) => ({ ...gift, title: " Gift " })) };
    const parsed = props.parse({ ...input, host: true });
    expect(parsed).toMatchObject({ surface: "card", lead: "thumb" });
    expect(parsed.density).toBeUndefined(); // Inherits a supported theme setting.
    expect(parsed.gifts.map(({ title, by }) => [title, by])).toEqual([
      ["Gift", undefined],
      ["Gift", owner],
    ]);
    expect(props.parse(input).gifts.every(({ by }) => by === undefined)).toBe(true);
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["gifts"][number]["id"]>().toEqualTypeOf<string>();
  });
  // prettier-ignore
  it.each([
    { title: "" }, { title: "x".repeat(29) }, { where: "x".repeat(25) }, { by: "x".repeat(17) },
    { price: -1 }, { price: Infinity }, { price: "$45" }, { claimed: "yes" }, { claimed: undefined },
    { photo: "https://example.org/gift" }, { photo: `lib:${"x".repeat(65)}` },
    { id: "r1" }, { color: "red" }, { pixels: 12 },
  ])("rejects invalid gift fields %o", (fields) =>
    expect(props.safeParse({ ...guest, gifts: [{ ...first, ...fields }] }).success).toBe(false),
  );
  it("accepts the maximum row count and field lengths but rejects unknown axes and keys", () => {
    const gift = {
      title: "x".repeat(28),
      where: "x".repeat(24),
      by: "x".repeat(16),
      claimed: true,
      photo: "local:1",
      price: 0,
    };
    expect(props.safeParse({ host: true, gifts: Array(12).fill(gift) }).success).toBe(true);
    for (const fields of [
      { gifts: [] },
      { gifts: Array(13).fill(gift) },
      { host: undefined },
      { lead: "icon" },
      { density: "tiny" },
      { surface: "tinted" },
      { style: "compact" },
      { currency: "GBP" },
    ])
      expect(props.safeParse({ ...guest, ...fields }).success).toBe(false);
  });
});

describe("Registry fallback and metadata", () => {
  it("seeds available gift titles from the cast or uses neutral copy", () => {
    const empty = { things: [], items: [] };
    const cast: CastLike = {
      things: [{ type: "record", fields: ["label"] }],
      items: [{ id: "g", type: "record", sample: true, label: "  Gift voucher  " }],
    };
    const malformed: CastLike = { ...cast, items: [{ ...cast.items[0]!, label: 7 }] };
    for (const [seed, title] of [
      [cast, "Gift voucher"],
      [empty, placeholderTitle(0)],
      [malformed, placeholderTitle(0)],
    ] as const) {
      const input = fallback({ cast: seed });
      expect(props.safeParse(input).success).toBe(true);
      expect(input).toEqual({ gifts: [{ title, claimed: false }], host: false });
    }
  });
  it("preserves the people tier, pack gate and core-first probes", () => {
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(meta).toMatchObject({ tier: "people", dense: true, weight: 3, confirmParts: ["unclaim"] });
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    // prettier-ignore
    for (const probe of [
      { kind: "choose", expect: "Registry" }, { kind: "choose", expect: "Checklist" },
      { kind: "write", expect: "Registry" }, { kind: "write", variant: { axis: "lead", value: "none" } },
      { kind: "read", expect: { address: "r1/r1/claim", action: "press" } },
    ]) expect(probes).toContainEqual(expect.objectContaining(probe));
  });
});

describe("Registry parts and states", () => {
  it("keeps row addresses across finishes and removes only thumbnails with lead none", () => {
    const parts = [...addressedElements(render()).keys()];
    // prettier-ignore
    expect(parts.map((part) => part.slice(address("").length))).toEqual([
      "root", "r1/root", "r1/photo", "r1/title", "r1/price", "r1/where", "r1/claim", "r1/claim_label",
      "r2/root", "r2/photo", "r2/title", "r2/price", "r2/claimed",
    ]);
    expect([
      ...addressedElements(render({ ...guest, surface: "outlined", density: "compact" })).keys(),
    ]).toEqual(parts);
    const hidden: Input = { ...guest, lead: "none" };
    expect([...addressedElements(render(hidden)).keys()]).toEqual(
      parts.filter((part) => !part.endsWith("/photo")),
    );
    expect(props.parse(hidden).gifts[0]!.photo).toBe(first!.photo);
    expect(read(hidden)).not.toContain("photo:");
  });
  it.each(["empty", "success"] as const)("shows only feedback and has no gift actions in %s", (state) => {
    const html = render(host, state);
    expect([...addressedElements(html).keys()]).toEqual([address("root"), address(state)]);
    expect(html).toContain(state === "empty" ? emptyLine() : words.released);
    if (state === "success") expect(render(guest, state)).toContain(words.success);
    expect(html).not.toContain('role="button"');
    expect(read(host, state)).toBe(`r1 Registry (${state})`);
    expect(plan("r2/unclaim", host, state)).toMatchObject({ ok: false, code: "not_actionable" });
    expect(plan("r1/claim", guest, state)).toMatchObject({ ok: false, code: "not_actionable" });
  });
});

describe("Registry read and act", () => {
  it.each([false, true])("draws and offers only the allowed action with host=%s", (isHost) => {
    const input = { ...withNames, host: isHost };
    const html = render(input, "filled", "en-GB");
    const drawn = addressedElements(html);
    const text = read(input, "filled", "en-GB");
    const price = moneyLine(first!.price!, undefined, undefined, "en-GB");
    for (const value of [first!.title, first!.where!, price, words.claimed]) {
      expect(html).toContain(value);
      expect(text).toContain(value);
    }
    expect(text.includes(owner)).toBe(isHost);
    expect(html.includes(owner)).toBe(isHost);
    expect(drawn.has(address("r1/by"))).toBe(false);
    expect(drawn.get(address("r2/by"))?.text).toEqual(isHost ? [words.owner(owner)] : undefined);
    for (const target of ["r1/claim", "r2/claim", "r1/unclaim", "r2/unclaim"]) {
      const offered = target === (isHost ? "r2/unclaim" : "r1/claim");
      expect(drawn.get(address(target))?.attributes.includes('role="button"') ?? false).toBe(offered);
      expect(text.includes(`[r1/${target} press !needs-people]`)).toBe(offered);
      expect(plan(target, input)).toMatchObject(
        offered ? { ok: true } : { ok: false, code: "not_actionable" },
      );
    }
  });
  it("dispatches Claim directly and Release only after confirmation", () => {
    const onAction = vi.fn();
    const mount = (input: Input) =>
      createScreenController({ screen: screen(input), defs: { Registry }, onAction });
    const guestController = mount(guest);
    expect(guestController.press("r1/r1/claim").ok).toBe(true);
    expect(guestController.confirmation).toBeUndefined();
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: address("r1/claim"), action: "press" });
    onAction.mockClear();
    const hostController = mount(host);
    expect(hostController.press("r1/r2/unclaim").ok).toBe(true);
    expect(hostController.confirmation?.source).toBe(address("r2/unclaim"));
    expect(hostController.press("confirm/cancel").ok).toBe(true);
    expect(onAction).not.toHaveBeenCalled();
    expect(hostController.press("r1/r2/unclaim").ok).toBe(true);
    expect(hostController.press("confirm/confirm").ok).toBe(true);
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: address("r2/unclaim"), action: "press" });
  });
});
