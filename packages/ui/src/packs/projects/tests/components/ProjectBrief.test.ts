import { expect, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  planAct,
  readComponent,
  type StateName,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController, type HostCommandResult } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { ProjectBrief } = components;
const { props, examples, fallback, probes } = ProjectBrief;
const first = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const path = (part: string) => `home/p1/${part}`;
const draw = (input: object, state: StateName = "filled", finish: ThemeChoice = theme) =>
  addressedElements(renderInstance("ProjectBrief", input, state, finish, { component: "p1" }));
const screen = (input: object = first, state: StateName = "filled") => ({
  id: "home",
  components: [{ ...input, c: "ProjectBrief", id: "p1", state }],
});
const press = (at: string) => ({ address: `p1/${at}`, action: "press" });
const open = press("r3/open");

it.each(examples)("accepts a domain example", (example) => {
  expect(props.safeParse(example).success).toBe(true);
});

it("accepts the maximum field and list sizes and rejects values outside them", () => {
  const sections = Array.from({ length: 3 }, () => ({ heading: "h".repeat(24), body: "b".repeat(160) }));
  const prefix = "https://example.org/";
  const links = Array.from({ length: 5 }, () => ({
    label: "l".repeat(28),
    kind: "url",
    goto: prefix + "u".repeat(120 - prefix.length),
  }));
  const max = {
    projectRef: "p".repeat(32),
    title: "t".repeat(40),
    objective: "o".repeat(240),
    owner: "a".repeat(24),
    sections,
    links,
    start: "2028-02-29",
    target: "2028-02-29",
  };
  expect(props.safeParse(max).success).toBe(true);
  for (const changes of [
    { projectRef: `${max.projectRef}x` },
    { title: `${max.title}x` },
    { objective: `${max.objective}x` },
    { owner: `${max.owner}x` },
    { sections: [...sections, sections[0]] },
    { sections: [{ ...sections[0], heading: "x".repeat(25) }] },
    { sections: [{ ...sections[0], body: "x".repeat(161) }] },
    { links: [...links, links[0]] },
    { links: [{ ...links[0], label: "x".repeat(29) }] },
    { links: [{ ...links[0], goto: `${links[0]!.goto}x` }] },
    { start: "2026-02-29" },
    { target: "2028-02-28" },
    { editGoto: "Bad ID" },
    { style: "summary" },
    { window: "Set by code" },
    { density: "compact" },
    { surface: "outlined" },
  ])
    expect(props.safeParse({ ...max, ...changes }).success, JSON.stringify(changes)).toBe(false);
});

it("keeps unsafe and misclassified destinations off all action paths", () => {
  for (const [kind, goto] of [
    ["url", "http://example.org"],
    ["url", "javascript:alert(1)"],
    ["url", "//example.org"],
    ["url", "https://person:secret@example.org"],
    ["url", "https://example.org/with space"],
    ["url", "https://example.org\\path"],
    ["screen", "https://example.org"],
    ["file", "../../file.pdf"],
    ["file", "https://example.org"],
    ["url", "local_file"],
  ])
    expect(props.safeParse({ ...first, links: [{ label: "Resource", kind, goto }] }).success).toBe(false);
  expect(props.safeParse({ ...first, links: [{ ...first.links[0], internal: true }] }).success).toBe(false);
  expect(props.safeParse({ ...first, links: [{ ...first.links[0], id: "r1" }] }).success).toBe(false);
});

it("uses cast and neutral fallback copy and preserves the core and variant probes", () => {
  const cast = (label: unknown, detail: unknown) => ({
    things: [{ type: "record", fields: ["label", "detail"] }],
    items: [{ id: "draft", type: "record", sample: true, label, detail }],
  });
  expect(props.parse(fallback({ cast: cast("Museum installation", "Light six prints") }))).toMatchObject({
    title: "Museum installation",
    objective: "Light six prints",
    sections: [],
    links: [],
  });
  for (const empty of [{ things: [], items: [] }, cast(23, false)])
    expect(props.parse(fallback({ cast: empty }))).toMatchObject({
      title: "Item one",
      objective: "Item two",
    });
  expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "KeyValue" }));
  expect(probes).toContainEqual(
    expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
  );
  expect(createRegistry({ packs: ["projects"] }).ids.includes("ProjectBrief")).toBe(packReady("projects"));
});

it("draws state-specific and stable parts and keeps hidden sections and links out of reads", () => {
  const full = draw(first);
  for (const part of [
    "root",
    "title",
    "objective",
    "owner",
    "window",
    "section_1",
    "section_1_body",
    "section_2",
    "section_2_body",
    "resources",
    "r1/root",
    "r2/root",
    "r3/root",
    "r3/open",
    "r3/open_icon",
    "edit",
    "edit_label",
  ])
    expect(full.has(path(part))).toBe(true);
  expect([...draw(first, "filled", { ...theme, density: "compact" }).keys()]).toEqual([...full.keys()]);
  const brief = { ...first, detail: "brief" };
  expect([...draw(brief).keys()]).toEqual(["root", "title", "objective", "owner", "window"].map(path));
  expect(draw(first, "empty").get(path("empty"))?.text).toContain("No project brief yet");
  const loading = draw(first, "loading");
  for (const address of ["r1/root", "r2/root", "r3/open", "edit"]) {
    expect(loading.has(path(address))).toBe(true);
    expect(loading.get(path(address))?.attributes).not.toMatch(/role="(?:button|link)"/);
  }
  expect(readComponent(ProjectBrief, first, "p1").join("\n")).toContain("Launch criteria");
  const read = readComponent(ProjectBrief, brief, "p1").join("\n");
  expect(read).toContain("Target: 27 Nov 2026");
  expect(read).not.toMatch(/16 Nov|Launch criteria|Agreed scope|Design files|Preview site| press/);
});

it("opens only local destinations through navigation and disables hidden and non-filled actions", () => {
  const onLink = vi.fn();
  const controller = createScreenController({ screen: screen(), defs: { ProjectBrief }, onLink });
  try {
    for (const address of ["r1", "r2", "edit"]) expect(controller.act(press(address)).ok).toBe(true);
    expect(controller.act(press("r3")).ok).toBe(false);
    expect(controller.act(open).ok).toBe(false);
    expect(controller.read()).not.toMatch(/https:|r3\/open press/);
    expect(onLink.mock.calls.map(([goto]) => goto)).toEqual([
      "projects_scope",
      "folio_design_files",
      "projects_brief_edit",
    ]);
  } finally {
    controller.dispose();
  }
  for (const [input, state] of [
    [{ ...first, detail: "brief" }, "filled"],
    [first, "empty"],
    [first, "loading"],
  ] as const)
    for (const address of ["r1", "r2", "r3/open", "edit"])
      expect(planAct(screen(input, state), { ProjectBrief }, {}, [press(address)]).ok).toBe(false);
  const { editGoto: _editGoto, ...plain } = first;
  expect(planAct(screen(plain), { ProjectBrief }, {}, [press("edit")]).ok).toBe(false);
});

it("requires local confirmation and hands HTTPS off once while pending, not through navigation", async () => {
  let permitted = false;
  let finish!: (result: HostCommandResult) => void;
  const run = vi.fn(
    () =>
      new Promise<HostCommandResult>((resolve) => {
        finish = resolve;
      }),
  );
  const onLink = vi.fn();
  const controller = createScreenController({
    screen: screen(),
    defs: { ProjectBrief },
    onLink,
    hostCommands: { external: { allows: () => permitted, run } },
  });
  try {
    expect(controller.act(open).ok).toBe(false);
    expect(run).not.toHaveBeenCalled();
    permitted = true;
    expect(controller.read()).toContain("[p1/r3/open press external");
    expect(controller.read()).not.toContain("https://");
    expect(controller.act(open)).toMatchObject({ ok: false, code: "not_mounted" });
    controller.registerPart(open.address);
    expect(controller.act(open, { dryRun: true }).ok).toBe(true);
    expect(run).not.toHaveBeenCalled();
    expect(controller.press(open.address).ok).toBe(true);
    expect(controller.read()).toContain("(user confirmation required)");
    expect(controller.press("confirm/cancel").ok).toBe(true);
    expect(run).not.toHaveBeenCalled();
    expect(controller.press(open.address).ok).toBe(true);
    controller.registerPart("confirm/confirm");
    expect(controller.act({ address: "confirm/confirm", action: "press" }, { agent: true }).ok).toBe(false);
    expect(controller.press("confirm/confirm").ok).toBe(true);
    expect(controller.act(open).ok).toBe(false);
    await vi.waitFor(() =>
      expect(run).toHaveBeenCalledExactlyOnceWith(
        {
          kind: "external",
          address: path("r3/open"),
          action: "press",
          tier: "service",
          uri: "https://example.org/folio",
        },
        expect.objectContaining({ source: "human" }),
      ),
    );
    finish({ status: "accepted" });
    await vi.waitFor(() => expect(controller.read()).toContain("p1/r3 operation external accepted"));
    expect(controller.canPress(open.address)).toBe(true);
    expect(onLink).not.toHaveBeenCalled();
    expect(controller.snapshotScreen().components[0]).toMatchObject(first);
  } finally {
    controller.dispose();
  }
});
