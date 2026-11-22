import {
  components,
  createRegistry,
  packReady,
  planAct,
  readScreen,
  type CastLike,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { describe, expect, it } from "vitest";

const def = components.Assignments;
const { meta, props, fallback, examples, probes } = def;
const [ledge, trot] = examples;
const task = ledge!.items[0]!;
const graded = ledge!.items[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const screen = (state: "filled" | "empty" = "filled") => ({
  id: "homework",
  components: [{ id: "a1", c: "Assignments", state, ...ledge! }],
});
const defs = { Assignments: def };
const render = (input: unknown, state: "filled" | "empty" = "filled") =>
  addressedElements(renderInstance("Assignments", input, state, theme));

describe("Assignments contract and limits", () => {
  it.each(examples)("parses each domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );

  it("accepts the exact row and text maxima, trims titles, and defaults to subject marks", () => {
    const item = { ...graded, title: ` ${"a".repeat(28)} `, subject: "b".repeat(20), grade: "A".repeat(6) };
    expect(props.parse({ items: Array.from({ length: 6 }, () => item) })).toMatchObject({
      lead: "icon",
      items: Array.from({ length: 6 }, () => ({ ...item, title: item.title.trim() })),
    });
  });

  it.each([
    {},
    { items: [] },
    { items: Array.from({ length: 7 }, () => task) },
    { items: [{ ...task, title: "a".repeat(29) }] },
    { items: [{ ...task, subject: "a".repeat(21) }] },
    { items: [{ ...graded, grade: "a".repeat(7) }] },
    { items: [{ ...task, grade: "A" }] },
    { items: [{ ...task, status: "done", grade: "A" }] },
    { items: [{ ...task, status: "overdue" }] },
    { items: [{ ...task, due: "2026-02-30" }] },
    { items: [{ ...task, due: "tomorrow" }] },
    { items: [{ ...task, goto: undefined }] },
    { items: [{ ...task, goto: "Invalid Link" }] },
    { items: [{ ...task, id: "r1" }] },
    { items: [{ ...task, done: true }] },
    { lead: "hidden", items: [task] },
    { color: "red", items: [task] },
  ])("rejects invalid wire data", (input) => expect(props.safeParse(input).success).toBe(false));
});

describe("Assignments fallback and probes", () => {
  it("builds bounded rows from the cast and neutral rows for missing fields", () => {
    const empty: CastLike = { things: [], items: [] };
    const full: CastLike = {
      things: [{ type: "coursework", fields: ["name", "category"] }],
      items: Array.from({ length: 7 }, (_, i) => ({
        id: `exercise_${i}`,
        type: "coursework",
        sample: true,
        name: "Exercise",
        category: "Reading",
      })),
    };
    const malformed: CastLike = {
      things: [],
      items: [{ id: "exercise", type: "coursework", sample: true, name: 42 }],
    };
    for (const cast of [empty, full, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: empty }).items[0]).toMatchObject({
      title: "Item one",
      status: "todo",
      goto: "back",
    });
    expect(fallback({ cast: full }).items).toHaveLength(4);
    expect(fallback({ cast: full }).items[0]).toMatchObject({ title: "Exercise", subject: "Reading" });
  });

  it("keeps phone tier, a core near miss, and the pack readiness gate", () => {
    expect(meta.tier).toBe("phone");
    expect(meta.realPath).not.toBe("");
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Assignments" }),
        expect.objectContaining({ kind: "choose", expect: "Checklist" }),
        expect.objectContaining({ kind: "write", variant: { axis: "lead", value: "none" } }),
        expect.objectContaining({ kind: "read", expect: { address: "a1/r1/done", action: "check" } }),
      ]),
    );
    expect(createRegistry({ packs: ["learning"] }).ids.includes("Assignments")).toBe(packReady("learning"));
  });
});

describe("Assignments rendering and read/act", () => {
  it("draws the assigned parts, checked and unchecked controls, and a non-actionable grade", () => {
    const parts = render(ledge);
    const row = "home/c1/r1";
    for (const part of ["root", "mark", "title", "subject", "due", "status", "done"])
      expect(parts.has(`${row}/${part}`)).toBe(true);
    expect(parts.get(`${row}/root`)?.attributes).toContain('role="link"');
    expect(parts.get(`${row}/done`)?.attributes).toContain('aria-checked="false"');
    expect(render(trot).get(`${row}/done`)?.attributes).toContain('aria-checked="true"');
    expect(parts.get("home/c1/r2/grade")).toBeDefined();
    expect(parts.get("home/c1/r2/done")).toBeUndefined();
    const noGrade = render({ items: [{ ...graded, grade: undefined }] });
    expect(noGrade.get(`${row}/grade`)).toBeUndefined();
    expect(noGrade.get(`${row}/done`)?.attributes).not.toContain('role="checkbox"');
  });

  it("hides only the subject marks without moving the link or check", () => {
    const input = { ...ledge!, lead: "none" };
    const normal = [...render(ledge).keys()];
    expect([...render(input).keys()]).toEqual(normal.filter((part) => !part.endsWith("/mark")));
    const read = readScreen({ id: "homework", components: [{ id: "a1", c: "Assignments", ...input }] }, defs);
    expect(read).toContain(task.subject);
    expect(read).toContain("[a1/r1 press→worksheet]");
    expect(read).toContain("[a1/r1/done check]");
  });

  it("keeps the empty state free of item parts and actions", () => {
    expect([...render(ledge, "empty").keys()]).toEqual(["home/c1/root", "home/c1/message"]);
    expect(readScreen(screen("empty"), defs)).not.toContain("/r1");
    const result = planAct(screen("empty"), defs, {}, [{ address: "a1/r1/done", action: "check" }], null);
    expect(result).toMatchObject({ ok: false, code: "not_actionable" });
  });

  it("checks and unchecks open work without navigating, and rejects checks on graded rows", () => {
    const check = { address: "a1/r1/done", action: "check" } as const;
    const handedIn = planAct(screen(), defs, {}, [check], null);
    expect(handedIn.ok).toBe(true);
    if (!handedIn.ok) return;
    expect(handedIn.values["homework/a1/r1/done"]).toBe(true);
    expect(handedIn.links).toEqual([]);
    expect(readScreen(screen(), defs, handedIn.values)).toContain("[a1/r1/done check:done]");
    const undone = planAct(screen(), defs, handedIn.values, [{ ...check, value: false }], null);
    expect(undone.ok).toBe(true);
    if (undone.ok) expect(readScreen(screen(), defs, undone.values)).toContain("[a1/r1/done check:todo]");
    expect(planAct(screen(), defs, {}, [{ ...check, address: "a1/r2/done" }], null).ok).toBe(false);
    expect(readScreen(screen(), defs)).toContain("[a1/r2 press→light_log]");
  });

  it("opens assignment details without setting the hand-in check", () => {
    const result = planAct(screen(), defs, {}, [{ address: "a1/r1", action: "press" }], null);
    expect(result).toMatchObject({ ok: true, values: {}, links: [{ goto: "worksheet" }] });
    if (result.ok) expect(result.values["homework/a1/r1/done"]).toBeUndefined();
  });
});
