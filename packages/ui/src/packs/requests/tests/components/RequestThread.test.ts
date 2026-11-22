import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderValue,
  readComponent,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController, createAgentAccess, createInteractionStore } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { RequestThread } from "../../components";

const { meta, props, examples, fallback, probes, bindRequestThread } = RequestThread;
const full = examples[0]!;
const brief = examples[3]!;
const [assignment, work, status] = full.entries;
const message = props.parse(full).entries.find(({ kind }) => kind === "message")!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const typed = (value: string) => ({ address: "t/field", action: "type", value });
const select = (value: string) => ({ address: "t/audience", action: "select", value });
const send = { address: "t/send", action: "send" };
const open = { address: "t/r2", action: "press" };
const screen = (input: object) => ({ id: "desk", components: [{ id: "t", c: meta.id, ...input }] });

describe("RequestThread contract", () => {
  it.each(examples)("accepts each domain example", (input) => {
    expect(props.safeParse(input).success).toBe(true);
  });
  it("defaults to the full view and requester audience", () => {
    expect(props.parse({ number: "  R-1 ", entries: [] })).toMatchObject({
      number: "R-1",
      detail: "full",
      audience: "requester",
    });
    expectTypeOf<Props<typeof props, typeof meta>["entries"][number]["id"]>().toEqualTypeOf<string>();
  });
  it.each([
    { entries: undefined },
    { entries: Array.from({ length: 7 }, () => message) },
    { number: "x".repeat(13) },
    { draft: "x".repeat(241) },
    { draft: "   " },
    { audience: "public" },
    { detail: "summary" },
    { density: "tight" },
    { color: "red" },
    { audience_choices: ["internal"] },
    { entries: [{ ...assignment, by: "x".repeat(25) }] },
    { entries: [{ ...assignment, who: undefined }] },
    { entries: [{ ...message, photo: "https://example.invalid/image" }] },
    { entries: [{ ...message, text: undefined }] },
    { entries: [{ ...message, text: "x".repeat(241) }] },
    { entries: [{ ...status, date: "2026-02-29" }] },
    { entries: [{ ...status, time: "24:01" }] },
    { entries: [{ ...status, from: "open" }] },
    { entries: [{ ...status, photo: "local:1" }] },
    { entries: [{ ...work, goto: "not a screen" }] },
    { entries: [{ ...work, order: undefined }] },
    { entries: [{ ...work, id: "r9" }] },
  ])("rejects out-of-contract input %#", (input) => {
    expect(props.safeParse({ ...full, ...input }).success).toBe(false);
  });
  it("accepts the exact limits", () => {
    const entry = { ...message, by: "x".repeat(24), text: "y".repeat(240) };
    expect(
      props.safeParse({ number: "1".repeat(12), draft: "a".repeat(240), entries: Array(6).fill(entry) })
        .success,
    ).toBe(true);
  });
  it("keeps the closest core near miss and follows pack readiness", () => {
    expect(meta.partTiers.field).toBe("phone");
    expect(meta.partTiers.send).toBe("people");
    expect(createRegistry({ packs: ["requests"] }).ids.includes(meta.id)).toBe(packReady("requests"));
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Bubbles" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "r1/send", action: "send" } }),
      ]),
    );
  });
});

describe("RequestThread fallback", () => {
  const things = [{ type: "request", fields: ["name", "detail"] }];
  it("uses a neutral empty fallback for absent or malformed cast content", () => {
    for (const items of [[], [{ id: "a", type: "request", sample: true, name: 5, detail: false }]]) {
      expect(props.parse(fallback({ cast: { things, items } }))).toMatchObject({
        number: placeholderValue,
        entries: [],
      });
    }
  });
  it("draws the seed from the cast rather than guessing domain content", () => {
    const items = [{ id: "a", type: "request", sample: true, name: "R-29", detail: "Recheck the latch" }];
    expect(fallback({ cast: { things, items } })).toEqual({
      number: "R-29",
      entries: [],
      draft: "Recheck the latch",
    });
  });
});

describe("RequestThread states and parts", () => {
  it("keeps work links and photos addressed and makes only event detail brief", () => {
    const render = (input: unknown) => addressedElements(renderInstance(meta.id, input, "filled", theme));
    const complete = render(full);
    const compact = render({ ...full, detail: "brief" });
    expect(complete.get("home/c1/r2/root")?.attributes).toContain('role="link"');
    expect(complete.get("home/c1/r4/photo")?.attributes).toContain('role="img"');
    for (const row of ["r1", "r2", "r3"]) expect(complete.has(`home/c1/${row}/event_detail`)).toBe(true);
    expect([...complete.keys()].filter((part) => !part.endsWith("/event_detail"))).toEqual([
      ...compact.keys(),
    ]);
    expect(compact.get("home/c1/r4/text")?.text).toEqual([message.text]);
    expect(render(brief).get("home/c1/send")?.attributes).toContain('aria-disabled="true"');
  });
  it.each(["empty", "loading", "success", "error"] as const)("draws %s without extra actions", (state) => {
    const html = renderInstance(meta.id, full, state, theme);
    const parts = addressedElements(html);
    expect(parts.has("home/c1/root")).toBe(true);
    expect(parts.has("home/c1/send")).toBe(state === "empty");
    if (state === "loading") expect(html).toContain("Loading");
    if (state === "success") expect(html).toContain("Reply sent");
    if (state === "error") {
      expect(html).toContain("Reply not sent");
      expect(parts.get("home/c1/field")?.text).toEqual([full.draft]);
    }
  });
});

describe("RequestThread read and act", () => {
  it("keeps the original work address when displaying entries in date and time order", () => {
    const input = { ...full, entries: [message, work, assignment, status] };
    const read = readComponent(components.RequestThread, input, "t").join("\n");
    expect(read.indexOf("Assigned to Ella")).toBeLessThan(read.indexOf("WO-14"));
    expect(read).toContain("[t/r2 press→work !needs-people]");
    const controller = createScreenController({
      screen: screen(input),
      defs: { [meta.id]: components.RequestThread },
    });
    expect(controller.act(open)).toMatchObject({ ok: true });
    expect(controller.act({ address: "t/r1", action: "press" }).ok).toBe(false);
  });
  it.each([false, true])("gates audience and delivers the admitted draft (mounted = %s)", (mounted) => {
    const onSend = vi.fn();
    let staff = true;
    const def = bindRequestThread((id) =>
      id === "t" ? { role: staff ? "staff" : "requester", canReply: true } : undefined,
    );
    const input = { ...full, entries: [], draft: undefined };
    const opts = { defs: { [meta.id]: def }, store: createInteractionStore(), onSend };
    const host = mounted
      ? createScreenController({ ...opts, screen: screen(input) })
      : createAgentAccess({ ...opts, current: () => screen(input) });
    expect(host.act(send).ok).toBe(false);
    expect(host.act([typed("  "), send]).ok).toBe(false);
    expect(host.act(typed("x".repeat(241))).ok).toBe(false);
    expect(host.act(select("staff")).ok).toBe(false);
    expect(host.act([select("internal"), typed("First"), send, typed("Later")]).ok).toBe(true);
    expect(onSend).toHaveBeenCalledExactlyOnceWith("First", "desk/t/field", "internal");
    staff = false;
    expect(host.act(select("internal")).ok).toBe(false);
    expect(host.act(send).ok).toBe(false);
    expect(host.act([select("requester"), send]).ok).toBe(true);
    expect(onSend).toHaveBeenLastCalledWith("Later", "desk/t/field", "requester");
  });
  it("filters private rows, photos and work actions before reading and denies unbound permissions", () => {
    const requester = bindRequestThread(() => ({ role: "requester", canReply: true }));
    const read = readComponent(requester, full, "t").join("\n");
    expect(read).toContain("In progress → Waiting");
    for (const hidden of ["WO-14", "r2", "Noor", "cable", "local:1", "internal"])
      expect(read).not.toContain(hidden);
    const defs = { [meta.id]: requester };
    expect(createScreenController({ screen: screen(full), defs }).act(open).ok).toBe(false);
    const denied = readComponent(
      bindRequestThread(() => undefined),
      full,
      "t",
    ).join("\n");
    for (const hidden of ["t/field", "t/audience", "t/send", "replacement grow light"])
      expect(denied).not.toContain(hidden);
  });
});
