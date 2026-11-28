import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  stampItemIds,
  type CastLike,
  type DeviceData,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import type { input as SchemaInput } from "zod";
import { addressedElements, renderInstance, type AddressedElement } from "../../../../../test/render";
import { teamWordsFor } from "../../lang";

const def = components.Approval;
const { props, meta, examples, fallback, probes } = def;
const sample = examples[0]!;
const full: SchemaInput<typeof props> = {
  requests: [
    {
      ...sample.requests[0]!,
      from: "Anna",
      kind: "time_off" as const,
      title: "Friday off",
      dates: "20 Nov",
      note: "Rae can water the ferns.",
      reference: "LV-104",
      status: "pending" as const,
    },
    { ...examples[3]!.requests[1]! },
  ],
};
const row = full.requests[0]!;
const words = teamWordsFor().approval;
const emptyCast: CastLike = { things: [], items: [] };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const view = (input: unknown, state: "filled" | "empty" | "success" = "filled", deviceData?: DeviceData) =>
  addressedElements(renderInstance("Approval", input, state, theme, { deviceData }));

function textOf(node: AddressedElement | undefined): string[] {
  return node ? [...node.text, ...node.children.flatMap(textOf)] : [];
}

it("keeps the read current through a declined first attempt and one accepted retry", async () => {
  const input = examples.find((example) => "review" in example && example.style === "review")!;
  const screen = { id: "home", components: [{ id: "a1", c: "Approval", ...input }] };
  const run = vi
    .fn()
    .mockResolvedValueOnce({ status: "rejected", records: [{ internal: "not public" }] })
    .mockResolvedValueOnce({ status: "accepted", records: [{ reason: "Replace the bench." }] });
  const host = { allows: () => true, run };
  const controller = createScreenController({
    screen,
    defs: components,
    hostCommands: { commands: { "approval.accept": host, "approval.reject": host } },
  });
  try {
    expect(controller.actionsAt("a1/reject")).toEqual([]);
    expect(controller.act({ address: "a1/reason", action: "type", value: "Replace the bench." }).ok).toBe(
      true,
    );
    expect(controller.press("a1/reject").ok).toBe(true);
    expect(controller.confirmation).toMatchObject({
      message: "Decline request GH-142?",
      label: "Decline request",
    });
    expect(run).not.toHaveBeenCalled();
    expect(controller.press("confirm/confirm").ok).toBe(true);
    expect(controller.read()).toContain(words.review.pending);
    expect(controller.read()).not.toContain(words.awaitingDecision);
    await vi.waitFor(() => expect(controller.read()).toContain(words.review.failed));
    expect(controller.read()).not.toContain("not public");
    expect(controller.press("a1/reject").ok).toBe(true);
    expect(controller.press("confirm/confirm").ok).toBe(true);
    await vi.waitFor(() => expect(controller.read()).toContain("approval.reject accepted"));
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({ input: { reference: "GH-142", reason: "Replace the bench." } }),
      expect.anything(),
    );
    const settled = controller.read();
    expect(settled).toContain("Replace the bench.");
    expect(settled).toContain("Declined");
    expect(settled).not.toMatch(/\b(?:Awaiting a decision|Approve|Decline)\b/);
    for (const name of ["accept", "reject", "reason"]) expect(controller.actionsAt(`a1/${name}`)).toEqual([]);
  } finally {
    controller.dispose();
  }
});

describe("Approval schema and boundaries", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("accepts five maximum-length rows and zero amounts, trims copy, and stamps view-only IDs", () => {
    const from = "x".repeat(20);
    const request = {
      ...row,
      from: ` ${from} `,
      title: "x".repeat(32),
      dates: "x".repeat(24),
      note: "x".repeat(100),
      amount: 0,
      photo: "local:1",
    };
    const parsed = props.parse({ requests: Array.from({ length: 5 }, () => request) });
    expect(parsed).toMatchObject({ lead: "avatar" });
    expect(parsed.requests).toEqual(Array.from({ length: 5 }, () => ({ ...request, from, open: true })));
    expect(stampItemIds(meta, parsed).requests).toMatchObject(
      ["r1", "r2", "r3", "r4", "r5"].map((id) => ({ id })),
    );
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["requests"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
  });
  it.each([
    {},
    { requests: [] },
    { requests: Array.from({ length: 6 }, () => row) },
    { ...full, color: "red" },
    { ...full, density: "small" },
    { ...full, lead: "thumb" },
    { ...full, surface: "raised" },
  ])("rejects invalid component input %j", (input) => expect(props.safeParse(input).success).toBe(false));
  it.each([
    { from: " " },
    { from: "x".repeat(21) },
    { title: "" },
    { title: "x".repeat(33) },
    { reference: "x".repeat(25) },
    { dates: "x".repeat(25) },
    { note: "x".repeat(101) },
    { photo: undefined },
    { photo: "https://example.org/photo" },
    { kind: "leave" },
    { amount: -1 },
    { amount: "24" },
    { amount: Infinity },
    { id: "r1" },
    { color: "#000000" },
  ])("rejects invalid request input %j", (input) =>
    expect(props.safeParse({ requests: [{ ...row, ...input }] }).success).toBe(false),
  );
});

describe("Approval fallback and metadata", () => {
  it("uses bounded cast copy and neutral placeholders", () => {
    const cast: CastLike = {
      things: [{ type: "person", fields: ["name", "detail"] }],
      items: Array.from({ length: 7 }, (_, index) => ({
        id: `person_${index}`,
        type: "person",
        sample: true,
        name: index ? "a".repeat(30) : "Cameron",
        detail: "Requested Friday",
      })),
    };
    const malformed: CastLike = {
      things: [],
      items: [{ id: "bad", type: "person", sample: true, name: 42 }],
    };
    for (const content of [cast, emptyCast, malformed])
      expect(props.safeParse(fallback({ cast: content })).success).toBe(true);
    expect(fallback({ cast }).requests).toHaveLength(5);
    expect(fallback({ cast }).requests[0]).toMatchObject({
      from: "Cameron",
      title: "Requested Friday",
      kind: "other",
    });
    for (const content of [emptyCast, malformed])
      expect(fallback({ cast: content }).requests).toMatchObject([
        { from: placeholderTitle(0), title: placeholderTitle(1), kind: "other" },
      ]);
  });
  it("retains the people tier, core near miss, write, lead write and decline read", () => {
    expect(meta).toMatchObject({ tier: "people", confirmParts: ["decline", "reject"] });
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.realPath).not.toBe("");
    expect(meta.pick).toContain("Checklist");
    expect(probes.slice(0, 5)).toMatchObject([
      { kind: "choose", expect: "Approval" },
      { kind: "choose", expect: "Checklist" },
      { kind: "write", expect: "Approval" },
      { kind: "write", expect: "Approval", variant: { axis: "lead", value: "none" } },
      { kind: "read", expect: { address: "a1/r2/decline", action: "press" } },
    ]);
    expect(createRegistry({ packs: ["team"], includeDrafts: true }).schema("Approval")).toBe(props);
    expect(createRegistry({ packs: ["team"] }).ids.includes("Approval")).toBe(packReady("team"));
  });
});

describe("Approval parts, reading and variants", () => {
  it("addresses the visible details and both buttons for each request", () => {
    const parts = view(full);
    expect(parts.has("home/c1/root")).toBe(true);
    expect(parts.has("home/c1/message")).toBe(false);
    for (const part of meta.items.parts) {
      expect(parts.has(`home/c1/r1/${part}`)).toBe(part !== "amount");
      expect(parts.has(`home/c1/r2/${part}`)).toBe(part !== "dates");
    }
    expect(parts.get("home/c1/r1/photo")?.attributes).toContain('aria-label="Anna"');
    expect(parts.get("home/c1/r1/kind")?.text).toEqual([words.kinds.time_off]);
    expect(parts.get("home/c1/r2/amount")?.text).toEqual(["$24"]);
    for (const id of ["r1", "r2"])
      for (const part of ["approve", "decline"])
        expect(parts.get(`home/c1/${id}/${part}`)?.attributes).toContain('role="button"');
    const read = readComponent(def, full, "a1").join("\n");
    expect(read).toContain("Expense · $24");
    expect(read).toContain("Rae can water the ferns.");
    expect(read).toContain("[a1/r1/approve press");
    expect(read).toContain("[a1/r2/decline press");
  });
  it("keeps addresses for finish axes; turning portraits off hides only their parts", () => {
    const addresses = [...view(full).keys()];
    expect([...view({ ...full }).keys()]).toEqual(addresses);
    expect([...view({ ...full }).keys()]).toEqual(addresses);
    const noPortraits = { ...full, lead: "none" };
    expect([...view(noPortraits).keys()]).toEqual(addresses.filter((part) => !part.endsWith("/photo")));
    expect(props.parse(noPortraits).requests.map((item) => item.photo)).toEqual(
      full.requests.map((item) => item.photo),
    );
  });
});

describe("Approval states", () => {
  it.each(["pending", "declined"] as const)("keeps a %s review summary read-only", (status) => {
    const example = examples.find((entry) => entry.style === "review" && "review" in entry)!;
    const input = { ...example, requests: [{ ...example.requests[0]!, status }] };
    const summary =
      status === "pending"
        ? words.review.unavailable
        : `${input.requests[0]!.title}: ${words.statuses.declined}`;
    const parts = view(input, "success");
    expect([...parts.keys()]).toEqual(["home/c1/root", "home/c1/message"]);
    expect(textOf(parts.get("home/c1/message"))).toContain(summary);
    expect(readComponent(def, input, "a1", "success").join("\n")).toContain(summary);
  });
  it("shows only acknowledged requests in the success preview", () => {
    const parts = view(sample, "success");
    expect(textOf(parts.get("home/c1/r1/status"))).toEqual([words.statuses.approved]);
    expect(textOf(parts.get("home/c1/r2/status"))).toEqual([words.statuses.declined]);
  });
  it("keeps the request and its acknowledged outcome on the same addressed row", () => {
    const input = { requests: [{ ...row, reference: "LV-104" }] };
    const incoming = view(input);
    expect(textOf(incoming.get("home/c1/r1/status"))).toEqual([words.awaitingDecision]);
    expect(incoming.get("home/c1/r1/approve")?.attributes).toContain('role="button"');

    const acknowledged = { requests: [{ ...row, reference: "LV-104", status: "approved" }] };
    const receipt = view(acknowledged, "success");
    for (const part of ["title", "from", "reference", "dates", "note"])
      expect(receipt.get(`home/c1/r1/${part}`)?.text).toEqual(incoming.get(`home/c1/r1/${part}`)?.text);
    expect(receipt.get("home/c1/r1/reference")?.text).toEqual(["LV-104"]);
    expect(textOf(receipt.get("home/c1/r1/status"))).toEqual([words.statuses.approved]);
    expect(receipt.has("home/c1/r1/approve")).toBe(false);
    expect(receipt.has("home/c1/r1/decline")).toBe(false);
    const reading = readComponent(def, acknowledged, "a1", "success").join("\n");
    expect(reading).toContain("LV-104");
    expect(reading).toContain(words.statuses.approved);
    expect(reading).not.toContain(" press");
  });
  it.each(["empty", "success"] as const)("offers no stale actions in %s", (state) => {
    const parts = view(full, state);
    const reading = readComponent(def, full, "a1", state);
    if (state === "empty") {
      expect([...parts.keys()]).toEqual(["home/c1/root", "home/c1/message"]);
      expect(parts.get("home/c1/message")?.text).toEqual([words.queueEmpty]);
      expect(reading).toEqual(["a1 Approval (empty)"]);
    } else {
      expect(textOf(parts.get("home/c1/r1/status"))).toEqual([words.awaitingDecision]);
      expect(parts.has("home/c1/message")).toBe(false);
      expect(reading.join("\n")).not.toContain(" press");
    }
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(full)), "a1", {}, state)).toEqual([]);
    const screen = { id: "home", components: [{ ...full, id: "a1", c: "Approval", state }] };
    const onAction = vi.fn();
    const runtime = createScreenController({ screen, defs: components, onAction });
    for (const part of ["approve", "decline"]) expect(runtime.press(`a1/r1/${part}`).ok).toBe(false);
    expect(onAction).not.toHaveBeenCalled();
    expect(runtime.confirmation).toBeUndefined();
    runtime.dispose();
  });
});

describe("Approval dispatch", () => {
  it("approves directly; declining can be cancelled or confirmed for the original request", () => {
    const screen = { id: "home", components: [{ ...full, id: "a1", c: "Approval" }] };
    const onAction = vi.fn();
    const runtime = createScreenController({ screen, defs: components, onAction });
    expect(runtime.press("a1/r3/approve").ok).toBe(false);
    expect(runtime.press("a1/r1/photo").ok).toBe(false);
    expect(runtime.press("a1/r1/approve").ok).toBe(true);
    expect(runtime.confirmation).toBeUndefined();
    expect(runtime.press("a1/r2/decline").ok).toBe(true);
    expect(runtime.confirmation?.source).toBe("home/a1/r2/decline");
    expect(runtime.act({ address: "confirm/cancel", action: "dismiss" }).ok).toBe(true);
    expect(onAction.mock.calls).toEqual([[{ address: "home/a1/r1/approve", action: "press" }]]);
    expect(runtime.press("a1/r2/decline").ok).toBe(true);
    expect(runtime.press("confirm/confirm").ok).toBe(true);
    expect(runtime.confirmation).toBeUndefined();
    expect(onAction.mock.calls[1]).toEqual([{ address: "home/a1/r2/decline", action: "press" }]);
    expect(onAction).toHaveBeenCalledTimes(2);
    runtime.dispose();
  });
});

it("gates a supplied submission, allows retry after failure, and settles only on a matching host receipt", () => {
  let data: DeviceData;
  const onAction = vi.fn();
  const runtime = createScreenController({
    screen: { id: "home", components: [{ ...full, c: "Approval", id: "a1" }] },
    defs: components,
    onAction,
    get deviceData() {
      return data;
    },
  });
  const receipt = (status: string) => ({ approvalDecisions: [{ reference: "EXP-117", status }] });
  const statusLabel = (input: unknown) => textOf(view(input, "filled", data).get("home/c1/r2/status"));
  const offer = "[a1/r2/approve press";
  expect(runtime.press("a1/r2/approve").ok).toBe(true);
  expect(runtime.read()).toContain(words.awaitingDecision);
  data = receipt("submitting");
  expect(statusLabel(full)).toEqual([words.submitting]);
  expect(runtime.read()).toContain(words.submitting);
  expect(runtime.read()).not.toContain(offer);
  for (const action of ["approve", "decline"]) {
    expect(runtime.press(`a1/r2/${action}`).ok).toBe(false);
    expect(view(full, "filled", data).has(`home/c1/r2/${action}`)).toBe(false);
  }
  expect(runtime.canPress("a1/r1/approve")).toBe(true);
  expect(onAction).toHaveBeenCalledOnce();

  data = receipt("failed");
  expect(statusLabel(full)).toEqual([words.failed]);
  expect(runtime.read()).toContain(words.failed);
  expect(runtime.read()).toContain(offer);
  expect(runtime.press("a1/r2/approve").ok).toBe(true);
  expect(onAction).toHaveBeenCalledTimes(2);

  data = receipt("approved");
  expect(statusLabel(full)).toEqual([words.statuses.approved]);
  expect(runtime.read()).toContain(words.statuses.approved);
  expect(runtime.read()).not.toContain(offer);
  expect(runtime.press("a1/r2/approve").ok).toBe(false);
  const requester = { ...full, style: "my_requests" };
  expect(statusLabel(requester)).toEqual([words.statuses.approved]);
  expect(view(requester, "filled", data).has("home/c1/r2/decline")).toBe(false);
  runtime.dispose();
});

it("does not route a decline confirmation to a replacement request in the same slot", () => {
  const onAction = vi.fn();
  const mount = (
    requests: typeof full.requests,
    store?: ReturnType<typeof createScreenController>["store"],
  ) =>
    createScreenController({
      screen: { id: "home", components: [{ c: "Approval", id: "a1", requests }] },
      defs: components,
      onAction,
      ...(store ? { store } : {}),
    });
  const original = mount(full.requests);
  expect(original.press("a1/r1/decline").ok).toBe(true);
  expect(original.confirmation).toBeDefined();
  const updated = mount([{ ...row, reference: "LV-105", title: "Wednesday off" }], original.store);
  expect(updated.press("confirm/confirm").ok).toBe(false);
  expect(onAction).not.toHaveBeenCalled();
  updated.dispose();
  original.dispose();
});

it("labels shift claims and leaves requester decisions read-only at their original addresses", () => {
  const own = examples[2]!;
  const parts = view(own);
  expect(parts.get("home/c1/r1/kind")?.text).toEqual(["Shift claim"]);
  expect(textOf(parts.get("home/c1/r1/status"))).toEqual([words.awaitingDecision]);
  expect(textOf(parts.get("home/c1/r2/status"))).toEqual(["Approved"]);
  expect(parts.has("home/c1/r1/approve")).toBe(false);
  expect(parts.has("home/c1/r1/decline")).toBe(false);
  const reading = readComponent(def, own, "a1").join("\n");
  expect(reading).toContain(`Shift claim · ${words.awaitingDecision}`);
  expect(reading).not.toContain(" press");
  const runtime = createScreenController({
    screen: { id: "home", components: [{ ...own, id: "a1", c: "Approval" }] },
    defs: components,
  });
  expect(runtime.press("a1/r1/approve").ok).toBe(false);
  expect(runtime.press("a1/r1/decline").ok).toBe(false);
  runtime.dispose();
});

it("shows settled requests without offering a second decision in a mixed manager queue", () => {
  const input = {
    requests: [
      { ...row, kind: "expense", title: "Train fare", reference: "EXP-126", status: "approved" },
      { ...row, kind: "expense", title: "Courier fee", reference: "EXP-127", status: "declined" },
      { ...row, kind: "expense", title: "Spare keys", reference: "EXP-128", status: "pending" },
      { ...row, kind: "expense", title: "Parking", reference: "EXP-129" },
    ],
  };
  const parts = view(input);
  const reading = readComponent(def, input, "a1").join("\n");
  const screen = { id: "home", components: [{ ...input, id: "a1", c: "Approval" }] };
  const onAction = vi.fn();
  const runtime = createScreenController({ screen, defs: components, onAction });
  for (const [id, status] of [
    ["r1", words.statuses.approved],
    ["r2", words.statuses.declined],
  ]) {
    expect(textOf(parts.get(`home/c1/${id}/status`))).toEqual([status]);
    expect(reading).toContain(`${id} Expense · ${status}`);
    for (const action of ["approve", "decline"]) {
      expect(parts.has(`home/c1/${id}/${action}`)).toBe(false);
      expect(reading).not.toContain(`[a1/${id}/${action} press`);
      expect(runtime.press(`a1/${id}/${action}`).ok).toBe(false);
    }
  }
  expect(runtime.confirmation).toBeUndefined();
  expect(onAction).not.toHaveBeenCalled();
  for (const id of ["r3", "r4"]) {
    expect(parts.has(`home/c1/${id}/approve`)).toBe(true);
    expect(reading).toContain(`[a1/${id}/decline press`);
  }
  expect(runtime.press("a1/r4/approve").ok).toBe(true);
  expect(onAction).toHaveBeenCalledOnce();
  runtime.dispose();
});

it("keeps an unreferenced manager row readable without offering an untraceable decision", () => {
  const input = { requests: [{ ...row, reference: undefined }] };
  const parts = view(input);
  expect(textOf(parts.get("home/c1/r1/status"))).toEqual([words.unavailable]);
  expect(parts.has("home/c1/r1/approve")).toBe(false);
  expect(readComponent(def, input, "a1").join("\n")).not.toContain(" press");
  const own = view({ ...input, style: "my_requests" });
  expect(textOf(own.get("home/c1/r1/status"))).toEqual([words.awaitingDecision]);
});
