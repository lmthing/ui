import { describe, expect, it, vi } from "vitest";
import { components, createRegistry, packReady, placeholderTitle, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { Applications } = components;
const { props, meta, examples, fallback, probes } = Applications;
const full: ReturnType<typeof fallback> = examples[0]!;
const [first, second] = full.applications;
const parts = (input = full, state: "filled" | "empty" | "loading" | "success" | "error" = "filled") =>
  addressedElements(
    renderInstance(
      "Applications",
      input,
      state,
      { preset: "calm", mode: "light", accent: "moss" },
      { component: "a1" },
    ),
  );
const reading = (input = full) => readComponent(Applications, input, "a1").join("\n");
const controller = (input = full, onAction = vi.fn()) =>
  createScreenController({
    screen: { id: "home", components: [{ ...input, id: "a1", c: "Applications" }] },
    defs: { Applications },
    onAction,
  });

describe("Applications contract and fallback", () => {
  it.each(examples)("parses each tracker example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("bounds rows, labels and dates, and never takes authored derived data", () => {
    const six = Array.from({ length: 6 }, (_, i) => ({
      ...first,
      applicationId: `app_${i}`,
      role: "x".repeat(32),
    }));
    expect(props.safeParse({ applications: six }).success).toBe(true);
    for (const applications of [
      [],
      [...six, second],
      [first, first],
      [{ ...first, role: "x".repeat(33) }],
      [{ ...first, next: undefined }],
      [{ ...first, outcome: "declined" }],
      [{ ...first, followUpDone: true }],
      [{ ...second, applied: "2027-04-14" }],
    ])
      expect(props.safeParse({ applications }).success).toBe(false);
    expect(props.safeParse({ ...full, color: "red" }).success).toBe(false);
  });
  it("keeps fallback neutral for empty and malformed casts", () => {
    const things = [{ type: "record", fields: ["label"] }];
    for (const [seed, expected] of [
      ["Row name", "Row name"],
      [7, placeholderTitle(0)],
      [undefined, placeholderTitle(0)],
    ] as const) {
      const items = seed === undefined ? [] : [{ id: "a", type: "record", sample: true, label: seed }];
      expect(props.parse(fallback({ cast: { things, items } }))).toMatchObject({
        applications: [{ role: expected }],
      });
    }
  });
  it("keeps the hiring gate, core near miss and write probe", () => {
    expect(createRegistry({ packs: ["hiring"] }).ids.includes(meta.id)).toBe(packReady("hiring"));
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Applications" }),
        expect.objectContaining({ kind: "choose", expect: "List" }),
        expect.objectContaining({ kind: "write", expect: "Applications" }),
        expect.objectContaining({ kind: "read", expect: { address: "a1/r1/followup", action: "check" } }),
      ]),
    );
  });
});

describe("Applications parts, states, read and act", () => {
  it("shows the outcome first and labels a closed record's stage as history", () => {
    const closed = examples[1]!;
    const drawn = parts(closed);
    expect(drawn.get("home/a1/r1/outcome")?.text).toEqual(["Rejected"]);
    expect(drawn.get("home/a1/r1/stage")?.text).toEqual(["Last stage: Screening"]);
    const addresses = [...drawn.keys()];
    expect(addresses.indexOf("home/a1/r1/outcome")).toBeLessThan(addresses.indexOf("home/a1/r1/stage"));
    expect(reading(closed)).toContain("Last stage: Screening");
    expect(parts().get("home/a1/r1/stage")?.text).toEqual(["Interview"]);
  });
  it("draws and reads urgent rows first without changing the original addresses", () => {
    const input = { applications: [second!, { ...first!, nextAt: "2001-01-01" }] };
    const drawn = [...parts(input).keys()];
    expect(drawn.indexOf("home/a1/r2/root")).toBeLessThan(drawn.indexOf("home/a1/r1/root"));
    expect(reading(input).indexOf('r2 "Summer dog walker"')).toBeLessThan(
      reading(input).indexOf('r1 "Assistant trainer"'),
    );
    expect(reading(input)).toContain("[a1/r2 press→trot_application]");
    expect(reading(input)).toContain("[a1/r2/followup check");
  });
  it.each(["loading", "empty", "success", "error"] as const)("offers no controls in %s", (state) => {
    expect([...parts(full, state).keys()]).toEqual(
      state === "loading" ? ["home/a1/root"] : ["home/a1/root", `home/a1/${state}`],
    );
    expect(readComponent(Applications, full, "a1", state).join("\n")).not.toContain("[a1/");
  });
  it("dispatches the local follow-up check and reflects the host's cleared record", () => {
    const onAction = vi.fn();
    const current = controller(full, onAction);
    expect(current.act({ address: "a1/r1/followup", action: "check", value: true }).ok).toBe(true);
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      address: "home/a1/r1/followup",
      action: "check",
      value: true,
    });
    expect(current.store.get("home/a1/r1/followup")).toBe(true);
    expect(current.actionsAt("home/a1/r2/followup")).not.toContain("check");
    const updated = { applications: [{ ...first!, next: undefined, nextAt: undefined }, second!] };
    expect(parts(updated).has("home/a1/r1/followup")).toBe(false);
    expect(parts(updated).has("home/a1/r1/next_at")).toBe(false);
    expect(controller(updated).actionsAt("home/a1/r1/followup")).not.toContain("check");
    const readBack = reading(updated);
    expect(readBack).toContain("Interview");
    expect(readBack).not.toContain("thank-you note");
    expect(readBack).not.toContain(" send");
  });
  it("confirms withdrawal but keeps terminal history linked and read-only", () => {
    const onAction = vi.fn();
    const current = controller(full, onAction);
    expect(current.press("a1/r1/withdraw").ok).toBe(true);
    expect(current.confirmation?.source).toBe("home/a1/r1/withdraw");
    expect(current.press("confirm/cancel").ok).toBe(true);
    expect(onAction).not.toHaveBeenCalled();
    expect(current.press("a1/r1/withdraw").ok).toBe(true);
    expect(current.press("confirm/confirm").ok).toBe(true);
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/a1/r1/withdraw", action: "press" });
    const history = { applications: [{ ...first!, outcome: "withdrawn" as const }] };
    expect(parts(history).has("home/a1/r1/root")).toBe(true);
    expect(parts(history).has("home/a1/r1/withdraw")).toBe(false);
    expect(parts(history).has("home/a1/r1/followup")).toBe(false);
    expect(reading(history)).toContain("Withdrawn");
    expect(controller(history).press("a1/r1/withdraw").ok).toBe(false);
  });
});
