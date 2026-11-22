import { z } from "zod";
import {
  clip,
  detailOf,
  itemsOf,
  photo,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import * as kit from "../../../kit";
import {
  directoryGroups,
  directoryInitials,
  directoryReading,
  directorySearchMax,
  projectDirectory,
} from "../copy";
import { teamWordsFor } from "../lang";

// Core first: People/rows lists participants without a searchable department directory, reporting lines, or staff contact controls.
export const meta = {
  id: "TeamDirectory",
  status: "ready",
  group: "content",
  tier: "people",
  pick: "Search a staff directory by name, role or department, see reporting lines and availability, and contact colleagues. Not a simple people list (People), business clients (ClientCard), or club registers (Members).",
  purpose: "Find workplace teammates, see who is available, and get in touch.",
  region: "body",
  weight: 3,
  realPath:
    "staff directory and live shift status synced from a shared workplace app; calling opens the device dialer or VoIP service (call).",
  dense: true,
  variants: { detail: ["full", "brief"], density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  variantParts: { "detail.brief": { hides: ["message", "call"] } },
  writeHints: [
    'Use detail "brief" only if asked for a flat alphabetical directory without message or call buttons. Keep department and member data. Set density and surface to null unless requested.',
  ],
  parts: ["root", "title", "search", "empty"],
  items: {
    key: "members",
    parts: ["root", "photo", "name", "role", "manager", "availability", "message", "call"],
  },
  actions: {
    parts: { search: ["type"] },
    items: { root: ["press"], message: ["press"], call: ["press"] },
    when: { message: { $detail: "full" }, call: { $detail: "full" } },
    noGoto: { items: ["message", "call"] },
  },
  live: { text: { search: { prop: "query", max: directorySearchMax } }, derive: projectDirectory },
  emptyActions: ["search.type"],
  partTiers: { call: "service" },
  states: ["filled", "empty", "loading"],
  read: (input, state, lang): string[] =>
    state === "filled" ? directoryReading(input as ViewProps, lang) : [],
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    departments: z.array(text(24)).min(0).max(6).meta({ read: false }),
    members: z
      .array(
        z.strictObject({
          name: text(24),
          role: text(24),
          department: text(24).optional(),
          photo: photo.optional(),
          availability: z.enum(["on_shift", "break", "pto", "off"]),
          manager: text(24).optional(),
          goto: screenId.optional(),
        }),
      )
      .min(1)
      .max(16),
    query: text(directorySearchMax).optional().meta({ read: false }),
  })
  .overwrite((input) => ({
    ...input,
    members: input.members.map((member) => ({ ...member, $detail: input.detail })),
  }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const role = clip(placeholderTitle(1, lang), 24);
  const members = itemsOf(cast, 16).flatMap((item) => {
    const name = titleOf(item, 24, thing);
    return name ? [{ name, role: detailOf(item, 24, thing) ?? role, availability: "off" as const }] : [];
  });
  return {
    departments: [],
    members: members.length
      ? members
      : [{ name: clip(placeholderTitle(0, lang), 24), role, availability: "off" }],
  };
}

// prettier-ignore
export const examples = [
  { departments: ["Greenhouse", "Dispatch"], members: [
    { name: "Rae Price", role: "Grower", department: "Greenhouse", manager: "Anna Cole", availability: "on_shift", goto: "rae" },
    { name: "Anna Cole", role: "Grow lead", department: "Greenhouse", availability: "break" },
    { name: "Lee Park", role: "Dispatcher", department: "Dispatch", availability: "pto" },
  ] },
  { departments: ["Walks"], members: [
    { name: "Sam Ortiz", role: "Route lead", department: "Walks", availability: "off" },
    { name: "Mina Chen", role: "Walker", department: "Walks", manager: "Sam Ortiz", availability: "on_shift" },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("TeamDirectory");
export const probes = [
  choose(
    "Give me an employee directory searchable by name or department with reporting managers, staff availability and message or call buttons.",
  ),
  choose(
    "Just show Anna and Rae as the two people assigned to this job, with their names and photos.",
    "People",
  ),
  write(
    "Staff directory: Greenhouse department, Rae Price the Grower reports to Anna Cole and is on shift; Anna Cole is Grow lead and on break.",
  ),
  {
    ...write(
      "Make a staff directory, flat and alphabetical without contact shortcuts. Walks department: Sam Ortiz, Route lead, off shift; Mina Chen, Walker, on shift. Retain the department data. Leave density and surface null.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Call Rae Price from the staff directory.", { address: "t1/r1/call", action: "press" }),
] satisfies Probe[];

type ViewProps = Props<typeof props, typeof meta>;
type Member = ViewProps["members"][number];

const statusTone = { on_shift: "good", break: "warn", pto: "muted", off: "muted" } as const;

// prettier-ignore
function MemberRow({ row, brief, density }: { row: Member; brief: boolean; density: ViewProps["density"] }) {
  const context = kit.usePartContext();
  const { words: { teamDirectory: words } } = kit.useWords(teamWordsFor);
  const loading = context.state === "loading";
  const identity = (
    <kit.KitRow item={row.id} part={loading ? null : "root"} label={row.name} role={!loading && !row.goto ? "button" : "group"}
      goto={loading ? undefined : row.goto} inset="none" density={density} leadingAlign="row"
      leading={<kit.KitPhoto part={loading ? null : "photo"} shape="round" photo={row.photo}
        label={row.name} initials={directoryInitials(row.name)} loading={loading} />}>
      <kit.KitMetaLine title={{ text: row.name, part: "name", role: "body", strong: true }}
        meta={[{ text: row.role, part: "role" }, { text: row.manager && words.manager(row.manager), part: "manager" }]}
        density={density} />
    </kit.KitRow>
  );
  return (
    <kit.KitGrid fitLast density={density}>
      {identity}
      <kit.PartScope {...context} item={row.id}>
        <kit.KitContent density={density}>
          <kit.KitRow part={null} label={words.status[row.availability]} inline fitContent inset="none" density={density}
            trailing={<kit.KitTrail kind="badge" value={words.status[row.availability]} tone={statusTone[row.availability]} part="availability" density={density} />}>
            {null}
          </kit.KitRow>
          {!brief && <kit.KitActionFooter align="end" density={density}>
            <kit.KitAction part="message" icon="message" a11y={words.messagePerson(row.name)} kind="quiet" contentParts={{}} />
            <kit.KitAction part="call" icon="phone" a11y={words.callPerson(row.name)} kind="quiet" contentParts={{}} />
          </kit.KitActionFooter>}
        </kit.KitContent>
      </kit.PartScope>
    </kit.KitGrid>
  );
}

// prettier-ignore
function DirectoryRows({ input, density }: { input: ViewProps; density: ViewProps["density"] }) {
  const { lang, words: { teamDirectory: words } } = kit.useWords(teamWordsFor);
  const groups = directoryGroups(input, lang);
  if (groups.length === 0) return <kit.KitEmpty part="empty" title={words.empty} icon="search" decorativeIcon prominence="body" />;
  return (
    <kit.KitRowGroup separators={false} spacing="groups" density={density}>
      {groups.map(({ department, members }) => (
        <kit.KitContent key={department ?? ""} density={density}>
          {department && <kit.KitHeader title={{ text: department, role: "meta", strong: true }} density={density} />}
          <kit.KitRowGroup density={density} spacing="groups" separators={false}>
            {members.map((row) => <MemberRow key={row.id} row={row} brief={input.detail === "brief"} density={density} />)}
          </kit.KitRowGroup>
        </kit.KitContent>
      ))}
    </kit.KitRowGroup>
  );
}

// prettier-ignore
export function TeamDirectory(input: ViewProps) {
  const { words: { teamDirectory: words } } = kit.useWords(teamWordsFor);
  const context = kit.usePartContext();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const query = kit.useControlValue(`${context.screen}/${context.component}/$type/search`, input.query ?? "");
  const live = projectDirectory({ ...input, detail, query }) as ViewProps;
  const search = <kit.KitInput part="search" kind="search" hint={words.search} value={query} />;
  const rows = <DirectoryRows input={live} density={density} />;
  const header = <kit.KitHeader title={{ text: words.title, part: "title" }} density={density} />;
  return (
    <kit.KitCard part="root" style="inset" padded {...{ density, surface }}>
      {context.state === "loading" ? <kit.KitState density={density} loading={<kit.KitContent density={density}>
        {header}{search}<DirectoryRows input={{ ...input, detail }} density={density} />
      </kit.KitContent>} /> : <kit.KitContent density={density}>
        {header}{search}
        <kit.KitState message={query.trim() ? words.empty : words.unassigned} icon="search" density={density} part="empty">
          {rows}
        </kit.KitState>
      </kit.KitContent>}
    </kit.KitCard>
  );
}
