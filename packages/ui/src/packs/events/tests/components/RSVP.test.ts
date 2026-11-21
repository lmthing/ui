import { describe, expect, it, vi } from "vitest";
import {
  appointmentDate,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { pack } from "../..";
import { eventsWordsFor } from "../../lang";

const { RSVP } = components;
const { props, examples, fallback, meta, probes } = RSVP;
type Input = ReturnType<typeof fallback>;
const invitation: Input = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const address = (part: string) => `home/r1/${part}`;
const render = (input = invitation, state: StateName = "filled") =>
  renderInstance("RSVP", input, state, theme, { component: "r1", lang: "en-GB" });
const mount = (input = invitation, state: StateName = "filled", onAction = vi.fn()) =>
  createScreenController({
    screen: { id: "home", components: [{ id: "r1", c: "RSVP", state, ...input }] },
    defs: { RSVP },
    onAction,
  });

describe("RSVP contract and fallback", () => {
  it.each(examples)("accepts a real invitation", (input) =>
    expect(props.safeParse(input).success).toBe(true),
  );
  it("trims text and accepts the exact limits", () => {
    expect(
      props.parse({
        ...invitation,
        event: ` ${"x".repeat(32)} `,
        plusMax: 4,
        meals: Array(4).fill("x".repeat(20)),
      }),
    ).toMatchObject({
      event: "x".repeat(32),
      allowsPlus: true,
      allowsMeals: true,
      surface: "card",
      detail: "full",
    });
  });
  // prettier-ignore
  it.each([
    { event: "" }, { event: "x".repeat(33) }, { date: "2027-02-29" }, { plusMax: -1 },
    { plusMax: 5 }, { plusMax: 1.5 }, { meals: Array(5).fill("Pasta") }, { meals: ["x".repeat(21)] },
    { answer: "maybe" }, { selectedMeal: "Pasta" }, { detail: "tiny" }, { color: "red" },
  ])("rejects invalid input %o", (fields) => expect(props.safeParse({ ...invitation, ...fields }).success).toBe(false));

  it("uses a cast title or a neutral placeholder for empty and malformed casts", () => {
    const item = { id: "a", type: "event", sample: true, title: "  Garden opening  " };
    for (const [items, title] of [
      [[item], "Garden opening"],
      [[{ ...item, title: 5 }], placeholderTitle(0)],
      [[], placeholderTitle(0)],
    ] as const) {
      const input = fallback({ cast: { things: [], items: [...items] } });
      expect(props.safeParse(input).success).toBe(true);
      expect(input).toMatchObject({ event: title, answer: "none", plusMax: 0, meals: [] });
    }
  });

  it("keeps the pack readiness gate, people tier and core-first near miss", () => {
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(meta).toMatchObject({ tier: "people", confirmParts: ["no"] });
    for (const probe of [
      { kind: "choose", expect: "RSVP" },
      { kind: "choose", expect: "Choice" },
      { kind: "write", expect: "RSVP" },
      { kind: "write", variant: { axis: "detail", value: "brief" } },
      { kind: "read", expect: { address: "r1/no", action: "press" } },
    ])
      expect(probes).toContainEqual(expect.objectContaining(probe));
  });
});

describe("RSVP states and parts", () => {
  it("keeps addresses across finishes and shows the same date in the view and reading", () => {
    const parts = [...addressedElements(render()).keys()];
    expect(parts).toEqual(
      [
        "root",
        "event",
        "date",
        "yes",
        "yes_label",
        "no",
        "no_label",
        "plus",
        "meal",
        "note",
        "send",
        "send_label",
      ].map(address),
    );
    expect([
      ...addressedElements(render({ ...invitation, surface: "outlined", density: "compact" })).keys(),
    ]).toEqual(parts);
    const date = appointmentDate(invitation.date, "en-GB");
    expect(addressedElements(render()).get(address("date"))?.text).toEqual([date]);
    expect(readComponent(RSVP, invitation, "r1", "filled", {}, "en-GB").join()).toContain(date);
  });
  it.each([
    [{ ...invitation, answer: "no" as const }, ["plus", "meal"]],
    [{ ...invitation, plusMax: 0 }, ["plus"]],
    [{ ...invitation, meals: new Array<string>() }, ["meal"]],
    [{ ...invitation, detail: "brief" as const }, ["note"]],
  ] as const)("does not draw or offer hidden controls", (input, hidden) => {
    const parts = addressedElements(render(input));
    const controller = mount(input);
    for (const part of ["yes", "no", "plus", "meal", "note", "send"] as const) {
      const visible = !(hidden as readonly string[]).includes(part);
      expect(parts.has(address(part))).toBe(visible);
      expect(controller.actionsAt(address(part)).length > 0).toBe(visible);
    }
  });
  it("shows sent feedback without letting someone send again", () => {
    const parts = addressedElements(render(invitation, "success"));
    const { rsvp } = eventsWordsFor();
    expect([...parts.keys()]).toEqual(["root", "success", "event", "date"].map(address));
    expect(parts.get(address("success"))?.text).toEqual([rsvp.sent]);
    expect(readComponent(RSVP, invitation, "r1", "success").join()).toContain(rsvp.sent);
    expect(mount(invitation, "success").press("r1/send").ok).toBe(false);
  });
});

describe("RSVP read and act", () => {
  it("validates and projects typed notes, meal choices and whole companions without changing the seed", () => {
    const controller = mount();
    const act = (part: string, action: "set" | "select" | "type", value: string | number) =>
      controller.act({ address: `r1/${part}`, action, value });
    expect(act("plus", "set", 2).ok).toBe(true);
    for (const invalid of [-1, 3, 1.5, "2"]) expect(act("plus", "set", invalid).ok).toBe(false);
    expect(act("meal", "select", invitation.meals[0]!).ok).toBe(true);
    expect(act("meal", "select", "Not offered").ok).toBe(false);
    expect(act("note", "type", "x".repeat(200)).ok).toBe(true);
    expect(act("note", "type", "x".repeat(201)).ok).toBe(false);
    expect(controller.liveControls(meta, props.parse(invitation), "r1")).toMatchObject({
      companions: 2,
      selectedMeal: invitation.meals[0],
      note: "x".repeat(200),
    });
    expect(props.parse(invitation)).not.toHaveProperty("selectedMeal");
  });
  it("only dispatches declining after confirmation and sends as a people-tier press", () => {
    const onAction = vi.fn();
    const controller = mount(invitation, "filled", onAction);
    expect(controller.press("r1/no").ok).toBe(true);
    expect(controller.confirmation?.source).toBe(address("no"));
    expect(controller.press("confirm/cancel").ok).toBe(true);
    expect(onAction).not.toHaveBeenCalled();
    expect(controller.press("r1/no").ok).toBe(true);
    expect(controller.press("confirm/confirm").ok).toBe(true);
    expect(onAction).toHaveBeenCalledWith({ address: address("no"), action: "press" });
    expect(controller.press("r1/yes").ok).toBe(true);
    expect(controller.confirmation).toBeUndefined();
    expect(controller.press("r1/send").ok).toBe(true);
    expect(onAction).toHaveBeenCalledWith({ address: address("send"), action: "press" });
    expect(readComponent(RSVP, invitation, "r1").join()).toContain("[r1/send press !needs-people]");
  });
});
