import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
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
import { propertyWordsFor } from "../../lang";
const { Viewings } = components;
const { props, meta, examples, fallback, probes } = Viewings;
const confirmed: Omit<Props<typeof props, typeof meta>["viewings"][number], "id"> = examples[0]!.viewings[0]!;
const upcoming = examples[0]!.viewings[1];
const expired = { ...upcoming!, start: "2026-10-17T14:00:00Z" };
const { viewings: words } = propertyWordsFor();
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const render = (input: unknown, state: StateName = "filled") =>
  renderInstance("Viewings", input, state, theme, { component: "v1" });
const read = (input: unknown) => readComponent(Viewings, input, "v1").join("\n");
const screenFor = (input: object) => ({ id: "home", components: [{ id: "v1", c: "Viewings", ...input }] });
const address = (part: string) => `v1/r1/${part}`;
const rowInput = (fields: object) => ({ viewings: [{ ...upcoming!, ...fields }] });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("Viewings contract and boundaries", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("defaults to brief cards and trims authored text", () => {
    expect(props.parse(rowInput({ unit: "  Cedar Flat  ", note: "Gate" }))).toMatchObject({
      detail: "brief",
      viewings: [{ unit: "Cedar Flat", note: undefined }],
    });
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["viewings"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
  // prettier-ignore
  it.each([
    { unit: " " }, { unit: "a".repeat(33) }, { prospect: "a".repeat(25) }, { note: "a".repeat(37) },
    { unitRef: "Upper-case" }, { viewingRef: "x".repeat(33) }, { goto: "Bad ID" }, { goto: "x".repeat(65) },
    { start: "2028-02-30T10:30:00+01:00" }, { start: "2028-11-21T10:30:00" },
    { minutes: 4 }, { minutes: 181 }, { minutes: 20.2 }, { status: "late" }, { status: "attended" },
    { status: "no_show" }, { id: "r1" }, { end: "" }, { pixels: 12 },
  ])("rejects an invalid row %o", (fields) => expect(props.safeParse(rowInput(fields)).success).toBe(false));
  it("requires one to six distinct viewing refs and allows recurring visits to the same unit", () => {
    // prettier-ignore
    const viewings = Array.from({ length: 6 }, (_, i) => ({
      ...upcoming!, viewingRef: `flat_${i}`, unitRef: "x".repeat(32), unit: "a".repeat(32),
      prospect: "b".repeat(24), note: "c".repeat(36), minutes: i ? 180 : 5, goto: "x".repeat(64),
    }));
    expect(props.safeParse({ viewings }).success).toBe(true);
    for (const bad of [[], [...viewings, confirmed], [upcoming, upcoming]]) {
      expect(props.safeParse({ viewings: bad }).success).toBe(false);
    }
    expect(props.safeParse({ viewings, color: "red" }).success).toBe(false);
  });
  it("keeps the readiness gate, service tier, destructive confirmation and core-first probes", () => {
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(meta.partTiers).toEqual({ invite: "service" });
    expect(meta.confirmParts).toEqual(["cancel"]);
    // prettier-ignore
    for (const probe of [
      { kind: "choose", expect: "Viewings" }, { kind: "choose", expect: "Timeline" },
      { kind: "write", expect: "Viewings" }, { kind: "write", variant: { axis: "detail", value: "full" } },
      { kind: "read", expect: { address: address("outcome"), action: "select" } },
    ]) expect(probes).toContainEqual(expect.objectContaining(probe));
  });
});

describe("Viewings fallback", () => {
  it("uses cast fields or neutral placeholders, including for malformed items", () => {
    const empty: CastLike = { things: [], items: [] };
    const populated: CastLike = {
      things: [{ type: "record", fields: ["label"] }],
      items: [{ id: "record_one", type: "record", sample: true, label: "Example" }],
    };
    const malformed: CastLike = { ...populated, items: [{ ...populated.items[0]!, label: 7 }] };
    const neutral = placeholderTitle(0);
    for (const [cast, expected] of [
      [empty, neutral],
      [malformed, neutral],
      [populated, "Example"],
    ] as const) {
      const input = fallback({ cast });
      expect(props.safeParse(input).success).toBe(true);
      expect(input.viewings[0]).toMatchObject({ unit: expected, prospect: expected });
    }
  });
});

describe("Viewings parts and states", () => {
  it("asks to record a pending outcome and offers to change an already recorded one", () => {
    const pending = render({ viewings: [expired] });
    expect(pending).toContain(`>${words.outcome}<`);
    const recorded = render({ viewings: [{ ...expired, status: "no_show" }] });
    expect(recorded).not.toContain(`>${words.outcome}<`);
    expect(addressedElements(recorded).get("home/v1/r1/outcome")?.attributes).toContain(
      `aria-label="${words.editOutcome}"`,
    );
    expect(recorded).toMatch(
      /aria-checked="true"[^>]*aria-label="No-show"|aria-label="No-show"[^>]*aria-checked="true"/,
    );
  });
  it("shows the same addressed parts under finish variants and hides notes under brief", () => {
    const input = { viewings: [confirmed], detail: "full" };
    const full = [...addressedElements(render(input)).keys()];
    // prettier-ignore
    for (const part of ["root", "unit", "prospect", "start", "end", "status", "note", "edit", "cancel", "invite"])
      expect(full).toContain(`home/${address(part)}`);
    const compactRow = render({ ...input });
    expect([...addressedElements(compactRow).keys()]).toEqual(full);
    expect([...addressedElements(render({ ...input, detail: "brief" })).keys()]).toEqual(
      full.filter((part) => !part.endsWith("/note")),
    );
    expect(read({ ...input, detail: "brief" })).not.toContain(confirmed.note);
  });
  it.each(["empty", "loading", "success", "error"] as const)(
    "draws %s with only its available actions",
    (state) => {
      const input = { viewings: [upcoming] };
      const html = render(input, state);
      const parts = addressedElements(html);
      expect(parts.has("home/v1/root")).toBe(true);
      expect(parts.has("home/v1/retry")).toBe(state === "error");
      expect(
        readComponent(Viewings, input, "v1", state)
          .join("\n")
          .match(/\[v1\/[^\]]+\]/g),
      ).toEqual(state === "error" ? ["[v1/retry press]"] : null);
      expect(html).toContain(state === "loading" ? 'aria-busy="true"' : words[state]);
      if (state === "success" || state === "error") {
        for (const label of Object.values(words.actions)) expect(html).toContain(`>${label}<`);
        for (const part of Object.keys(words.actions)) expect(parts.has(`home/${address(part)}`)).toBe(false);
      }
    },
  );
});

it("sends retry to the host in place only when the viewing update is in error", () => {
  const onAction = vi.fn();
  const onLink = vi.fn();
  const input = { viewings: [upcoming] };
  for (const state of ["error", "filled", "success"] as const) {
    const screen = { id: "home", components: [{ id: "v1", c: "Viewings", ...input, state }] };
    const controller = createScreenController({
      screen,
      defs: { Viewings },
      requireMounted: false,
      onAction,
      onLink,
    });
    expect(controller.press("v1/retry").ok).toBe(state === "error");
    controller.dispose();
  }
  expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/v1/retry", action: "press" });
  expect(onLink).not.toHaveBeenCalled();
});

describe("Viewings read and act", () => {
  it.each([
    [upcoming, ["edit", "confirm", "cancel", "invite"]],
    [confirmed, ["edit", "cancel", "invite"]],
    [expired, ["cancel", "outcome"]],
    [{ ...expired, status: "attended" }, ["outcome"]],
    [{ ...expired, status: "no_show" }, ["outcome"]],
    [{ ...expired, status: "cancelled" }, []],
  ] as const)("offers only the controls drawn for %o", (row, parts) => {
    const input = { viewings: [row] };
    const text = read(input);
    const html = addressedElements(render(input));
    const actions = { edit: "press", confirm: "press", cancel: "press", invite: "send", outcome: "select" };
    for (const [part, action] of Object.entries(actions)) {
      const offered = (parts as readonly string[]).includes(part);
      expect(text.includes(`[${address(part)} ${action}`)).toBe(offered);
      expect(html.has(`home/${address(part)}`)).toBe(offered);
      if (!offered) {
        const step = {
          address: address(part),
          action,
          ...(action === "select" ? { value: "attended" } : {}),
        };
        expect(planAct(screenFor(input), { Viewings }, {}, [step])).toMatchObject({
          ok: false,
          code: "not_actionable",
        });
      }
    }
  });
  it("links edit only, and marks invite separate from confirmation", () => {
    const input = { viewings: [upcoming] };
    const text = read(input);
    expect(text).toContain(`[${address("edit")} press→edit_viewing]`);
    expect(text).toContain(`[${address("confirm")} press]`);
    expect(text).toContain(`[${address("cancel")} press]`);
    expect(text).toContain(`[${address("invite")} send !needs-service]`);
    const edit = { address: address("edit"), action: "press" };
    expect(planAct(screenFor(input), { Viewings }, {}, [edit])).toMatchObject({
      ok: true,
      links: [{ goto: "edit_viewing", address: `home/${edit.address}` }],
    });
    for (const part of ["confirm", "cancel", "invite"]) {
      expect(
        planAct(screenFor(input), { Viewings }, {}, [
          { address: address(part), action: part === "invite" ? "send" : "press" },
        ]),
      ).toMatchObject({ ok: true, links: [] });
    }
  });
});

it("records only the two attendance outcomes on the right row, at or after the start", () => {
  vi.setSystemTime(new Date(expired.start));
  const second = { ...expired, viewingRef: "earlier", start: "2026-10-17T12:00:00Z" };
  const input = { viewings: [expired, second] };
  const outcome = address("outcome");
  expect(read(input)).toContain(words.past);
  expect(render(input).indexOf("home/v1/r2/root")).toBeLessThan(render(input).indexOf("home/v1/r1/root"));
  const plan = (value: string) =>
    planAct(screenFor(input), { Viewings }, {}, [{ address: outcome, action: "select", value }]);
  expect(plan("")).toMatchObject({ ok: false, code: "invalid_value" });
  for (const value of ["attended", "no_show"] as const) {
    const result = plan(value);
    expect(result).toMatchObject({ ok: true, links: [], values: { [`home/${outcome}`]: value } });
    if (!result.ok) continue;
    const local = Object.fromEntries(Object.entries(result.values).map(([key, v]) => [key.slice(5), v]));
    const text = readComponent(Viewings, input, "v1", "filled", local).join("\n");
    expect(text).toContain(`[${outcome} select = "${value}"]`);
    expect(text).toContain(`[${address("cancel")} press]`);
    expect(text).toContain("[v1/r2/cancel press]");
  }
});
