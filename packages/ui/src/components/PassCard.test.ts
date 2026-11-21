import { describe, expect, it, vi } from "vitest";
import { affordancesOf, components, readComponent, stampItemIds, type CastLike } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../test/render";

const def = components.PassCard;
const { meta, props, examples, fallback, probes } = def;
const seed = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const draw = (value: unknown, state: "filled" | "loading" | "empty" | "error" = "filled") =>
  addressedElements(renderInstance("PassCard", value, state, theme));
const actions = (value: unknown) =>
  affordancesOf(meta, stampItemIds(meta, props.parse(value)), "c1").map(({ part }) => part);

describe("PassCard schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("defaults to a masked QR membership card without a synthetic credential", () => {
    expect(props.parse({ issuer: "Sample", title: "Member pass" })).toMatchObject({
      codeKind: "qr",
      style: "card",
      masked: true,
      used: false,
      facts: [],
    });
  });
  it.each([
    { issuer: "a".repeat(29) },
    { title: "a".repeat(33) },
    { memberName: "a".repeat(25) },
    { memberId: "a".repeat(25) },
    { code: "a".repeat(65) },
    { codeKind: "barcode" },
    { balance: Infinity },
    { pointsLabel: "a".repeat(21) },
    { expiresAt: "2027-02-29" },
    { facts: Array(5).fill({ label: "Level", value: "A" }) },
    { style: "gate" },
    { color: "red" },
  ])("rejects invalid input", (patch) => expect(props.safeParse({ ...seed, ...patch }).success).toBe(false));
});

describe("PassCard fallback", () => {
  it("uses only usable cast text and otherwise neutral copy", () => {
    const cast: CastLike = {
      things: [{ type: "pass", fields: ["name", "maker"] }],
      items: [{ id: "demo", type: "pass", sample: true, name: "Preview", maker: "Sample issuer" }],
    };
    expect(fallback({ cast })).toEqual({ title: "Preview", issuer: "Sample issuer" });
    for (const input of [
      { things: [], items: [] },
      { ...cast, items: [{ ...cast.items[0]!, name: 1, maker: null }] },
    ]) {
      const value = fallback({ cast: input });
      expect(props.safeParse(value).success).toBe(true);
      expect(value).toEqual({ title: "Item one", issuer: "Details" });
    }
  });
});

describe("PassCard actions and states", () => {
  it("veils the ID and both secrets in agent reads, and draws an addressed QR when scannable", () => {
    expect(draw(seed).get("home/c1/memberId")?.text).toEqual(["•••• 0642"]);
    expect(draw({ ...seed, masked: false }).get("home/c1/memberId")?.text).toEqual(["DEMO-0642"]);
    expect(draw(seed).get("home/c1/qr")?.attributes).toContain('role="img"');
    expect(actions(seed)).toEqual(["root", "reveal", "code", "bright"]);
    const read = readComponent(def, seed, "c1").join("\n");
    expect(read).toContain("[c1/code copy]");
    expect(read).not.toMatch(/DEMO-0642|DEMO:LEDGE-MEMBER/);
    expect(readComponent(def, { ...seed, detail: "brief" }, "c1").join("\n")).not.toContain("Seedling");
  });

  it("copies the exact QR string and keeps the two switches independent", () => {
    const code = "  DEMO: COPY  ";
    const screen = { id: "home", components: [{ id: "c1", c: "PassCard", ...seed, code }] };
    const writeClipboard = vi.fn();
    const runtime = createScreenController({ screen, defs: { PassCard: def }, writeClipboard });
    try {
      const address = "home/c1/code";
      runtime.registerCopyTarget(address, code);
      expect(runtime.act({ address, action: "copy" })).toMatchObject({ ok: true });
      expect(writeClipboard).toHaveBeenCalledExactlyOnceWith(code);
      for (const part of ["reveal", "bright", "reveal"])
        expect(runtime.act({ address: `c1/${part}`, action: "toggle" })).toMatchObject({ ok: true });
      expect(runtime.read()).toContain("[c1/reveal toggle:off]");
      expect(runtime.read()).toContain("[c1/bright toggle:on]");
      expect(runtime.read()).not.toContain(code);
    } finally {
      runtime.dispose();
    }
  });

  it("withholds scanning and copy for unavailable, used, loading and invalid passes", () => {
    expect(actions({ ...seed, code: undefined })).toEqual(["root", "reveal"]);
    expect(actions({ ...seed, used: true })).toEqual(["root", "reveal"]);
    expect(actions({ ...seed, code: "\uD800" })).toEqual([]);
    expect(draw({ ...seed, used: true }).get("home/c1/status")?.text).toEqual(["Used"]);
    expect(draw({ ...seed, code: "\uD800" }).get("home/c1/message")?.text).toEqual([
      "This code can’t be read",
    ]);
    expect(draw(seed, "error").get("home/c1/message")?.text).toEqual(["This code can’t be read"]);
    expect(draw(seed, "empty").get("home/c1/message")?.text).toEqual(["No pass saved"]);
    expect(draw(seed, "loading").has("home/c1/code")).toBe(false);
  });
});

describe("PassCard probes", () => {
  it("names a near miss, covers writing and requests a value-less copy", () => {
    expect(probes.filter((probe) => probe.kind === "choose").map(({ expect }) => expect)).toEqual([
      "PassCard",
      "KeyValue",
    ]);
    expect(probes.some((probe) => probe.kind === "write")).toBe(true);
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      expect: { address: "c1/code", action: "copy" },
    });
  });
});
