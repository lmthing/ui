import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  type Props,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { pack } from "../..";

const { GuestList } = components;
const { meta, props, fallback, examples, probes } = GuestList;
type Input = ReturnType<typeof fallback>;
const waiting: Input = examples[0]!;
const answered: Input = examples[1]!;
const first = waiting.guests[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const address = (part: string) => `home/g1/${part}`;
const render = (input = waiting, state: StateName = "filled") =>
  renderInstance("GuestList", input, state, theme, { component: "g1" });
const read = (input = waiting, state: StateName = "filled") =>
  readComponent(GuestList, input, "g1", state).join("\n");
const mount = (input = waiting, state: StateName = "filled", onAction = vi.fn(), onLink = vi.fn()) =>
  createScreenController({
    screen: { id: "home", components: [{ id: "g1", c: "GuestList", state, ...input }] },
    defs: { GuestList },
    onAction,
    onLink,
  });

describe("GuestList contract and fallback", () => {
  it.each(examples)("accepts each event roster", (input) =>
    expect(props.safeParse(input).success).toBe(true),
  );
  // prettier-ignore
  it.each([
    { name: "" }, { name: "x".repeat(25) }, { party: "x".repeat(17) }, { diet: "x".repeat(17) },
    { plus: 5 }, { plus: -1 }, { plus: 1.5 }, { status: "arrived" }, { goto: "Bad ID" },
    { id: "r1" }, { color: "red" }, { pixels: 12 },
  ])("rejects invalid guest fields %o", (fields) =>
    expect(props.safeParse({ guests: [{ ...first, ...fields }] }).success).toBe(false),
  );
  it("enforces dense boundaries and keeps item ids off the wire", () => {
    const row = {
      name: "x".repeat(24),
      party: "x".repeat(16),
      diet: "x".repeat(16),
      status: "yes",
      plus: 4,
      goto: "details",
    };
    expect(props.safeParse({ guests: Array(30).fill(row) }).success).toBe(true);
    expect(props.safeParse({ guests: Array(31).fill(row) }).success).toBe(false);
    expect(props.safeParse({ guests: [] }).success).toBe(false);
    expect(props.safeParse({ ...waiting, hasWaiting: false }).success).toBe(false);
    expect(props.safeParse({ ...waiting, detail: "all" }).success).toBe(false);
    expectTypeOf<Props<typeof props, typeof meta>["guests"][number]["id"]>().toEqualTypeOf<string>();
  });
  it("uses cast titles or a neutral placeholder and records no invented replies", () => {
    const item = { id: "guest", type: "record", sample: true, title: "  Alex Alba  " };
    for (const [items, name] of [
      [[item], "Alex Alba"],
      [[{ ...item, title: 5 }], placeholderTitle(0)],
      [[], placeholderTitle(0)],
    ] as const) {
      const input = fallback({ cast: { things: [], items: [...items] } });
      expect(props.safeParse(input).success).toBe(true);
      expect(input.guests).toEqual([{ name, status: "waiting", plus: 0, goto: "details" }]);
    }
  });
  it("keeps the service-tier reminder, pack gate and core-first probe", () => {
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(meta).toMatchObject({ tier: "people", dense: true, weight: 3, partTiers: { remind: "service" } });
    for (const probe of [
      { kind: "choose", expect: "GuestList" },
      { kind: "choose", expect: "People" },
      { kind: "write", expect: "GuestList" },
      { kind: "write", variant: { axis: "detail", value: "brief" } },
      { kind: "read", expect: { address: "g1/remind", action: "press" } },
    ])
      expect(probes).toContainEqual(expect.objectContaining(probe));
  });
});

describe("GuestList states, parts and actions", () => {
  it("draws totals, party headings and status pills with stable row addresses", () => {
    const parts = addressedElements(render());
    expect(parts.get(address("r1/party"))?.text).toEqual([first.party]);
    expect(parts.has(address("r2/party"))).toBe(false);
    expect(parts.get(address("r1/name"))?.text).toEqual([first.name]);
    expect(parts.get(address("r1/plus"))?.text).toEqual(["+1"]);
    expect(parts.get(address("r1/diet"))?.text).toEqual([first.diet]);
    expect(parts.has(address("r2/status"))).toBe(true);
    expect(parts.has(address("counts"))).toBe(true);
    expect([
      ...addressedElements(render({ ...waiting, density: "compact", surface: "outlined" })).keys(),
    ]).toEqual([...parts.keys()]);
    const brief: Input = { ...waiting, detail: "brief" };
    expect([...addressedElements(render(brief)).keys()]).toEqual(
      [...parts.keys()].filter((part) => !part.endsWith("/diet")),
    );
    expect(props.parse(brief).guests[0]!.diet).toBe(first.diet);
    expect(read(brief)).not.toContain(first.diet!);
  });
  it.each(["empty", "loading"] as const)("hides named guests and all actions in %s", (state) => {
    expect([...addressedElements(render(waiting, state)).keys()]).toEqual(
      (state === "empty" ? ["root", "empty"] : ["root"]).map(address),
    );
    expect(read(waiting, state)).toBe(`g1 GuestList (${state})`);
    expect(mount(waiting, state).press("g1/remind").ok).toBe(false);
    expect(mount(waiting, state).press("g1/r1").ok).toBe(false);
  });
  it("opens the addressed guest and offers reminders only when at least one guest is waiting", () => {
    const onAction = vi.fn();
    const controller = mount(waiting, "filled", onAction);
    expect(read()).toContain("[g1/remind press !needs-service]");
    expect(read()).toContain("[g1/r1 press");
    expect(controller.press("g1/remind").ok).toBe(true);
    expect(onAction).toHaveBeenCalledWith({ address: address("remind"), action: "press" });
    expect(controller.press("g1/r1").ok).toBe(true);
    expect(read(answered)).not.toContain("g1/remind");
    expect(addressedElements(render(answered)).has(address("remind"))).toBe(false);
    expect(mount(answered).press("g1/remind").ok).toBe(false);
  });
});

describe("GuestList host decisions", () => {
  it("counts new statuses and exposes decisions only for the pending RSVP", () => {
    const html = render(answered);
    const parts = addressedElements(html);
    expect(parts.has(address("r3/status"))).toBe(true);
    expect(parts.has(address("r4/status"))).toBe(true);
    expect(html).toContain(">Pending approval<");
    expect(html).toContain(">Waitlisted<");
    expect(parts.has(address("r3/approve"))).toBe(true);
    expect(parts.has(address("r3/decline"))).toBe(true);
    expect(read(answered)).toContain("1 Pending approval");
    expect(read(answered)).toContain("1 Waitlisted");
    expect(read(answered)).toContain("[g1/r3/approve press !needs-people]");
    for (const row of ["r1", "r2", "r4"])
      for (const verb of ["approve", "decline"]) {
        expect(parts.has(address(`${row}/${verb}`))).toBe(false);
        expect(mount(answered).press(`g1/${row}/${verb}`).ok).toBe(false);
      }
    expect(addressedElements(render(answered, "loading")).has(address("r3/approve"))).toBe(false);
    expect(mount(answered, "loading").press("g1/r3/approve").ok).toBe(false);
  });
  it("dispatches approval immediately and only dispatches decline after confirmation", () => {
    const onAction = vi.fn(),
      onLink = vi.fn();
    const controller = mount(answered, "filled", onAction, onLink);
    expect(controller.press("g1/r3/approve").ok).toBe(true);
    expect(onAction).toHaveBeenCalledWith({ address: address("r3/approve"), action: "press" });
    onAction.mockClear();
    expect(controller.press("g1/r3/decline").ok).toBe(true);
    expect(controller.confirmation?.source).toBe(address("r3/decline"));
    expect(onAction).not.toHaveBeenCalled();
    expect(controller.press("confirm/cancel").ok).toBe(true);
    expect(onAction).not.toHaveBeenCalled();
    expect(controller.press("g1/r3/decline").ok).toBe(true);
    expect(controller.press("confirm/confirm").ok).toBe(true);
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: address("r3/decline"), action: "press" });
    expect(onLink).not.toHaveBeenCalled();
    expect(controller.press("g1/r3").ok).toBe(true);
    expect(onLink).toHaveBeenCalledExactlyOnceWith("lee", address("r3"));
  });
});
