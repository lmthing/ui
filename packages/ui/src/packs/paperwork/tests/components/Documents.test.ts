import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  readComponent,
  stampItemIds,
} from "@lmthing/ui/catalog";
import { createScreenController, PhoneScreen } from "@lmthing/ui/kit";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it, vi } from "vitest";
import { addressedElements, config, renderInstance } from "../../../../../test/render";

const { meta, props, examples, fallback, probes } = components.Documents;
const entry = examples[0]!.docs[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const fallbackProps = fallback({ cast: { things: [], items: [] } });

describe("Documents contract", () => {
  it.each(examples)("parses a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it.each([
    { docs: [] },
    { docs: Array.from({ length: 7 }, () => entry) },
    { docs: [{ ...entry, title: "x".repeat(33) }] },
    { docs: [{ ...entry, kind: "unknown" }] },
    { docs: [{ ...entry, file: "https://example.test/file" }] },
    { docs: [{ ...entry, can_open: true }] },
    { docs: [{ ...entry, can_share: true }] },
    { docs: [{ ...entry, folder: "f".repeat(25) }] },
    { docs: [{ ...entry, pages: 0 }] },
    { docs: [{ ...entry, pages: 1.5 }] },
    { docs: [{ ...entry, share: "true" }] },
    { docs: [entry], color: "#fff" },
  ])("rejects invalid writer props", (input) => expect(props.safeParse(input).success).toBe(false));
  it("respects pack readiness and keeps the core near miss", () => {
    expect(createRegistry({ packs: ["paperwork"] }).ids.includes("Documents")).toBe(packReady("paperwork"));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "List" }));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "read" }));
  });
  it("falls back without an openable document or identifying data", () => {
    expect(props.parse(fallbackProps).docs[0]).toMatchObject({
      title: "Item one",
      can_open: false,
      tags: [],
    });
  });
});

describe("Documents states and actions", () => {
  it("offers opening only for a file or link, and confirms removal independently", () => {
    const docs = [fallbackProps.docs[0]!, { ...entry, file: undefined }, { ...entry, goto: undefined }];
    const offers = affordancesOf(meta, stampItemIds(meta, props.parse({ docs })), "d1");
    expect(offers.map(({ address, action }) => [address, action])).toEqual([
      ["d1/r1/remove", "press"],
      ["d1/r2", "press"],
      ["d1/r2/remove", "press"],
      ["d1/r3", "press"],
      ["d1/r3/remove", "press"],
    ]);
    expect(meta.confirmParts).toEqual(["remove", "share"]);
  });
  it("renders a file-only button and a separate remove button without exposing either secret", () => {
    const html = renderInstance("Documents", examples[1], "filled", theme);
    const parts = addressedElements(html);
    expect(parts.get("home/c1/r1/root")?.attributes).toContain('role="button"');
    expect(parts.get("home/c1/r1/remove")?.attributes).toContain('role="button"');
    const full = renderInstance("Documents", examples[0], "filled", theme);
    expect(full).toContain("••••");
    expect(full).not.toMatch(/DEMO-A|lib:greenhouse_permit/);
  });
  it.each(["empty", "error", "loading"] as const)("draws no item controls in %s", (state) => {
    const html = renderInstance("Documents", examples[0], state, theme);
    expect(html).not.toContain("home/c1/r1");
    expect(html).toContain(state === "loading" ? 'aria-busy="true"' : `home/c1/${state}`);
  });
  it("keeps stable item and action addresses in the brief view", () => {
    const html = renderInstance("Documents", { ...examples[0], detail: "brief" }, "filled", theme);
    const parts = addressedElements(html);
    for (const part of ["title", "owner", "kind", "expires", "file", "remove"]) {
      expect(parts.has(`home/c1/r1/${part}`)).toBe(true);
    }
    for (const part of ["issuer", "number", "issued", "tags"]) {
      expect(parts.has(`home/c1/r1/${part}`)).toBe(false);
    }
  });
});

describe("Documents folder and page options", () => {
  const rows = [
    { ...entry, title: "Original certificate", pages: 1 },
    { ...entry, title: "Policy", folder: "Cover", pages: 24 },
    { ...entry, title: "Office form", folder: "Office" },
    { ...entry, title: "Certificate of cover", folder: "Cover" },
  ];

  it("groups rows without renumbering, keeps page counts, and puts unfiled records last", () => {
    const input = { docs: rows, style: "folders" };
    const html = renderInstance("Documents", input, "filled", theme);
    const parts = addressedElements(html);
    expect([...parts.keys()].filter((key) => /\/r\d\/title$/.test(key))).toEqual(
      [2, 4, 3, 1].map((id) => `home/c1/r${id}/title`),
    );
    expect(parts.get("home/c1/r1/pages")?.text.join("").trim()).toBe("1 page");
    expect(parts.get("home/c1/r2/pages")?.text.join("").trim()).toBe("24 pages");
    expect(html).toContain("Unfiled");
    expect(html).not.toMatch(/DEMO-A|lib:greenhouse_permit/);
    const reading = readComponent(components.Documents, input, "d1", "filled").join("\n");
    expect(reading).toContain("24 pages");
    expect(reading).toContain("Cover");
    expect(reading).toContain("Unfiled");
    expect(readComponent(components.Documents, { docs: rows }, "d1", "filled").join("\n")).not.toContain(
      "Unfiled",
    );
  });

  it("renders the optional folder inline in rows, and keeps folder style loading inert", () => {
    const row = addressedElements(renderInstance("Documents", { docs: rows }, "filled", theme));
    expect(row.get("home/c1/r2/folder")?.text).toContain("Cover");
    const html = renderInstance("Documents", { docs: rows, style: "folders" }, "loading", theme);
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toMatch(/home\/c1\/r\d/);
  });
});

const share = { address: "home/d1/r1/share", action: "press" };

describe("Documents service share", () => {
  const confirm = "home/confirm/confirm";
  const run = vi.fn(() => ({ status: "accepted" as const }));
  const onLink = vi.fn();
  const fixture = (docs: object[], adapter = true) =>
    createScreenController({
      screen: { id: "home", components: [{ id: "d1", c: "Documents", docs }] },
      defs: { Documents: components.Documents },
      hostCommands: adapter ? { commands: { shareDocument: { allows: () => true, run } } } : {},
      onLink,
    });

  it("only renders sharing for explicit opt-in with an attachment, and requires a host offer", () => {
    const docs = [
      { ...entry, share: true },
      { ...entry, share: false },
      { ...entry, file: undefined, share: true },
    ];
    const parts = addressedElements(renderInstance("Documents", { docs }, "filled", theme));
    expect([1, 2, 3].map((id) => parts.has(`home/c1/r${id}/share`))).toEqual([true, false, false]);
    const absent = fixture(docs, false);
    const available = fixture(docs);
    try {
      expect(absent.actionsAt(share.address)).toEqual([]);
      expect(available.actionsAt(share.address)).toEqual(["press"]);
      expect(available.actionsAt("home/d1/r2/share")).toEqual([]);
      expect(available.actionsAt("home/d1/r3/share")).toEqual([]);
      expect(available.read()).not.toMatch(/DEMO-A|lib:greenhouse_permit/);
    } finally {
      absent.dispose();
      available.dispose();
    }
  });

  it("hands only the address to the service after confirmation and never follows goto", () => {
    const controller = fixture([{ ...entry, share: true }]);
    try {
      expect(controller.act(share).ok).toBe(true);
      expect(run).not.toHaveBeenCalled();
      expect(controller.press(confirm).ok).toBe(true);
      expect(run).toHaveBeenCalledExactlyOnceWith(
        { ...share, tier: "service", kind: "command", name: "shareDocument", input: {} },
        { source: "human", signal: expect.any(AbortSignal) },
      );
      expect(onLink).not.toHaveBeenCalled();
    } finally {
      controller.dispose();
    }
  });
});

describe("Documents mounted share availability", () => {
  it.each([undefined, false, true])("mounts a Share button only when the host allows it (%s)", (allowed) => {
    const screen = {
      id: "home",
      components: [{ id: "d1", c: "Documents", docs: [{ ...entry, share: true }] }],
    };
    const hostCommands =
      allowed === undefined
        ? undefined
        : {
            commands: {
              shareDocument: { allows: () => allowed, run: () => ({ status: "accepted" as const }) },
            },
          };
    const html = renderToStaticMarkup(
      createElement(
        TamaguiProvider,
        { config, defaultTheme: "kit_calm_light_moss" },
        createElement(PhoneScreen, { screen, theme, hostCommands }),
      ),
    );
    expect(addressedElements(html).has(share.address)).toBe(allowed === true);
  });
});
