import { affordancesOf, components, readComponent, stampItemIds } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { describe, expect, it, vi } from "vitest";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Renewals;
const { meta, examples, props, fallback, probes } = def;
const entry = examples[0]!.items[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("Renewals contract", () => {
  it.each(examples)("accepts real examples", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it.each([
    { items: [] },
    { items: Array.from({ length: 7 }, () => entry) },
    { items: [{ ...entry, noticeBy: "2027-04-11" }] },
    { items: [{ ...entry, completedOn: "2027-04-31" }] },
    { items: [{ ...entry, title: "x".repeat(33) }] },
    { items: [{ ...entry, complete: true }] },
    { items: [entry], color: "#fff" },
  ])("rejects invalid writer input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("uses a neutral fallback and keeps the Calendar near miss", () => {
    expect(props.parse(fallback({ cast: { things: [], items: [] } })).items[0]?.title).toBe("Item one");
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Calendar" }));
  });
  it("orders by the action deadline, not the end date", () => {
    const earlierNotice = { title: "Notice first", noticeBy: "2027-02-01", due: "2027-05-01" };
    expect(props.parse({ items: [entry, earlierNotice] }).items.map((row) => row.title)).toEqual([
      "Notice first",
      entry.title,
    ]);
  });
});

describe("Renewals states and actions", () => {
  it("limits navigation to links and reminders to pending rows", () => {
    const [completed] = examples[1]!.items;
    const offers = affordancesOf(meta, stampItemIds(meta, props.parse({ items: [entry, completed] })), "r1");
    expect(offers.map(({ address }) => address)).toEqual([
      "r1/r1/done",
      "r1/r1/remove",
      "r1/r2",
      "r1/r2/done",
      "r1/r2/remind",
      "r1/r2/remove",
    ]);
    expect(readComponent(def, { items: [entry, completed] }, "r1").join("\n")).toContain(
      "[r1/r2/remind press !needs-ok]",
    );
    expect(meta.confirmParts).toEqual(["remove"]);
  });
  it("updates completion without invoking navigation and asks before removing", () => {
    const onLink = vi.fn();
    const screen = { id: "home", components: [{ c: "Renewals", id: "r1", items: [entry] }] };
    const ctl = createScreenController({ screen, defs: { Renewals: def }, onLink });
    try {
      expect(ctl.press("r1/r1/done").ok).toBe(true);
      expect(ctl.canPress("r1/r1/remind")).toBe(false);
      expect(ctl.press("r1/r1/done").ok).toBe(true);
      expect(ctl.canPress("r1/r1/remind")).toBe(true);
      expect(ctl.press("r1/r1/remove").ok).toBe(true);
      expect(ctl.canPress("confirm/confirm")).toBe(true);
      expect(onLink).not.toHaveBeenCalled();
    } finally {
      ctl.dispose();
    }
  });
  it.each(["empty", "loading"] as const)("does not mount controls in %s", (state) => {
    const html = renderInstance("Renewals", examples[0], state, theme);
    expect(html).not.toContain("home/c1/r1/");
  });
  it("shows completed and success states; brief hides only the owner", () => {
    const html = renderInstance("Renewals", { ...examples[1], detail: "brief" }, "success", theme);
    const parts = addressedElements(html);
    for (const part of ["due", "notice_by", "completed_on", "done", "remove"])
      expect(parts.has(`home/c1/r1/${part}`)).toBe(true);
    expect(parts.get("home/c1/r1/done")?.attributes).toContain('aria-checked="true"');
    expect(parts.has("home/c1/r1/remind")).toBe(false);
    expect(parts.has("home/c1/r1/for")).toBe(false);
    expect(parts.has("home/c1/success")).toBe(true);
  });
});
