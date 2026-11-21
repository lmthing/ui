import { expect, it, vi } from "vitest";
import { components, migrateLine, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const booking = components.Appointment.examples[0]!;
const time = components.Slots.examples[0]!;
const week = components.Availability.examples[0]!;
const visit = components.ServiceMenu.examples[0]!.services[0]!;
const meetingUrl = "https://meet.example.org/ledge";

it("draws a compact booking with its own location and status, keeping its root navigation", () => {
  const input = { ...booking, style: "compact", locationKind: "in_person" };
  const html = renderInstance("Appointment", input, "filled", theme);
  for (const part of ["service", "date", "time", "locationKind", "status"])
    expect(elementAt(html, `home/c1/${part}`).attributes).toContain("data-testid");
  for (const part of ["minutes", "with", "place", "reschedule", "cancel", "edit"])
    expect(html).not.toContain(`home/c1/${part}`);
  const reading = readComponent(components.Appointment, input, "a1")[0]!;
  expect(reading).toContain("In person");
  expect(reading).toContain("[a1 press→time]");
  expect(reading).not.toContain("Reschedule");
});

it("validates meeting URLs and dispatches only an eligible, service-tier join without navigating", () => {
  const def = components.Appointment;
  const input = { ...booking, locationKind: "video", meetingUrl };
  expect(def.meta.partTiers.join).toBe("service");
  for (const url of ["http://meet.example.org", "javascript:alert(1)", "https:", "https://"])
    expect(def.props.safeParse({ ...input, meetingUrl: url }).success).toBe(false);
  expect(def.props.safeParse({ ...input, locationKind: "remote" }).success).toBe(false);
  const onAction = vi.fn();
  const onLink = vi.fn();
  const screen = { id: "home", components: [{ ...input, c: "Appointment", id: "a1" }] };
  const runtime = createScreenController({ screen, defs: components, onAction, onLink });
  try {
    expect(runtime.read()).toContain("[a1/join press]");
    expect(runtime.read()).not.toContain(meetingUrl);
    expect(runtime.press("a1/join").ok).toBe(true);
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/a1/join", action: "press" });
    expect(onLink).not.toHaveBeenCalled();
  } finally {
    runtime.dispose();
  }
  expect(
    elementAt(renderInstance("Appointment", input, "filled", theme), "home/c1/join").attributes,
  ).toContain('role="button"');
  for (const change of [{ meetingUrl: undefined }, { status: "cancelled" }, { locationKind: "phone" }]) {
    const unavailable = { ...input, ...change };
    expect(readComponent(def, unavailable, "a1")[0]).not.toContain("[a1/join");
    expect(renderInstance("Appointment", unavailable, "filled", theme)).not.toContain("home/c1/join");
  }
  for (const state of ["loading", "success"] as const)
    expect(readComponent(def, input, "a1", state)[0]).not.toContain("[a1/join");
});

it("reads a timezone and overnight ranges without changing the stored start or enabling taken slots", () => {
  const def = components.Slots;
  const input = {
    ...time,
    style: "ranges",
    timezone: "America/New_York",
    minutes: 45,
    times: [
      { time: "23:45", taken: false },
      { time: "23:59", taken: true },
    ],
    at: "23:45",
  };
  expect(migrateLine({ ...input, c: "Slots" }, { variantOnly: true })).toMatchObject({ style: "ranges" });
  const html = renderInstance("Slots", input, "filled", theme);
  const reading = readComponent(def, input, "s1").join("\n");
  for (const line of ["23:45–00:30 next day", "23:59–00:44 next day", "America/New_York"]) {
    expect(html).toContain(line);
    expect(reading).toContain(line);
  }
  expect(elementAt(html, "home/c1/timezone").attributes).not.toContain("role=");
  expect(elementAt(html, "home/c1/r2/root").attributes).toContain('aria-disabled="true"');
  const runtime = createScreenController({
    screen: { id: "home", components: [{ ...input, at: undefined, c: "Slots", id: "s1" }] },
    defs: components,
  });
  try {
    expect(runtime.press("s1/r2").ok).toBe(false);
    expect(runtime.press("s1/r1").ok).toBe(true);
    expect(runtime.snapshotScreen().components[0]?.at).toBe("23:45");
  } finally {
    runtime.dispose();
  }
});

it("shows zero buffer and dated exceptions separately from the editable week", () => {
  const def = components.Availability;
  const dateOverrides = [
    { date: "2026-12-24", kind: "blocked" },
    { date: "2026-12-25", kind: "holiday" },
    { date: "2026-12-26", kind: "holiday" },
    { date: "2026-12-27", kind: "blocked" },
    { date: "2026-12-28", kind: "blocked" },
    { date: "2026-12-29", kind: "blocked" },
  ];
  const input = { ...week, bufferMinutes: 0, dateOverrides, detail: "brief" };
  for (const bufferMinutes of [0, 5, 10, 15, 30])
    expect(def.props.safeParse({ ...input, bufferMinutes }).success).toBe(true);
  for (const change of [
    { bufferMinutes: 20 },
    { dateOverrides: [...dateOverrides, { date: "2026-12-30", kind: "blocked" }] },
    { dateOverrides: [dateOverrides[0], dateOverrides[0]] },
    { dateOverrides: [{ date: "2026-02-29", kind: "blocked" }] },
    { dateOverrides: [{ date: "2026-12-24", kind: "open" }] },
  ])
    expect(def.props.safeParse({ ...input, ...change }).success).toBe(false);
  const html = renderInstance("Availability", input, "filled", theme);
  const reading = readComponent(def, input, "a1").join("\n");
  for (const line of ["0 min between bookings", "24 Dec 2026 · Blocked", "25 Dec 2026 · Holiday"]) {
    expect(html).toContain(line);
    expect(reading).toContain(line);
  }
  expect(html.match(/role="switch"/g)).toHaveLength(7);
  expect(renderInstance("Availability", { ...week, dateOverrides: [] }, "filled", theme)).not.toContain(
    "home/c1/dateOverrides",
  );
});

it("shows a group limit and zero deposit, and uses different destinations for booking and portfolio", () => {
  const def = components.ServiceMenu;
  const base = { ...visit, goto: "time" };
  const input = { services: [{ ...base, capacity: 4, deposit: 0, portfolioGoto: "walks_gallery" }, base] };
  for (const change of [{ capacity: 0 }, { capacity: 1.5 }, { deposit: -1 }, { portfolioGoto: "Bad ID" }])
    expect(def.props.safeParse({ services: [{ ...base, ...change }] }).success).toBe(false);
  const html = renderInstance("ServiceMenu", input, "filled", theme);
  for (const part of ["capacity", "deposit", "portfolio"]) {
    expect(html).toContain(`home/c1/r1/${part}`);
    expect(html).not.toContain(`home/c1/r2/${part}`);
  }
  expect(html).toContain("Up to 4 people");
  expect(html).toContain("$0 deposit");
  expect(elementAt(html, "home/c1/r1/portfolio").attributes).toContain('role="link"');
  expect(renderInstance("ServiceMenu", input, "loading", theme)).not.toContain('role="link"');
  const onLink = vi.fn();
  const runtime = createScreenController({
    screen: { id: "home", components: [{ ...input, c: "ServiceMenu", id: "s1" }] },
    defs: components,
    onLink,
  });
  try {
    expect(runtime.read()).toContain("[s1/r1/portfolio press→walks_gallery]");
    expect(runtime.press("s1/r1").ok).toBe(true);
    expect(runtime.press("s1/r1/portfolio").ok).toBe(true);
    expect(runtime.press("s1/r2/portfolio").ok).toBe(false);
    expect(onLink.mock.calls).toEqual([
      ["time", "home/s1/r1/root"],
      ["walks_gallery", "home/s1/r1/portfolio"],
    ]);
  } finally {
    runtime.dispose();
  }
});
