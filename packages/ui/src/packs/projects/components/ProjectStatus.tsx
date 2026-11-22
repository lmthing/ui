import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { projectStatusCopy, projectStatusReading } from "../copy";
import { projectsWordsFor } from "../lang";
import { seedLabels, seedMonday } from "../seeds";

// Core first: Card[plain] with a badge cannot separate wins and blockers or link independently to a milestone and a check-in form.
export const meta = {
  id: "ProjectStatus",
  status: "ready",
  group: "content",
  tier: "phone",
  pick: "A periodic project health check-in with an on-track, at-risk or blocked status, wins and blockers. Not a featured generic card (Card), a dated acceptance gate (Milestones), or a shift handover (Handover).",
  purpose:
    "Report a project's health, recent wins and current blockers, with the next milestone and a link to post another check-in.",
  writeHints: [
    "Use the reported health as status, never infer it from dates. Use the latest check-in date for updatedAt; use nextMilestone only when supplied. Days until the milestone are computed.",
    'Set detail "brief" for a headline-only check-in with its health badge and check-in date; keep wins, blockers and links in the data.',
  ],
  region: "body",
  weight: 2,
  realPath:
    "Health check-ins are saved locally with the project. Sharing them with collaborators requires a shared app.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: {
    "detail.brief": {
      hides: [
        "author",
        "wins",
        "blockers",
        "milestone",
        "milestone_title",
        "milestone_due",
        "milestone_remaining",
        "update",
        "update_label",
      ],
    },
  },
  parts: [
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
    "empty",
  ],
  actions: { parts: { milestone: ["press"], update: ["press"] } },
  states: ["filled", "empty", "loading"],
  emptyActions: [], // Opt into state-aware navigation planning.
  read: projectStatusReading,
  deviceData: ["project_calendar"],
  previewDeviceData: ({ input }) => ({
    project_calendar: [{ projectRef: input.projectRef, date: input.updatedAt }],
  }),
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    projectRef: c.text(32).meta({ read: false }),
    status: z.enum(["on_track", "at_risk", "blocked"]).default("on_track"),
    headline: c.text(80).meta({ read: false }),
    author: c.text(24).meta({ read: false }).optional(),
    updatedAt: c.isoDate,
    wins: z.array(c.text(80)).max(3),
    blockers: z.array(c.text(80)).max(3),
    nextMilestone: z
      .strictObject({ title: c.text(32).meta({ read: false }), due: c.isoDate, goto: c.screenId.optional() })
      .optional(),
    postGoto: c.screenId.optional(),
  })
  .overwrite((input) => ({
    ...input,
    milestone:
      input.detail === "full" && input.nextMilestone?.goto ? { goto: input.nextMilestone.goto } : undefined,
    update: input.detail === "full" && input.postGoto ? { goto: input.postGoto } : undefined,
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const { title } = seedLabels(input);
  return { projectRef: "project_1", headline: title, updatedAt: seedMonday, wins: [], blockers: [] };
}

export const examples = [
  {
    projectRef: "folio",
    status: "at_risk",
    headline: "Design is ready for review",
    author: "Jo Lee",
    updatedAt: "2026-11-19",
    wins: ["Finished the mobile layouts", "Shared the navigation prototype"],
    blockers: ["Waiting for homepage copy"],
    nextMilestone: { title: "Design sign-off", due: "2026-11-24", goto: "projects_gates" },
    postGoto: "projects_check_in",
  },
  {
    projectRef: "exhibit",
    headline: "Installation is on schedule",
    updatedAt: "2026-11-20",
    wins: ["Tested the lighting"],
    blockers: [],
    nextMilestone: { title: "Gallery walkthrough", due: "2026-11-25" },
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("ProjectStatus");
export const probes = [
  choose(
    "Show the latest weekly project health check-in, with an at-risk badge, separate wins and blockers, and the next milestone.",
  ),
  choose(
    "Feature one project with a photo, a short description and a badge. Tap anywhere on its card to open it.",
    "Card",
  ),
  write(
    "For project folio, show Jo Lee's 2026-11-19 health check-in: At risk. Headline: Design is ready for review. Wins: Finished the mobile layouts and Shared the navigation prototype. Blocker: Waiting for homepage copy. Design sign-off is due 2026-11-24; link it to projects_gates. Post check-in opens projects_check_in.",
  ),
  {
    ...write(
      "Show a brief check-in for project exhibit, reported on track on 2026-11-20, with headline Installation is on schedule. Show only its status badge, headline and check-in date. Keep Tested the lighting as a win in the record, but hide wins and blockers on this screen. Do not change spacing.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the Design sign-off milestone.", { address: "p1/milestone", action: "press" }),
  read("Open the form to post another project check-in.", { address: "p1/update", action: "press" }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Copy = ReturnType<typeof projectStatusCopy>;

function StatusList({
  title,
  entries,
  part,
  density,
}: {
  title: string;
  entries: string[];
  part: "wins" | "blockers";
  density: View["density"];
}) {
  if (!entries.length) return null;
  return (
    <kit.KitMetaLine
      title={{ text: title, part, role: "body", strong: true }}
      meta={entries.map((text) => ({ text, role: "body" }))}
      density={density}
    />
  );
}

function NextMilestone({ input, copy, density }: { input: View; copy: Copy; density: View["density"] }) {
  const loading = kit.useComponentState() === "loading";
  if (!input.nextMilestone) return null;
  const { title, goto } = input.nextMilestone;
  return (
    <kit.KitRow
      part="milestone"
      label={title}
      goto={loading ? undefined : goto}
      density={density}
      inset="none"
      inline
      trailing={!loading && goto && <kit.KitIcon name="chevron_right" scale="sm" decorative />}
    >
      <kit.KitContent density={density}>
        <kit.KitLayoutText
          line={{ text: copy.milestoneTitle, part: "milestone_title", strong: true }}
          density={density}
        />
        <kit.KitGrid fitLast density={density}>
          <kit.KitLayoutText
            line={{ text: copy.milestoneDate, part: "milestone_due", role: "meta", tone: "muted" }}
            density={density}
          />
          {copy.remaining && (
            <kit.KitLayoutText
              line={{
                text: copy.remaining,
                part: "milestone_remaining",
                role: copy.dueToday ? "body" : "figure",
                compact: true,
                strong: true,
              }}
              density={density}
            />
          )}
        </kit.KitGrid>
      </kit.KitContent>
    </kit.KitRow>
  );
}

export function ProjectStatus(input: View) {
  const {
    lang,
    words: { projectStatus: words },
  } = kit.useWords(projectsWordsFor);
  const data = kit.useDeviceData();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const full = kit.useVariant("detail", meta.variants.detail, input.detail) === "full";
  const copy = projectStatusCopy(input, lang, data);
  const content = (
    <>
      <kit.KitGrid density={density} fitLast>
        <kit.KitLayoutText
          line={{ text: copy.updated, part: "updated_at", role: "meta", tone: "muted" }}
          density={density}
        />
        <kit.KitTrail kind="badge" part="status" value={copy.status} tone={copy.tone} density={density} />
      </kit.KitGrid>
      <kit.KitHeader
        title={{ text: input.headline, part: "headline" }}
        {...(full && input.author ? { meta: { text: input.author, part: "author" } } : {})}
        density={density}
      />
      {full && (
        <>
          <StatusList title={words.wins} entries={copy.wins} part="wins" density={density} />
          <StatusList title={words.blockers} entries={copy.blockers} part="blockers" density={density} />
          {(input.nextMilestone || input.postGoto) && (
            <kit.KitContent rhythm="flush" density={density}>
              <NextMilestone {...{ input, copy, density }} />
              {input.postGoto && (
                <kit.KitActionFooter density={density}>
                  <kit.KitAction part="update" label={words.update} goto={input.postGoto} kind="secondary" />
                </kit.KitActionFooter>
              )}
            </kit.KitContent>
          )}
        </>
      )}
    </>
  );
  return (
    <kit.KitCard padded {...{ density, surface }}>
      <kit.KitState part="empty" icon="flag" message={words.empty} density={density} loading={content}>
        {content}
      </kit.KitState>
    </kit.KitCard>
  );
}
