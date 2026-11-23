import { expect, it } from "vitest";
import {
  archetypes,
  checkScreen,
  components,
  planAct,
  readScreen,
  type ScreenLike,
} from "@lmthing/ui/catalog";

it.each([archetypes.list, archetypes.dashboard, archetypes.browse])(
  "makes $meta.id's canonical data-view example valid",
  ({ dataViewExample }) => {
    expect(checkScreen(dataViewExample, components)).toEqual([]);
  },
);

it("keeps the same row ids and reads or offers only the matching records after each staged action", () => {
  const screen = archetypes.list.dataViewExample;
  const press = { address: "plants/r2", action: "press" };
  const kitchen = { address: "rooms/r1", action: "toggle" };
  const plan = planAct(screen, components, {}, [kitchen, press]);
  expect(plan).toMatchObject({ ok: true, links: [{ goto: "basil", address: "plant_list/plants/r2" }] });
  if (!plan.ok) throw new Error(plan.code);
  const read = readScreen(screen, components, plan.values);
  expect(read).toContain('r2 "Basil"');
  expect(read).not.toMatch(/Fern|Monstera|No plants in the bathroom/);
  expect(planAct(screen, components, plan.values, [{ address: "plants/r1", action: "press" }])).toMatchObject(
    {
      ok: false,
      code: "not_actionable",
    },
  );
  const balcony = { address: "rooms/r4", action: "toggle" };
  const empty = planAct(screen, components, plan.values, [kitchen, balcony]);
  if (!empty.ok) throw new Error(empty.code);
  expect(readScreen(screen, components, empty.values)).toContain(
    'plants List (empty) "No plants on the balcony"',
  );
  const restored = planAct(screen, components, empty.values, [balcony, press]);
  expect(restored).toMatchObject({ ok: true, links: [{ goto: "basil", address: "plant_list/plants/r2" }] });
  expect(screen.components.at(-1)?.rows).toHaveLength(3);
});

it("changes whole sibling panels without reading a hidden panel or advertising its actions", () => {
  const screen: ScreenLike = {
    id: "bookings",
    components: [
      {
        id: "switcher",
        c: "Segmented",
        options: [
          { label: "Upcoming", view: { panel: "upcoming", empty: "No upcoming walks" } },
          { label: "Past", view: { panel: "past", empty: "No past walks" } },
          { label: "Cancelled", view: { empty: "No cancelled walks" } },
        ],
      },
      { id: "upcoming", c: "List", rows: [{ title: "Park booking", goto: "park" }] },
      { id: "past", c: "List", rows: [{ title: "River booking", trail: "toggle" }] },
    ],
  };
  const toggle = { address: "past/r1/trail", action: "toggle" };
  expect(planAct(screen, components, {}, [toggle])).toMatchObject({ ok: false });
  expect(readScreen(screen, components)).not.toMatch(/River booking|No cancelled walks/);
  const go = (row: number) => ({ address: `switcher/r${row}`, action: "select" });
  const plan = planAct(screen, components, {}, [go(2), toggle, go(3)]);
  if (!plan.ok) throw new Error(plan.code);
  const empty = readScreen(screen, components, plan.values);
  expect(empty).toContain('switcher/results "No cancelled walks"');
  expect(empty).not.toMatch(/Park booking|River booking/);
  const back = planAct(screen, components, plan.values, [go(2)]);
  if (!back.ok) throw new Error(back.code);
  expect(readScreen(screen, components, back.values)).toMatch(/River booking.*past\/r1\/trail.*:on/);
});

it("rejects partial or contradictory bindings without breaking legacy lines", () => {
  const scoped = { list: "plants", field: "category" };
  const empty = { empty: "No results" };
  const { Segmented, Chips } = components;
  const options = [
    { label: "All", view: empty },
    { label: "A", view: { ...empty, match: "A" } },
  ];
  expect(Segmented.props.safeParse({ filter: scoped, options }).success).toBe(true);
  expect(Segmented.props.safeParse({ options }).success).toBe(false);
  expect(Chips.props.safeParse({ filter: scoped, items: options }).success).toBe(false);
  expect(Chips.props.safeParse({ filter: scoped, items: options, style: "choose" }).success).toBe(true);
  expect(Segmented.props.safeParse({ filter: scoped, options: [options[0], { label: "A" }] }).success).toBe(
    false,
  );
  expect(Chips.props.safeParse({ filter: { ...scoped, field: "title" }, items: options }).success).toBe(
    false,
  );
  expect(Chips.props.safeParse({ items: [{ label: "A" }, { label: "B" }] }).success).toBe(true);
});

it("intersects two controls and unions selections within one filter", () => {
  const screen: ScreenLike = {
    id: "work",
    components: [
      {
        id: "status",
        c: "Segmented",
        filter: { list: "work_list", field: "badge" },
        options: [
          { label: "All", view: { empty: "No work" } },
          { label: "Ready", view: { match: "Ready", empty: "Nothing ready" } },
        ],
      },
      {
        id: "teams",
        c: "Chips",
        filter: { list: "work_list", field: "category" },
        items: [
          { label: "Editing", view: { match: "Editing", empty: "No editing work" } },
          { label: "Review", view: { match: "Review", empty: "No review work" } },
        ],
      },
      {
        id: "work_list",
        c: "List",
        rows: [
          { title: "Proofread", category: "Editing", badge: "Ready" },
          { title: "Check sources", category: "Review", badge: "Waiting" },
          { title: "Draft notes", category: "Writing", badge: "Ready" },
        ],
      },
    ],
  };
  const actions = [
    { address: "teams/r1", action: "toggle" },
    { address: "teams/r2", action: "toggle" },
  ];
  const both = planAct(screen, components, {}, actions);
  if (!both.ok) throw new Error(both.code);
  const read = readScreen(screen, components, both.values);
  expect(read).toContain("Proofread");
  expect(read).toContain("Check sources");
  expect(read).not.toContain("Draft notes");
  const ready = planAct(screen, components, both.values, [{ address: "status/r2", action: "select" }]);
  if (!ready.ok) throw new Error(ready.code);
  const narrowed = readScreen(screen, components, ready.values);
  expect(narrowed).toContain("Proofread");
  expect(narrowed).not.toMatch(/Check sources|Draft notes/);
});

it("rejects invalid sibling references while allowing explicit empty options", () => {
  const valid = archetypes.dashboard.dataViewExample;
  const bad = {
    ...valid,
    components: valid.components.map((entry) =>
      entry.c === "Segmented"
        ? {
            ...entry,
            options: [
              { label: "Summary", view: { panel: "heading", empty: "No summary" } },
              { label: "Empty", view: { empty: "No data" } },
            ],
          }
        : entry,
    ),
  };
  expect(checkScreen(bad, components)).toContainEqual({
    code: "S.data_view",
    address: "walk_dashboard/view/r1/root",
    message: "Option panel must name a sibling body content or data component",
  });
  const list = archetypes.list.dataViewExample;
  const badList = { ...list, components: list.components.filter(({ c }) => c !== "List") };
  expect(checkScreen(badList, components)).toContainEqual({
    code: "S.data_view",
    address: "plant_list/rooms/filter",
    message: "Filter must name a sibling List",
  });
});
