import {
  components,
  createRegistry,
  packReady,
  planAct,
  readComponent,
  type DeviceData,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { describe, expect, it, vi } from "vitest";
import { addressedElements, elementAt, renderExample, renderInstance } from "../../../../../test/render";

const def = components.Signature;
const { examples, meta, props, fallback, probes } = def;
const input = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const screen = { id: "home", components: [{ ...input, id: "s1", c: "Signature" }] };
const defs = { Signature: def };
const base = { instance: "s1", document: input.document, signer: input.signer, version: "v1" };
const opened = { ...base, openedVersion: "v1" };
const reviewed = { ...opened, reviewedVersion: "v1" };
const mark = "local:test_mark";
const captured = { ...reviewed, draft: { version: "v1", revision: "draft1", mark } };
const data = (form: unknown): DeviceData => ({ signatureForms: [form] });
const read = (form: unknown) =>
  readComponent(def, input, "s1", "filled", {}, undefined, data(form)).join("\n");

describe("Signature contract", () => {
  it.each(examples)("parses an example", (example) => expect(props.safeParse(example).success).toBe(true));
  it("enforces exact bounds and rejects Writer attempts to author signing data", () => {
    const bounds = {
      title: "T".repeat(32),
      signer: "S".repeat(28),
      hint: "H".repeat(60),
      document: `local:${"a".repeat(114)}`,
    };
    expect(props.safeParse(bounds).success).toBe(true);
    for (const field of ["title", "signer", "hint", "document"] as const)
      expect(props.safeParse({ ...bounds, [field]: `${bounds[field]}a` }).success).toBe(false);
    for (const [key, value] of Object.entries({
      style: "typed",
      datedStamp: "true",
      density: "compact",
      surface: "plain",
      detail: "tiny",
      color: "#fff",
      mark,
      strokes: [],
      version: "v1",
      reviewedVersion: "v1",
      savedOn: "2026-11-20",
      can_save: true,
    }))
      expect(props.safeParse({ ...input, [key]: value }).success).toBe(false);
    expect(props.safeParse({ ...input, document: "https://example.org/original" }).success).toBe(false);
  });

  it("uses neutral or cast copy and retains the core toggle near miss", () => {
    const things = [{ type: "record", fields: ["name", "note"] }];
    const row = { id: "form", type: "record", sample: true, name: "Test form", note: "Test signer" };
    for (const cast of [
      { things: [], items: [] },
      { things, items: [row] },
      { things, items: [{ ...row, name: 4 }] },
    ])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: { things: [], items: [] } }).title).toBe("Item one");
    expect(fallback({ cast: { things, items: [row] } })).toMatchObject({ title: row.name, signer: row.note });
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Field" }));
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
    );
    expect(meta.confirmParts).toEqual(["clear"]);
    expect(createRegistry({ packs: ["paperwork"] }).ids.includes("Signature")).toBe(packReady("paperwork"));
  });
});

describe("Signature view", () => {
  it("draws every state, only mounting the capture part outside loading and terminal states", () => {
    const results = Object.fromEntries(
      meta.states.map((state) => [state, renderExample("Signature", input, state, theme).html]),
    );
    const ids = (state: keyof typeof results) => addressedElements(results[state]!);
    for (const state of ["empty", "filled"] as const) {
      for (const part of [
        "root",
        "title",
        "signer",
        "hint",
        "document",
        "review",
        "pad_frame",
        "pad",
        "clear",
        "save",
      ])
        expect(ids(state).has(`home/c1/${part}`)).toBe(true);
      expect(elementAt(results[state]!, "home/c1/review").attributes).toContain(
        state === "empty" ? 'role="checkbox"' : 'role="img"',
      );
    }
    for (const state of ["loading", "success", "error"])
      for (const part of ["pad", "review"]) expect(ids(state).has(`home/c1/${part}`)).toBe(false);
    expect(ids("success").has("home/c1/success")).toBe(true);
    expect(ids("error").has("home/c1/error")).toBe(true);
    expect(elementAt(results.loading!, "home/c1/pad_frame").attributes).toContain('aria-busy="true"');
    for (const html of Object.values(results)) expect(html).not.toMatch(/lib:ledge_access|local:synthetic/);
  });

  it("keeps theme density address-stable and hides only the hint in brief detail", () => {
    const parts = (patch: object, density?: "compact") => [
      ...addressedElements(
        renderInstance("Signature", { ...input, ...patch }, "filled", { ...theme, density }),
      ).keys(),
    ];
    expect(parts({}, "compact")).toEqual(parts({}));
    expect(parts({ detail: "brief" })).toEqual(parts({}).filter((key) => !key.endsWith("/hint")));
  });
});

describe("Signature view options", () => {
  it("uses the same private pad for initials and adds stamp copy only when requested", () => {
    const legacy = renderExample("Signature", input, "filled", theme).html;
    const explicit = renderExample(
      "Signature",
      { ...input, style: "pad", datedStamp: false },
      "filled",
      theme,
    ).html;
    expect(explicit).toBe(legacy);
    const options = { ...input, style: "initials", datedStamp: true };
    const draft = renderExample("Signature", options, "filled", theme).html;
    expect(addressedElements(draft).get("home/c1/date_stamp")?.text.join("")).toContain("Signing date");
    const pending = renderExample("Signature", options, "empty", theme).html;
    expect(addressedElements(pending).get("home/c1/date_stamp")?.text).toContain(
      "Add the signing date to the copy",
    );
    expect(draft).toContain("Draft initials");
    expect(draft).toContain("Save initialed copy");
    const success = renderExample("Signature", options, "success", theme).html;
    expect(success).toContain("Initialed copy saved");
    expect(success).toContain("Date stamped on the copy");
    expect(success).not.toMatch(/home\/c1\/pad|local:synthetic/);
  });
});

describe("Signature read and capture boundary", () => {
  it("offers review only after opening, and clear and save only for a current reviewed draft", () => {
    const offers = (form: unknown) => read(form).match(/\[s1\/\w+ \w+/g);
    expect(offers(base)).toEqual(["[s1/document press"]);
    expect(offers(opened)).toEqual(["[s1/document press", "[s1/review check"]);
    expect(offers(reviewed)).toEqual(["[s1/document press"]);
    expect(offers(captured)).toEqual(["[s1/document press", "[s1/clear press", "[s1/save press"]);
    expect(offers({ ...captured, version: "v2" })).toEqual(["[s1/document press"]);
    expect(offers({ ...captured, saved: { version: "v1", date: "2026-11-20" } })).toEqual([
      "[s1/document press",
    ]);
    expect(read(captured)).toContain("(private mark)");
    expect(read(captured)).not.toMatch(/local:|lib:|draft1/);
    const stale = planAct(
      screen,
      defs,
      {},
      [{ address: "s1/save", action: "press" }],
      null,
      "planner",
      data({ ...captured, version: "v2" }),
    );
    expect(stale).toMatchObject({ ok: false, code: "not_actionable" });
  });

  it("rejects agent capture and delivers accepted capture only through a registered host pad", () => {
    const onAction = vi.fn();
    const controller = createScreenController({ screen, defs, deviceData: data(reviewed), onAction });
    controller.registerPart("home/s1/pad");
    try {
      const step = { address: "home/s1/pad", action: "set", value: mark };
      const host = controller.registerPrivateMarkPart(step.address, (ref) => ref === mark);
      expect(controller.act(step, { agent: true })).toMatchObject({ ok: false, code: "not_actionable" });
      expect(planAct(screen, defs, {}, [step], null, "planner", data(reviewed)).ok).toBe(false);
      host.capture("local:foreign");
      expect(onAction).not.toHaveBeenCalled();
      host.capture(mark);
      expect(onAction).toHaveBeenCalledExactlyOnceWith(step);
      expect(controller.read()).not.toMatch(/local:|lib:|\/pad set/);
      expect(JSON.stringify(controller.snapshotScreen())).not.toContain(mark);
    } finally {
      controller.dispose();
    }
  });
});

describe("Signature confirmation", () => {
  it("sends clear only after confirmation, and invalidates confirmation for a replacement draft", () => {
    const onAction = vi.fn();
    const deviceData = data(captured);
    const controller = createScreenController({ screen, defs, deviceData, onAction });
    const open = () => expect(controller.press("s1/clear").ok).toBe(true);
    try {
      open();
      expect(controller.act({ address: "confirm/cancel", action: "dismiss" }).ok).toBe(true);
      expect(onAction).not.toHaveBeenCalled();
      open();
      (deviceData.signatureForms as unknown[])[0] = {
        ...captured,
        draft: { ...captured.draft, revision: "draft2" },
      };
      expect(controller.confirmation).toBeUndefined();
      expect(controller.press("confirm/confirm").ok).toBe(false);
      expect(onAction).not.toHaveBeenCalled();
      open();
      expect(controller.press("confirm/confirm").ok).toBe(true);
      expect(onAction).toHaveBeenCalledExactlyOnceWith({ action: "press", address: "home/s1/clear" });
      expect(controller.press("s1/save").ok).toBe(true);
      expect(onAction).toHaveBeenLastCalledWith({ action: "press", address: "home/s1/save" });
    } finally {
      controller.dispose();
    }
  });
});
