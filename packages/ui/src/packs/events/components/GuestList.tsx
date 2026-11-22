import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
// prettier-ignore
import { groupGuests, guestFacts, guestListReading, guestStats, guestStatuses, hideGuestDiets } from "../copy";
import { eventsWordsFor } from "../lang";
import { seedTitles } from "../seeds";

// Core first: People/rows cannot group invitations by party or track replies, plus-ones and diets.
export const meta = {
  id: "GuestList",
  status: "ready",
  group: "data",
  purpose: "Track who is invited, who is coming and what each party needs.",
  pick: "An event's invitation roster with party groups, RSVP statuses, plus-ones and dietary needs. Not a plain roster of people (People), a guest sending their own reply (RSVP), clients (ClientCard) or a squad's availability (Squad).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath: "The organiser keeps the list on the device; reminders are sent by message or email.",
  writeHints: [
    'Set detail to "brief" only when dietary notes should not be displayed. Keep supplied diet in the data. Set density and surface to JSON null unless explicitly requested.',
    'Use "pending_approval" for a submitted RSVP awaiting a host decision and "waitlisted" for someone on the waitlist. Pending approval shows Approve and Decline automatically.',
  ],
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["diet"] } },
  parts: ["root", "counts", "remind", "remind_label", "empty"],
  items: {
    key: "guests",
    // prettier-ignore
    parts: ["root", "name", "party", "status", "plus", "diet", "approve", "approve_label", "decline", "decline_label"],
  },
  partTiers: { remind: "service" },
  confirmParts: ["decline"],
  states: ["filled", "empty", "loading"],
  actions: {
    parts: { remind: ["press"] },
    items: { root: ["press"], approve: ["press"], decline: ["press"] },
    noGoto: { items: ["approve", "decline"] },
    // prettier-ignore
    when: { remind: { hasWaiting: true }, approve: { status: "pending_approval" }, decline: { status: "pending_approval" } },
  },
  live: { derive: hideGuestDiets },
  read: (input, state, lang): string[] => guestListReading(input as z.output<typeof props>, state, lang),
} as const satisfies c.Meta;

const guest = z.strictObject({
  name: c.text(24),
  party: c.text(16).optional(),
  status: z.enum(guestStatuses),
  plus: z.int().min(0).max(4),
  diet: c.text(16).optional(),
  goto: c.screenId,
});
// prettier-ignore
export const props = z.strictObject({ ...c.variantProps(meta.variants), guests: z.array(guest).min(1).max(30) })
  .overwrite((input) => ({ ...input, hasWaiting: input.guests.some(({ status }) => status === "waiting") }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    guests: seedTitles(input, 24, 3).map((name) => ({ name, status: "waiting", plus: 0, goto: "details" })),
  };
}

export const examples = [
  {
    guests: [
      { name: "Ruth Shah", party: "Shah family", status: "yes", plus: 1, diet: "Vegetarian", goto: "ruth" },
      { name: "Deepa Shah", party: "Shah family", status: "waiting", plus: 0, goto: "deepa" },
    ],
  },
  {
    guests: [
      { name: "Imani Cole", status: "maybe", plus: 1, goto: "imani" },
      { name: "Hugo Wells", status: "no", plus: 0, goto: "hugo" },
      { name: "Lee Ortiz", status: "pending_approval", plus: 0, goto: "lee" },
      { name: "Mara Chen", status: "waitlisted", plus: 0, goto: "mara" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("GuestList");
// prettier-ignore
export const probes = [
  choose(
    "As the party organiser, show everyone invited in household groups, their reply status, extra guests and dietary needs. Let me remind those still waiting.",
  ),
  choose("Show the hosts as a simple roster with names, portraits and roles, with no invitations or replies.", "People"),
  write(
    "Track gala invites for the Shah household: Ruth Shah said yes with one extra guest and needs vegetarian food, open ruth; Deepa Shah is waiting, no extra guests, open deepa.",
  ),
  {
    ...write(
      "In our invitation roster, Ruth Shah of the Shah family accepted with one extra guest and a vegetarian diet; link to ruth. Keep her dietary note in the data but leave it off the screen. Leave spacing and card surface unset.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  {
    ...write("Lee Ortiz submitted an RSVP and is awaiting host approval. Give the host Approve and Decline on Lee's row. Lee has no plus-ones; link to lee."),
    expectProps: { guests: [{ name: "Lee Ortiz", status: "pending_approval" }] },
  },
  {
    ...write("List Mara Chen on the event waitlist, not yet invited or accepted. Mara has no plus-ones; link to mara."),
    expectProps: { guests: [{ name: "Mara Chen", status: "waitlisted" }] },
  },
  read("Send a reminder to everyone who hasn't replied yet.", { address: "g1/remind", action: "press" }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Row = View["guests"][number];
type Density = c.AxisValue<"density">;

// prettier-ignore
function GuestRow({ row, density, detail, loading }: { row: Row; density: Density; detail: View["detail"]; loading: boolean }) {
  const { lang, words: { guestList } } = kit.useWords(eventsWordsFor);
  const { plus, diet, status, tone } = guestFacts(row, detail, lang);
  const badge = loading ? <kit.KitChip item={null} part={null} look="segment" role="radio" label={status} on={false} disabled={false} />
    : <kit.KitTrail kind="badge" part="status" value={status} tone={tone} density={density} />;
  const target = loading ? { part: null } : { item: row.id, goto: row.goto };
  return <kit.KitContent density={density} rhythm="flush">
    <kit.KitRow {...target} label={row.name} inline lineRole="body" trailing={badge} density={density}>
    <kit.KitContent density={density} rhythm="flush">
      <kit.KitMetaLine title={{ part: "name", text: row.name }} density={density} />
      {loading ? <kit.KitLayoutText density={density} line={{ role: "meta", text: [plus, diet].filter(Boolean).join(guestList.separator) }} />
        : (plus || diet) && <kit.KitText part={null} role="label" tone="muted" density={density}>
        {plus && <kit.KitText part="plus" role="label" tone="muted" density={density}>{plus}</kit.KitText>}
        {plus && diet && guestList.separator}
        {diet && <kit.KitText part="diet" role="label" tone="muted" density={density}>{diet}</kit.KitText>}
      </kit.KitText>}
    </kit.KitContent>
    </kit.KitRow>
    {row.status === "pending_approval" && <GuestDecisions {...{ row, density, loading }} />}
  </kit.KitContent>;
}

// prettier-ignore
function GuestDecisions({ row, density, loading }: { row: Row; density: Density; loading: boolean }) {
  const context = kit.usePartContext();
  const { words: { guestList } } = kit.useWords(eventsWordsFor);
  return <kit.PartContext.Provider value={{ ...context, item: row.id }}>
    <kit.KitActionFooter density={density}>
      <kit.KitAction part={loading ? null : "approve"} label={guestList.approve} />
      <kit.KitAction part={loading ? null : "decline"} kind="danger" label={guestList.decline} />
    </kit.KitActionFooter>
  </kit.PartContext.Provider>;
}

// prettier-ignore
function GuestGroups({ guests, density, detail, loading }: Pick<View, "guests" | "detail"> & { density: Density; loading: boolean }) {
  const groups = groupGuests(guests);
  return groups.map(({ rows, party }, index) => <kit.KitContent key={rows[0]!.id}
    group={index && (party || groups[index - 1]?.party || groups[index - 1]?.rows.at(-1)?.status === "pending_approval") ? "response" : "content"}>
    {party && (loading ? <kit.KitLayoutText line={{ text: party, role: "meta" }} density={density} />
      : <kit.KitText item={rows[0]!.id} part="party" role="label" tone="muted" density={density}>{party}</kit.KitText>)}
    <kit.KitRowGroup spacing="groups" separators={false} density={density}>
      {rows.map((row) => <GuestRow key={row.id} {...{ row, density, detail, loading }} />)}
    </kit.KitRowGroup>
  </kit.KitContent>);
}

// prettier-ignore
export function GuestList(input: View) {
  const loading = kit.useComponentState() === "loading";
  const { thing } = kit.usePartContext();
  const { lang, words: { guestList } } = kit.useWords(eventsWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const stats = guestStats(input.guests, lang);
  const roster = <>
        <kit.KitRow part={loading ? null : "counts"} label={guestList.counts} inline density={density}>
          <kit.KitGrid density={density}>
            {stats.map(({ key, line, count }) => loading
              ? <kit.KitLayoutText key={key} density={density} line={{ text: line, role: "meta" }} />
              : <GuestCount key={key} {...{ line, count, density }} />)}
          </kit.KitGrid>
        </kit.KitRow>
        <kit.KitContent group="response"><GuestGroups guests={input.guests} {...{ density, detail, loading }} /></kit.KitContent>
        {input.guests.some((row) => row.status === "waiting") && <kit.KitContent group="response" density={density}>
          <kit.KitAction part={loading ? null : "remind"} kind="secondary" label={guestList.remind} full />
        </kit.KitContent>}
      </>;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    <kit.KitState part="empty" icon="users" message={thing ? undefined : guestList.empty} loading={roster} density={density}>
      {roster}
    </kit.KitState>
  </kit.KitCard>;
}

// prettier-ignore
function GuestCount({ line, count, density }: { line: string; count: string; density: Density }) {
  const at = line.indexOf(count);
  return <kit.KitText part={null} role="label" tone="muted" density={density}>
    {line.slice(0, at)}<kit.KitText part={null} role="number" numberScale="compact" tabular
      density={density}>{count}</kit.KitText>{line.slice(at + count.length)}
  </kit.KitText>;
}
