import { describe, expect, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  readComponent,
  stampItemIds,
  type CastLike,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../test/render";

const def = components.ClassRoster;
const { meta, props, examples, fallback, probes } = def;
const first = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const actions = (input: unknown, state?: "filled" | "success" | "empty" | "loading" | "error") =>
  affordancesOf(meta, stampItemIds(meta, props.parse(input)), "c1", {}, state).map(({ address }) => address);

describe("ClassRoster contract", () => {
  it.each(examples)("accepts its examples", (input) => expect(props.safeParse(input).success).toBe(true));
  it.each([
    { capacity: 1 },
    { capacity: 61 },
    { capacity: 2.5 },
    { waitlistCount: -1 },
    { waitlistCount: 31 },
    { waitlistCount: 1.5 },
    { at: "2026-11-21T10:00:00" },
    { at: "2026-02-30T10:00:00Z" },
    { sessionId: "x".repeat(25) },
    { title: "x".repeat(33) },
    { title: " " },
    { attendees: [{ ...first.attendees[0], id: "x".repeat(25) }] },
    { attendees: [{ ...first.attendees[0], name: "x".repeat(25) }] },
    { attendees: [{ ...first.attendees[0], status: "cancelled" }] },
    { attendees: [{ ...first.attendees[0], paid: "yes" }] },
    { attendees: [{ ...first.attendees[0], photo: "https://example.com/photo" }] },
    { attendees: [first.attendees[0], first.attendees[0]] },
    { attendees: Array.from({ length: 31 }, (_, i) => ({ id: String(i), name: "Mia", status: "booked" })) },
    { color: "#fff" },
    { checkedIn: 1 },
    { detail: "none" },
  ])("rejects invalid wire input: %j", (patch) => {
    expect(props.safeParse({ ...first, ...patch }).success).toBe(false);
  });
  it("accepts exact schema boundaries and closes admissions at the row limit", () => {
    const input = {
      ...first,
      capacity: 60,
      title: "x".repeat(32),
      sessionId: "s".repeat(24),
      waitlistCount: 30,
      attendees: Array.from({ length: 30 }, (_, i) => ({
        id: String(i).padStart(24, "0"),
        name: "x".repeat(24),
        status: "booked",
      })),
    };
    expect(props.safeParse(input).success).toBe(true);
    expect(actions(input)).toHaveLength(60);
    expect(props.safeParse({ ...input, capacity: 2, attendees: [], waitlistCount: 0 }).success).toBe(true);
  });
  it("exposes the component through the draft and live pack gates", () => {
    const packs = ["booking"] as const;
    expect(createRegistry({ packs, includeDrafts: true }).ids).toContain("ClassRoster");
    expect(createRegistry({ packs }).ids.includes("ClassRoster")).toBe(packReady("booking"));
    expect(meta).toMatchObject({ tier: "people", dense: true, weight: 3, confirmParts: ["noshow"] });
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual([
      "ClassRoster",
      "Progress",
    ]);
    expect(probes.filter(({ kind }) => kind === "write")).toHaveLength(2);
    expect(probes.filter(({ kind }) => kind === "read")).toHaveLength(4);
  });
});

describe("ClassRoster fallback", () => {
  it("uses neutral placeholders and keeps an empty roster empty", () => {
    const value = fallback({ cast: { things: [], items: [] } });
    expect(props.safeParse(value).success).toBe(true);
    expect(value).toMatchObject({ title: "Item one", attendees: [], detail: "brief" });
  });
  it("uses cast names without relying on a field or accepting malformed content", () => {
    const cast: CastLike = {
      things: [{ type: "person", fields: ["label"] }],
      items: [
        { id: "mia", type: "person", label: "Mia Chen", sample: true },
        { id: "bad", type: "person", label: 4, sample: true },
      ],
    };
    const value = fallback({ cast });
    expect(props.safeParse(value).success).toBe(true);
    expect(value.attendees).toEqual([{ id: "1", name: "Mia Chen", status: "booked" }]);
  });
});

describe("ClassRoster drawing and affordances", () => {
  it.each(["filled", "success"] as const)("draws every offered %s control and readable status", (state) => {
    const html = renderInstance("ClassRoster", first, state, theme);
    const parts = addressedElements(html);
    for (const address of actions(first, state)) {
      expect(parts.get(`home/${address}`)?.attributes).toMatch(
        address.endsWith("/checkin") ? /role="checkbox"/ : /role="button"/,
      );
    }
    expect(parts.get("home/c1/r1/checkin")?.attributes).toContain('aria-checked="true"');
    expect(parts.get("home/c1/r2/checkin")?.attributes).toContain('aria-checked="false"');
    expect(parts.has("home/c1/r3/checkin")).toBe(false);
    expect(parts.has("home/c1/r3/noshow")).toBe(false);
    const reading = readComponent(def, first, "c1", state).join("\n");
    for (const line of ["1 checked in", "4 spots left", "2 waiting", "No-show", "Unpaid"])
      expect(reading).toContain(line);
    expect(reading).toContain("[c1/r2/checkin toggle:off !needs-people]");
  });
  it("only admits when there is a spot, and only promotes when someone waits", () => {
    expect(actions({ ...first, capacity: 2 })).not.toContain("c1/walkin");
    expect(actions({ ...first, capacity: 2 })).not.toContain("c1/promote");
    for (const waitlistCount of [0, undefined]) {
      expect(actions({ ...first, waitlistCount })).toContain("c1/walkin");
      expect(actions({ ...first, waitlistCount })).not.toContain("c1/promote");
    }
    expect(actions({ ...first, attendees: [] })).toEqual(["c1/walkin", "c1/promote"]);
  });
  it.each([
    ["empty", "Nothing here yet"],
    ["loading", 'aria-busy="true"'],
    ["error", "Couldn’t save attendance"],
  ] as const)("renders an inert %s state", (state, content) => {
    expect(actions(first, state)).toEqual([]);
    const html = renderInstance("ClassRoster", first, state, theme);
    expect(html).toContain(content);
    expect(html).not.toMatch(/role="(checkbox|button)"/);
  });
  it("shows the capacity error for a full class", () => {
    expect(renderInstance("ClassRoster", { ...first, capacity: 2 }, "error", theme)).toContain(
      "Class is full",
    );
  });
  it("keeps actions and addresses when brief hides the timestamp and payment", () => {
    const input = { ...first, detail: "brief" };
    const parts = addressedElements(renderInstance("ClassRoster", input, "filled", theme));
    expect(parts.has("home/c1/at")).toBe(false);
    expect(parts.has("home/c1/r1/paid")).toBe(false);
    expect(parts.has("home/c1/r1/status")).toBe(true);
    expect(actions(input)).toEqual(actions(first));
    expect(readComponent(def, input, "c1").join("\n")).not.toMatch(/10:00|Unpaid/);
  });
});

describe("ClassRoster dispatch", () => {
  it("dispatches walk-in and promotion, toggles attendance twice and confirms no-shows", () => {
    const onAction = vi.fn();
    const screen = { id: "home", components: [{ ...first, id: "c1", c: "ClassRoster" }] };
    const controller = createScreenController({ screen, defs: { ClassRoster: def }, onAction });
    try {
      const press = (address: string) => controller.act({ address, action: "press" });
      const toggle = () => controller.act({ address: "c1/r2/checkin", action: "toggle" });
      for (const part of ["walkin", "promote"]) expect(press(`c1/${part}`).ok).toBe(true);
      expect(controller.press("home/c1/r2/checkin").ok).toBe(true);
      expect(controller.store.get("home/c1/r2/checkin")).toBe(true);
      expect(controller.read()).toContain("[c1/r2/checkin toggle:on !needs-people]");
      expect(controller.read()).toContain("2 checked in — 4 spots left");
      const live = controller.liveControls(meta, stampItemIds(meta, props.parse(first)), "c1");
      const statuses = (live.attendees as typeof first.attendees).map(({ status }) => status);
      expect(statuses).toEqual(["checked_in", "checked_in", "no_show"]);
      expect(toggle().ok).toBe(true);
      expect(controller.store.get("home/c1/r2/checkin")).toBe(false);
      expect(controller.read()).toContain("1 checked in — 4 spots left");
      onAction.mockClear();
      expect(press("c1/r2/noshow").ok).toBe(true);
      expect(controller.confirmation).toBeDefined();
      expect(onAction).not.toHaveBeenCalled();
      expect(controller.act({ address: "confirm/cancel", action: "dismiss" }).ok).toBe(true);
      expect(onAction).not.toHaveBeenCalled();
      expect(press("c1/r2/noshow").ok).toBe(true);
      expect(press("confirm/confirm").ok).toBe(true);
      expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/c1/r2/noshow", action: "press" });
    } finally {
      controller.dispose();
    }
  });
});

it("recounts and reopens admissions when a host update changes a booking to no-show", () => {
  const full = { ...first, capacity: 2 };
  const reopened = {
    ...full,
    attendees: full.attendees.map((row) => (row.id === "jules" ? { ...row, status: "no_show" } : row)),
  };
  expect(readComponent(def, full, "c1").join("\n")).toContain("0 spots left");
  expect(readComponent(def, reopened, "c1").join("\n")).toContain("1 spot left");
  expect(actions(reopened)).toContain("c1/promote");
  expect(actions(reopened)).not.toContain("c1/r2/noshow");
  const html = renderInstance("ClassRoster", reopened, "filled", theme);
  expect(addressedElements(html).get("home/c1/spaces")?.text).toEqual(["1"]);
  expect(html).toContain("spot left");
});
