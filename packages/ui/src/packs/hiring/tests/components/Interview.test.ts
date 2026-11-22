import { describe, expect, it, vi } from "vitest";
import { components, createRegistry, packReady, placeholderTitle, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { Interview } = components;
const { props, meta, examples, fallback, probes } = Interview;
const full: ReturnType<typeof fallback> = examples[0]!;
const parts = (input = full, state: "filled" | "loading" | "success" | "error" = "filled") =>
  addressedElements(
    renderInstance(
      "Interview",
      input,
      state,
      { preset: "calm", mode: "light", accent: "moss" },
      { component: "i1" },
    ),
  );
const reading = (input = full) => readComponent(Interview, input, "i1").join("\n");
const controller = (input = full, onAction = vi.fn()) =>
  createScreenController({
    screen: { id: "home", components: [{ ...input, id: "i1", c: "Interview" }] },
    defs: { Interview },
    onAction,
  });

describe("Interview contract and fallback", () => {
  it.each(examples)("parses its schedule example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("bounds the schedule, interviewers, and HTTPS link", () => {
    expect(
      props.safeParse({ ...full, minutes: 240, interviewers: Array(6).fill("x".repeat(24)) }).success,
    ).toBe(true);
    for (const invalid of [
      { candidate: "x".repeat(25) },
      { interviewers: [] },
      { interviewers: Array(7).fill("Jo") },
      { interviewers: ["x".repeat(25)] },
      { minutes: 4 },
      { minutes: 241 },
      { minutes: 30.5 },
      { date: "2027-02-29" },
      { time: "24:00" },
      { link: "http://example.test/meeting" },
      { link: `https://example.test/${"x".repeat(200)}` },
      { color: "green" },
      { format: "text" },
    ])
      expect(props.safeParse({ ...full, ...invalid }).success).toBe(false);
  });
  it("takes names from the cast without needing a recruiting-specific field", () => {
    const things = [{ type: "record", fields: ["first"] }];
    for (const [seed, expected] of [
      ["Row name", "Row name"],
      [7, placeholderTitle(0)],
      [undefined, placeholderTitle(0)],
    ] as const) {
      const items = seed === undefined ? [] : [{ id: "a", type: "record", sample: true, first: seed }];
      expect(props.parse(fallback({ cast: { things, items } }))).toMatchObject({
        candidate: expected,
        status: "proposed",
      });
    }
  });
  it("preserves its tier, core near miss, behavior probes, and pack gate", () => {
    expect(createRegistry({ packs: ["hiring"] }).ids.includes(meta.id)).toBe(packReady("hiring"));
    expect(meta.partTiers).toEqual({ invite: "service", join: "service" });
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Interview" }),
        expect.objectContaining({ kind: "choose", expect: "Timeline" }),
        expect.objectContaining({ kind: "write", expect: "Interview" }),
        expect.objectContaining({ kind: "read", expect: { address: "i1/edit", action: "press" } }),
      ]),
    );
  });
});

describe("Interview prep and rescheduling options", () => {
  it("renders and reads bounded prep only for the checklist", () => {
    const input = examples[2]!;
    expect(parts(input).has("home/i1/prep")).toBe(true);
    expect(reading(input)).toContain("Read the application notes");
    expect(reading(input)).toContain("Prepare a question about group walks");
    expect(parts({ ...input, style: undefined }).has("home/i1/prep")).toBe(false);
    expect(reading({ ...input, style: undefined })).not.toContain("Read the application notes");
    expect(parts(input, "loading").has("home/i1/prep")).toBe(false);
    expect(props.safeParse({ ...input, prep: Array(6).fill("x".repeat(80)) }).success).toBe(true);
    for (const prep of [[], Array(7).fill("Step"), ["x".repeat(81)]])
      expect(props.safeParse({ ...input, prep }).success).toBe(false);
  });
  it("offers a separate reschedule link only for open interviews with a destination", () => {
    const input = { ...full, rescheduleGoto: "move_interview" };
    const onLink = vi.fn(),
      onAction = vi.fn();
    const current = createScreenController({
      screen: { id: "home", components: [{ ...input, id: "i1", c: "Interview" }] },
      defs: { Interview },
      onLink,
      onAction,
    });
    expect(current.read()).toContain("[i1/reschedule press→move_interview]");
    expect(current.read()).toContain("[i1/edit press→interview_edit]");
    expect(current.press("i1/reschedule").ok).toBe(true);
    expect(onLink).toHaveBeenCalledExactlyOnceWith("move_interview", "home/i1/reschedule");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/i1/reschedule", action: "press" });
    for (const unavailable of [
      full,
      { ...input, status: "completed" as const },
      { ...input, status: "cancelled" as const },
    ]) {
      expect(parts(unavailable).has("home/i1/reschedule")).toBe(false);
      expect(reading(unavailable)).not.toContain("Reschedule");
      expect(controller(unavailable).press("i1/reschedule").ok).toBe(false);
    }
  });
});

describe("Interview parts, states, read and act", () => {
  it("keeps the existing details and part addresses by default", () => {
    const drawn = parts();
    expect([...parts({ ...full }).keys()]).toEqual([...drawn.keys()]);
    expect(drawn.get("home/i1/time")?.text).toContain("09:30–10:00");
    expect(reading()).toContain("09:30–10:00");
    expect(reading()).toContain("With Jo Ellis and Ari Lane");
  });
  it.each(["loading", "success", "error"] as const)("contains no controls in %s", (state) => {
    expect([...parts(full, state).keys()]).toEqual(
      state === "loading" ? ["home/i1/root"] : ["home/i1/root", `home/i1/${state}`],
    );
    expect(readComponent(Interview, full, "i1", state).join("\n")).not.toContain("[i1/");
  });
  it.each([
    ["proposed", undefined, ["edit", "invite", "cancel"]],
    ["proposed", "https://example.test/meeting", ["edit", "invite", "cancel"]],
    ["confirmed", undefined, ["edit", "invite", "complete", "cancel"]],
    ["confirmed", "https://example.test/meeting", ["edit", "invite", "complete", "cancel", "join"]],
    ["completed", "https://example.test/meeting", []],
    ["cancelled", "https://example.test/meeting", []],
  ] as const)("offers precisely the allowed actions for %s with link %s", (status, link, expected) => {
    const input = { ...full, status, link };
    const drawn = parts(input);
    const reader = reading(input);
    for (const part of ["edit", "invite", "complete", "cancel", "join"] as const) {
      const offered = (expected as readonly string[]).includes(part);
      expect(drawn.has(`home/i1/${part}`)).toBe(offered);
      expect(reader.includes(`[i1/${part} `)).toBe(offered);
      const action = part === "invite" ? "send" : "press";
      expect(controller(input).act({ address: `i1/${part}`, action }).ok).toBe(offered);
    }
    expect(reader).not.toContain("https://");
  });
  it("cancels only after confirmation, without sending an invitation", () => {
    const onAction = vi.fn();
    const current = controller(full, onAction);
    expect(current.press("i1/cancel").ok).toBe(true);
    expect(current.confirmation?.source).toBe("home/i1/cancel");
    expect(current.press("confirm/cancel").ok).toBe(true);
    expect(onAction).not.toHaveBeenCalled();
    expect(current.press("i1/cancel").ok).toBe(true);
    expect(current.press("confirm/confirm").ok).toBe(true);
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/i1/cancel", action: "press" });
  });
});
