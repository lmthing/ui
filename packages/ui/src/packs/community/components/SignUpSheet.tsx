import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { previewSignUp, projectSignUp, signUpClaim, signUpReading, signUpRecordKind } from "../copy";
import { signUpRowCopy, signUpStatus, validSignUpClaims, type SignUpRow } from "../copy";
import { communityWordsFor } from "../lang";
import { distinct, ref, seedTitle } from "../seeds";
import { prompt } from "../../../entry/prompt-SignUpSheet.generated";

// Core first: Checklist/default ticks jobs, not limited places with claim ownership and release.
export const meta = {
  id: "SignUpSheet",
  status: "ready" as "ready" | "draft",
  group: "input",
  ...prompt,
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath:
    "A shared app atomically reserves the remaining places and lets each member release only their own claim.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["claimants"] } },
  parts: ["root", "title", "status"],
  items: {
    key: "slots",
    // prettier-ignore
    parts: ["root", "title", "meta", "capacity", "remaining", "claimants", "claim", "claim_label", "release", "release_label"],
  },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    items: { root: ["toggle"], claim: ["press"], release: ["press"] },
    when: {
      root: { detail: "brief" },
      claim: { can_claim: true },
      release: { own_claim: true, has_own_claim: true },
    },
  },
  select: { prop: "expanded", value: "index", mode: "flags", runtime: true },
  confirmParts: ["release"],
  deviceData: [signUpRecordKind],
  previewDeviceData: previewSignUp,
  live: { derive: projectSignUp },
  // The controller rechecks live device gates before accepting a pending confirmation.
  deviceDataFlags: {
    has_own_claim: (_data, input) => (input.slots as SignUpRow[]).some((row) => row.own_claim),
  },
  readSuccess: true,
  read: signUpReading,
} as const satisfies c.Meta;

const slot = z.strictObject({
  id: ref,
  title: c.text(32),
  meta: c.text(36).optional(),
  capacity: z.int().min(1).max(12),
});
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    title: c.text(40),
    slots: z.array(slot).min(1).max(12),
    claims: z.array(signUpClaim).min(0).max(48),
  })
  .refine(({ slots }) => distinct(slots, (row) => row.id), { path: ["slots"] })
  .refine(({ slots, claims }) => validSignUpClaims(slots, claims), { path: ["claims"] })
  .overwrite((input) => ({
    ...input,
    slots: input.slots.map((row) => ({
      ...row,
      slotId: row.id,
    })),
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    title: seedTitle(input, 40),
    slots: [{ id: "slot_1", title: seedTitle(input, 32), capacity: 1 }],
    claims: [],
  };
}

export const examples: z.input<typeof props>[] = [
  {
    title: "Seed swap contributions",
    slots: [
      { id: "tables", title: "Bring a folding table", meta: "Drop off by 9 am", capacity: 2 },
      { id: "sign", title: "Bring the welcome sign", capacity: 1 },
    ],
    claims: [
      { slotId: "tables", memberId: "ana" },
      { slotId: "sign", memberId: "lee" },
    ],
  },
  {
    title: "Dog club open morning",
    detail: "brief",
    slots: [{ id: "tea", title: "Bring refreshments", capacity: 3 }],
    claims: [{ slotId: "tea", memberId: "jo" }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("SignUpSheet");
export const probes = [
  choose(
    "Our association members can reserve one of two places to bring a table, see who has claimed them, and release their own place.",
  ),
  choose(
    "Give me a private list of jobs to tick when done, like bringing tables and making signs. No reservations.",
    "Checklist",
  ),
  write(
    "Make the Seed swap contributions sign-up sheet: tables means Bring a folding table, capacity 2, with one place already claimed by ana.",
  ),
  {
    ...write(
      "On the seed swap contribution sheet, two people can bring folding tables and Ana already took one place. Keep her claim, but show compact summaries that expand to reveal who signed up.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Expand the refreshments slot to see who has signed up.", { address: "s1/r1", action: "toggle" }, 1),
] satisfies c.Probe[];

type SheetProps = c.Props<typeof props, typeof meta>;
type Row = SheetProps["slots"][number] & SignUpRow;
type Finish = { density: c.ThemeDensity; detail: SheetProps["detail"]; state: c.StateName };
// prettier-ignore
function SlotRow({ row, density, detail, state }: Finish & { row: Row }) {
  const scope = kit.usePartContext();
  const { lang, words: { signUp: words } } = kit.useWords(communityWordsFor);
  const { capacity, remaining, claimants, action } = signUpRowCopy(row, detail, lang);
  const control = action && (state === "filled" || state === "loading") ? action : undefined;
  const kind = control === "release" ? "danger" : "secondary";
  const loading = state === "loading";
  const disclosure = detail === "brief" && (state === "filled" || loading);
  return <kit.PartScope {...scope} item={row.id}>
    <kit.KitContent density={density} rhythm="flush">
      <kit.KitRow item={row.id} part={loading ? null : "root"} label={row.title} inline fitContent={!disclosure} density={density}
        {...(disclosure && !loading ? { role: "button", expanded: row.expanded === true } as const : {})}
        trailing={disclosure ? <kit.KitIcon name={row.expanded ? "minus" : "plus"} decorative loading={loading} /> : null}>
        <kit.KitMetaLine density={density} title={{ text: row.title, part: "title", strong: true }}
          meta={{ text: row.meta, part: "meta" }} />
      </kit.KitRow>
      <kit.KitGrid fitLast density={density}>
        <kit.KitContent density={density}>
          {loading ? <kit.KitLayoutText density={density}
            line={{ text: `${capacity}${words.separator}${remaining}`, role: "meta" }} /> :
          <kit.KitText part={null} role="label" tone="muted" density={density}>
            <kit.KitText part="capacity" role="number" numberScale="compact" tabular density={density}>{capacity}</kit.KitText>
            {words.separator}
            <kit.KitText part="remaining" role="label" tone="muted" density={density}>{remaining}</kit.KitText>
          </kit.KitText>}
          {claimants && <kit.KitContent density={density} lineRole="body" lead={<kit.KitIcon name="user" scale="sm" decorative loading={loading} />}>
            <kit.KitLayoutText density={density} line={{ text: claimants, part: "claimants", role: "meta", tone: "muted" }} />
          </kit.KitContent>}
        </kit.KitContent>
        {control ? <kit.KitAction part={loading ? null : control} action="press" kind={kind} label={words[control]} /> : null}
      </kit.KitGrid>
    </kit.KitContent>
  </kit.PartScope>;
}

// prettier-ignore
export function SignUpSheet(input: SheetProps) {
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { lang } = kit.useWords(communityWordsFor);
  const { slots } = kit.useLiveControls(meta, input) as { slots: Row[] };
  const rows = <kit.KitContent group="response" density={density}>
    <kit.KitRowGroup density={density} spacing="groups">
      {slots.map((row) => <SlotRow key={row.id} {...{ row, density, detail, state }} />)}
    </kit.KitRowGroup>
  </kit.KitContent>;
  return <kit.KitCard part="root" padded={state !== "empty"} {...{ density, surface }}>
    {state !== "empty" && <kit.KitHeader density={density} title={{ text: input.title, part: "title" }} />}
    <kit.KitState retain part={state === "empty" ? "title" : "status"}
      message={signUpStatus(state, lang)} loading={rows} density={density}>
      {rows}
    </kit.KitState>
  </kit.KitCard>;
}
