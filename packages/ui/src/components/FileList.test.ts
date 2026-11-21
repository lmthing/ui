import { describe, expect, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  partTierAt,
  readComponent,
  stampItemIds,
  type CastLike,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../test/render";

const def = components.FileList;
const { meta, props, examples, fallback, probes } = def;
const seed = examples[0]!;
const file = seed.files[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const draw = (value: unknown, state: "filled" | "loading" | "empty" | "error" = "filled") =>
  addressedElements(renderInstance("FileList", value, state, theme));

describe("FileList schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults and accepts six files including zero bytes", () => {
    expect(props.parse({ files: Array(6).fill({ ...file, sizeBytes: 0 }) })).toMatchObject({
      removable: false,
      style: "rows",
    });
  });
  it.each([
    { fileRef: "a".repeat(33) },
    { fileRef: "https://example.org/file" },
    { fileRef: "/tmp/demo" },
    { name: "a".repeat(49) },
    { ext: "jpg" },
    { sizeBytes: -1 },
    { sizeBytes: NaN },
    { pages: 0 },
    { pages: 1.2 },
    { status: "uploading" },
    { goto: "Bad ID" },
    { url: "https://example.org" },
  ])("rejects invalid file data", (patch) =>
    expect(props.safeParse({ files: [{ ...file, ...patch }] }).success).toBe(false),
  );
  it.each([
    { files: [] },
    { files: Array(7).fill(file) },
    { files: [file], style: "tiles" },
    { files: [file], color: "red" },
  ])("rejects invalid collections", (input) => expect(props.safeParse(input).success).toBe(false));
});

describe("FileList fallback", () => {
  it("labels unavailable rows from the cast and never makes them actionable", () => {
    const cast: CastLike = {
      things: [{ type: "attachment", fields: ["name"] }],
      items: [{ id: "demo", type: "attachment", sample: true, name: "My attachment" }],
    };
    for (const input of [
      cast,
      { things: [], items: [] },
      { ...cast, items: [{ ...cast.items[0]!, name: 1 }] },
    ]) {
      const parsed = stampItemIds(meta, props.parse(fallback({ cast: input })));
      expect(parsed.files[0]?.name).toBe(input === cast ? "My attachment" : "Item one");
      expect(affordancesOf(meta, parsed, "c1")).toEqual([]);
    }
  });
});

describe("FileList actions and states", () => {
  it("only previews and downloads ready files and can remove unavailable ones", () => {
    const rows = [
      { ...file, goto: "preview" },
      { ...file, status: "downloading" },
      { ...file, status: "missing" },
    ];
    const parsed = stampItemIds(meta, props.parse({ files: rows, removable: true }));
    expect(affordancesOf(meta, parsed, "c1").map(({ address, detail }) => [address, detail])).toEqual([
      ["c1/r1", "→preview"],
      ["c1/r1/download", ""],
      ["c1/r1/remove", ""],
      ["c1/r2/remove", ""],
      ["c1/r3/remove", ""],
    ]);
    expect(partTierAt(meta, parsed, "download")).toBe("service");
    expect(partTierAt(meta, parsed, "root")).toBe("ok");
  });

  it("sends preview and download to the host and waits for removal confirmation", () => {
    const screen = { id: "home", components: [{ ...seed, id: "c1", c: "FileList" }] };
    const onAction = vi.fn();
    const runtime = createScreenController({ screen, defs: { FileList: def }, onAction });
    try {
      const press = (address: string) => runtime.act({ address, action: "press" });
      expect(press("c1/r1")).toMatchObject({ ok: true });
      expect(press("c1/r1/download")).toMatchObject({ ok: true });
      expect(press("c1/r2/remove")).toMatchObject({ ok: true });
      expect(onAction.mock.calls.flat()).toEqual([
        { address: "home/c1/r1", action: "press" },
        { address: "home/c1/r1/download", action: "press" },
      ]);
      expect(runtime.act({ address: "confirm/cancel", action: "dismiss" })).toMatchObject({ ok: true });
      expect(onAction).toHaveBeenCalledTimes(2);
      expect(press("c1/r2/remove")).toMatchObject({ ok: true });
      expect(press("confirm/confirm")).toMatchObject({ ok: true });
      expect(onAction).toHaveBeenLastCalledWith({ address: "home/c1/r2/remove", action: "press" });
    } finally {
      runtime.dispose();
    }
  });

  it("keeps authored pages when brief and omits page count from both the view and reading", () => {
    const address = "home/c1/r1/pages";
    const brief = { ...seed, detail: "brief" };
    expect(props.parse(brief).files[0]?.pages).toBe(4);
    expect(draw(seed).get(address)?.text).toEqual(["4 pages"]);
    expect(draw(brief).has(address)).toBe(false);
    const read = readComponent(def, brief, "c1").join("\n");
    expect(read).toContain("240 kB");
    expect(read).not.toMatch(/4 pages|demo_care/);
    expect(draw(seed, "loading").has("home/c1/r1/download")).toBe(false);
    expect(draw(seed, "empty").get("home/c1/message")?.text).toEqual(["No files attached"]);
    expect(draw(seed, "error").get("home/c1/message")?.text).toEqual(["Attachments unavailable"]);
  });
});

describe("FileList probes", () => {
  it("has positive and near-miss choices, a write and an addressed preview read", () => {
    expect(probes.filter((probe) => probe.kind === "choose").map(({ expect }) => expect)).toEqual([
      "FileList",
      "Gallery",
    ]);
    expect(probes.some((probe) => probe.kind === "write")).toBe(true);
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      expect: { address: "c1/r1", action: "press" },
    });
  });
});
