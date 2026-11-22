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
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { ProjectStatus } = components;
const { props, examples, fallback, probes } = ProjectStatus;
const first = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const draw = (input: object, state: StateName = "filled", finish: ThemeChoice = theme) =>
  addressedElements(renderInstance("ProjectStatus", input, state, finish, { component: "p1" }));
const screen = (input: object, state: StateName = "filled") => ({
  id: "status",
  components: [{ ...input, c: "ProjectStatus", id: "p1", state }],
});
const milestone = { address: "p1/milestone", action: "press" };
const update = { address: "p1/update", action: "press" };

it.each(examples)("accepts a domain example", (example) => {
  expect(props.safeParse(example).success).toBe(true);
});

it("enforces date, reference, text and collection limits and rejects computed fields", () => {
  const item = first.nextMilestone!;
  const limit = "x".repeat(80);
  expect(
    props.safeParse({
      ...first,
      projectRef: "p".repeat(32),
      headline: limit,
      author: "a".repeat(24),
      wins: [limit, limit, limit],
      blockers: [limit, limit, limit],
      nextMilestone: { ...item, title: "m".repeat(32), due: "2028-02-29" },
    }).success,
  ).toBe(true);
  for (const invalid of [
    { projectRef: "p".repeat(33) },
    { headline: `${limit}x` },
    { author: "a".repeat(25) },
    { wins: [limit, limit, limit, limit] },
    { blockers: [`${limit}x`] },
    { status: "green" },
    { updatedAt: "2026-02-29" },
    { nextMilestone: { ...item, due: "2028-02-30" } },
    { nextMilestone: { ...item, title: "m".repeat(33) } },
    { nextMilestone: { ...item, daysLeft: 5 } },
    { postGoto: "Bad ID" },
    { style: "compact" },
    { tone: "bad" },
    { density: "compact" },
    { surface: "outlined" },
    { milestone: { goto: "elsewhere" } },
  ])
    expect(props.safeParse({ ...first, ...invalid }).success, JSON.stringify(invalid)).toBe(false);
});

it("uses cast names and neutral placeholders and keeps core-first and brief probes", () => {
  const cast = (label: unknown) => ({
    things: [{ type: "record", fields: ["label"] }],
    items: [{ id: "draft", type: "record", sample: true, label }],
  });
  expect(props.parse(fallback({ cast: cast("Museum installation") }))).toMatchObject({
    headline: "Museum installation",
    status: "on_track",
    wins: [],
    blockers: [],
  });
  for (const empty of [{ things: [], items: [] }, cast(42)])
    expect(props.parse(fallback({ cast: empty })).headline).toBe("Item one");
  expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Card" }));
  expect(probes).toContainEqual(
    expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
  );
  expect(createRegistry({ packs: ["projects"] }).ids.includes("ProjectStatus")).toBe(packReady("projects"));
});

it("keeps filled addresses across finishes and only reads and draws the short snapshot in brief detail", () => {
  const keys = (input: object) => [...draw(input).keys()];
  const full = keys(first);
  expect(full).toEqual(
    expect.arrayContaining(
      [
        "root",
        "status",
        "headline",
        "author",
        "updated_at",
        "wins",
        "blockers",
        "milestone",
        "milestone_title",
        "milestone_due",
        "milestone_remaining",
        "update",
        "update_label",
      ].map((part) => `home/p1/${part}`),
    ),
  );
  expect([...draw(first, "filled", { ...theme, density: "compact" }).keys()]).toEqual(full);
  expect(keys({ ...first, detail: "brief" })).toEqual(
    full.filter((part) => /\/(root|status|headline|updated_at)$/.test(part)),
  );
  const brief = readComponent(ProjectStatus, { ...first, detail: "brief" }, "p1").join("\n");
  expect(brief).toContain("At risk · Design is ready for review · 19 Nov 2026");
  expect(brief).not.toMatch(/Jo Lee|Wins:|Blockers:|Design sign-off|\/(?:update|milestone) press/);
});

it("renders the specific empty message and loads without active navigation", () => {
  expect(draw(first, "empty").get("home/p1/empty")?.text).toContain("No status update posted yet");
  const loading = draw(first, "loading");
  expect(loading.get("home/p1/status")?.attributes).toContain('aria-busy="true"');
  expect(loading.get("home/p1/milestone")?.attributes).not.toContain('role="link"');
  expect(loading.get("home/p1/update")?.attributes).not.toMatch(/role="(?:button|link)"/);
});

it("offers only visible, independently linked actions and does not update the snapshot", () => {
  const onLink = vi.fn();
  const controller = createScreenController({ screen: screen(first), defs: { ProjectStatus }, onLink });
  try {
    expect(controller.read()).toContain("[p1/milestone press→projects_gates]");
    expect(controller.read()).toContain("[p1/update press→projects_check_in]");
    expect(controller.act(milestone).ok).toBe(true);
    expect(controller.act(update).ok).toBe(true);
    expect(onLink.mock.calls.map(([goto]) => goto)).toEqual(["projects_gates", "projects_check_in"]);
    expect(controller.snapshotScreen().components[0]).toMatchObject(first);
  } finally {
    controller.dispose();
  }
  for (const [input, state] of [
    [examples[1]!, "filled"],
    [{ ...first, detail: "brief" }, "filled"],
    [first, "empty"],
    [first, "loading"],
  ] as const)
    for (const action of [milestone, update])
      expect(planAct(screen(input, state), { ProjectStatus }, {}, [action]).ok).toBe(false);
});
