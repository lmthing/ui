import { z } from "zod";
import { slotMoveOffer, text, visibleItems, type Definition, type Props } from "@lmthing/ui/catalog";
import {
  KitAction,
  KitCard,
  KitCheck,
  KitRow,
  KitText,
  useLiveControls,
  useNestedControls,
} from "@lmthing/ui/kit";

const row = z.strictObject({ key: z.string(), title: text(30), shown: z.boolean(), saved: z.boolean() });
const schema = z.strictObject({
  rows: z.array(
    z.strictObject({
      children: z.array(
        z.strictObject({
          title: text(30),
          chosen: z.enum(["a", "b"]),
          on: z.boolean(),
        }),
      ),
    }),
  ),
  notes: z.array(row),
  links: z.array(row),
});
const def = {
  meta: {
    id: "CollectionRuntimeFixture",
    group: "input",
    purpose: "Choose and order rows.",
    pick: "Fixture.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local.",
    items: {
      key: "rows",
      parts: ["root"],
      nested: {
        key: "children",
        groups: { limit: { mode: "multi", max: 1 } },
        parts: {
          pick: { action: "toggle", prop: "on", group: "limit" },
          choice: { action: "select", prop: "chosen", choices: ["a", "b"] },
          open: { action: "press", prop: "title" },
        },
      },
    },
    collections: {
      notes: {
        key: "notes",
        identity: "key",
        prefix: "note",
        parts: ["root", "move"],
        actions: { root: ["select"], move: ["move"] },
        select: { prop: "note" },
        visibleWhen: { shown: true },
        slotMoves: { move: { mode: "swap" } },
      },
      links: {
        key: "links",
        identity: "key",
        prefix: "link",
        parts: ["root", "save"],
        actions: { root: ["select"], save: ["check"] },
        select: { prop: "link" },
        toggles: { save: "saved" },
        when: { save: { note: "r_note_a" } },
      },
    },
  },
  props: schema,
  fallback: () => ({}),
  examples: [],
  probes: [],
} as const satisfies Definition;
type View = Props<typeof schema, typeof def.meta>;

function NestedRows({ input }: { input: View }) {
  const { controls } = useNestedControls(def.meta, input);
  return input.rows.map((row) => (
    <KitRow key={row.id} item={row.id} label={row.id}>
      {controls
        .filter(({ target }) => target.startsWith(`${row.id}/`))
        .map(({ part, spec, item, disabled }) => {
          const label = `${String(item.title)} ${spec.action}`;
          if (spec.action === "toggle")
            return <KitCheck key={part} {...{ part, label, disabled }} done={item[spec.prop] === true} />;
          const value = spec.action === "select" ? (item[spec.prop] === "b" ? "a" : "b") : undefined;
          return (
            <KitAction
              key={part}
              {...{ part, label, disabled }}
              action={spec.action}
              {...(value === undefined ? {} : { value })}
            />
          );
        })}
    </KitRow>
  ));
}

export function CollectionRuntimeFixture(input: View) {
  const live = useLiveControls(def.meta, input);
  const { notes, links } = def.meta.collections;
  const names = { notes, links };
  return (
    <KitCard part="root">
      <NestedRows input={input} />
      {(Object.keys(names) as (keyof typeof names)[]).map((name) =>
        visibleItems<View["notes"][number]>(def.meta, live, name).map((row) => {
          const destination = slotMoveOffer(def.meta, live, name, row.id, "move")?.move.choices[0];
          return (
            <KitRow key={row.id} item={row.id} part={null} label={row.title}>
              <KitAction label={row.title} action="select" />
              <KitText part="status">
                {live[names[name].select.prop] === row.id ? "Selected" : "Not selected"}
              </KitText>
              {destination && <KitAction label="Swap" part="move" action="move" value={destination} />}
              {name === "links" && live.note === "r_note_a" && (
                <KitCheck part="save" done={row.saved} label="Save" />
              )}
            </KitRow>
          );
        }),
      )}
    </KitCard>
  );
}

const makeRow = (key: string, title: string, shown = true) => ({ key, title, shown, saved: false });
export const defs = { CollectionRuntimeFixture: def };
export const screen = {
  id: "home",
  components: [
    {
      id: "c1",
      c: def.meta.id,
      rows: [
        {
          children: [
            { title: "First", on: true, chosen: "a" },
            { title: "Second", on: false, chosen: "a" },
          ],
        },
      ],
      notes: [makeRow("a", "Note A"), makeRow("b", "Note B"), makeRow("c", "Hidden note", false)],
      links: [makeRow("a", "Link A")],
    },
  ],
};
