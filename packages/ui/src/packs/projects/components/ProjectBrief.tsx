import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { projectBriefCopy, projectBriefReading } from "../copy";
import { projectsWordsFor } from "../lang";
import { seedLabels } from "../seeds";
import { prompt } from "../../../entry/prompt-ProjectBrief.generated";

const sectionParts = ["section_1", "section_2", "section_3"] as const;
const sectionBodies = ["section_1_body", "section_2_body", "section_3_body"] as const;

// Core first: KeyValue[rows] shows owner and dates but cannot frame a charter with pinned prose and independently actionable resources.
// prettier-ignore
export const meta = {
  id: "ProjectBrief",
  status: "ready",
  group: "content",
  tier: "phone",
  pick: prompt.pick,
  purpose: prompt.purpose,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  realPath: "The charter and internal resource links live on the device. The host hands approved HTTPS links off to the device browser.",
  parts: ["root", "title", "objective", "owner", "window", ...sectionParts, ...sectionBodies, "resources", "edit", "edit_label", "edit_trail", "empty"],
  items: { key: "links", parts: ["root", "label", "trail", "open", "open_icon"], visibleWhen: { detail: "full" } },
  actions: {
    parts: { edit: ["press"] },
    items: { root: ["press"], open: ["press"] },
    when: { root: { internal: true }, open: { kind: "url" } },
    noGoto: { items: ["open"] },
  },
  partTiers: { open: "service" },
  hostCommands: {
    items: { "open.press": { kind: "external", uri: ({ row }) => typeof row?.goto === "string" ? row.goto : undefined } },
    identity: ({ props, row }) => row?.kind === "url" ? `${props.projectRef}:${row.goto}` : undefined,
  },
  states: ["filled", "empty", "loading"],
  emptyActions: [],
  deviceData: ["project_briefs"],
  previewDeviceData: ({ state }): c.DeviceData => state === "empty" ? { project_briefs: [] } : {},
  variants: { detail: ["full", "brief"] },
  variantParts: {
    "detail.brief": { hides: ["window", ...sectionParts, ...sectionBodies, "resources", "root", "label", "trail", "open", "open_icon", "edit", "edit_label", "edit_trail"] },
  },
  read: projectBriefReading,
} as const satisfies c.Meta;

const internalRoute = /^[a-z][a-z0-9_]*$/;
const https = z.url({ protocol: /^https$/, hostname: /.+/ });
const link = z
  .strictObject({
    label: c.text(28),
    kind: z.enum(["screen", "file", "url"]),
    goto: c.text(120).meta({ read: false }),
  })
  .refine(
    ({ kind, goto }) =>
      kind === "url"
        ? /^https:\/\/[^/?#@]+(?:[/?#]|$)/i.test(goto) &&
          !/[\s\p{Cc}\\]/u.test(goto) &&
          https.safeParse(goto).success
        : internalRoute.test(goto),
    {
      path: ["goto"],
      message: "Use an internal route ID for a screen/file or a credential-free HTTPS URL for a web link",
    },
  );

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    projectRef: c.text(32).meta({ read: false }),
    title: c.text(40).meta({ read: false }),
    objective: c.text(240).meta({ read: false }),
    owner: c.text(24).meta({ read: false }).optional(),
    start: c.isoDate.optional(),
    target: c.isoDate.optional(),
    sections: z.array(z.strictObject({ heading: c.text(24), body: c.text(160) })).max(3),
    links: z.array(link).max(5),
    editGoto: c.screenId.optional(),
  })
  .refine(({ start, target }) => !start || !target || start <= target, {
    path: ["target"],
    message: "Target date must not precede the start date",
  })
  .overwrite((input) => ({
    ...input,
    links: input.links.map((row) => ({ ...row, internal: row.kind !== "url" })),
    edit: input.detail === "full" && input.editGoto ? { goto: input.editGoto } : undefined,
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const { title, detail } = seedLabels(input);
  return { projectRef: "project_1", title, objective: detail, sections: [], links: [] };
}

// prettier-ignore
export const examples = [
  {
    projectRef: "folio", title: "Folio website",
    objective: "Bring in enquiries from new clients.",
    owner: "Jo Lee", start: "2026-11-16", target: "2026-11-27",
    sections: [
      { heading: "Audience", body: "Small teams looking for a freelance designer." },
      { heading: "Launch criteria", body: "Mobile pages and a working enquiry form." },
    ],
    links: [
      { label: "Agreed scope", kind: "screen", goto: "projects_scope" },
      { label: "Design files", kind: "file", goto: "folio_design_files" },
      { label: "Preview site", kind: "url", goto: "https://example.org/folio" },
    ],
    editGoto: "projects_brief_edit",
  },
  {
    projectRef: "exhibit", title: "Opening night exhibit",
    objective: "Install and light six prints for the opening, with an accessible route through the gallery.",
    owner: "Ari Lane", target: "2026-12-04",
    sections: [{ heading: "Setup", body: "Use the existing rails and leave a clear path to the exit." }],
    links: [{ label: "Gallery layout", kind: "file", goto: "gallery_layout" }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("ProjectBrief");
// prettier-ignore
export const probes = [
  choose("Give this project a charter: its objective, owner, delivery window, pinned launch notes, and links to the spec and design files."),
  choose("Show five plain labelled facts about an item: material, origin, size, colour and weight. No overview or links.", "KeyValue"),
  write("Project folio: title Folio website, objective Launch a three-page portfolio, owner Jo Lee, from 2026-11-16 to 2026-11-27. Pin Audience: Small design teams. Link Agreed scope to screen projects_scope, Design files to file route folio_design_files, Preview site to https://example.org/folio, and Edit brief to projects_brief_edit. Show the pinned section and all links, with no shared variant overrides."),
  {
    ...write("For project exhibit, show a short charter titled Opening night exhibit with the objective Install and light six prints, owned by Ari Lane and due 2026-12-04. Save the Setup section (Use the existing rails) and Gallery layout file route gallery_layout, but display only the title, objective, owner and target date. Keep the app's spacing and surface unchanged."),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the agreed scope screen.", { address: "p1/r1", action: "press" }),
  read("Open the local Design files resource.", { address: "p1/r2", action: "press" }),
  read("Open the form to edit this project brief.", { address: "p1/edit", action: "press" }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Link = View["links"][number];
type Words = ReturnType<typeof projectsWordsFor>["projectBrief"];
const icons = { screen: "file_text", file: "paperclip", url: "link" } as const;

function RouteTrail({ density, loading, part }: { density: c.ThemeDensity; loading: boolean; part: string }) {
  return loading ? (
    <kit.KitAction part={null} icon="chevron_right" kind="quiet" />
  ) : (
    <kit.KitTrail kind="chevron" part={part} density={density} />
  );
}

// prettier-ignore
function Resource({ link, density, words }: { link: Link; density: c.ThemeDensity; words: Words }) {
  const loading = kit.useComponentState() === "loading";
  const scope = kit.usePartContext();
  const external = link.kind === "url";
  const trailing = external ? (
    <kit.PartScope {...scope} item={link.id}>
      <kit.KitAction kind="quiet" icon="external_link" part="open" a11y={words.open(link.label)}
        contentParts={{ icon: "open_icon" }} />
    </kit.PartScope>
  ) : <kit.PartScope {...scope} item={link.id}>
    <RouteTrail {...{ density, loading }} part="trail" />
  </kit.PartScope>;
  return (
    <kit.KitRow item={link.id} label={link.label} inset="none" goto={!loading && !external ? link.goto : undefined}
      leading={<kit.KitIcon name={icons[link.kind]} scale="sm" tone="muted" decorative loading={loading} />}
      {...{ trailing, density }}>
      <kit.KitLayoutText line={{ text: link.label, part: "label" }} density={density} />
    </kit.KitRow>
  );
}

function Resources({
  links,
  density,
  words,
}: {
  links: View["links"];
  density: c.ThemeDensity;
  words: Words;
}) {
  if (!links.length) return null;
  return (
    <kit.KitContent density={density} rhythm="flush">
      <kit.KitLayoutText
        line={{ text: words.resources, part: "resources", strong: true }}
        density={density}
      />
      <kit.KitRowGroup density={density}>
        {links.map((link) => (
          <Resource key={link.id} {...{ link, density, words }} />
        ))}
      </kit.KitRowGroup>
    </kit.KitContent>
  );
}

// prettier-ignore
function EditBrief({ label, goto, density }: { label: string; goto: string; density: c.ThemeDensity }) {
  const loading = kit.useComponentState() === "loading";
  return <kit.KitRow part="edit" {...{ label, density }} inset="none" goto={loading ? undefined : goto}
    leading={<kit.KitIcon name="pencil" tone="accent" scale="sm" decorative loading={loading} />}
    trailing={<RouteTrail {...{ density, loading }} part="edit_trail" />}>
    <kit.KitLayoutText line={{ text: label, part: "edit_label", tone: "accent", strong: true }} density={density} />
  </kit.KitRow>;
}

// prettier-ignore
export function ProjectBrief(input: View) {
  const { lang, words: { projectBrief: words } } = kit.useWords(projectsWordsFor);
  const { density } = kit.useKit();
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const copy = projectBriefCopy({ ...input, detail }, lang);
  const facts: kit.LayoutLine[] = [
    { text: copy.owner, part: "owner", role: "meta", tone: "muted" },
    { text: copy.window, part: "window", role: "meta", tone: "muted" },
  ];
  const content = <>
    <kit.KitHeader title={{ text: input.title, part: "title" }} meta={[
      { text: input.objective, part: "objective", role: "body", tone: "text" }, ...facts,
    ]} density={density} />
    {detail === "full" && <>
      {input.sections.map(({ heading, body }, index) => (
        <kit.KitMetaLine key={sectionParts[index]} density={density}
          title={{ text: heading, part: sectionParts[index]!, role: "body", strong: true }}
          meta={{ text: body, part: sectionBodies[index]!, role: "body" }} />
      ))}
      <Resources links={input.links} {...{ density, words }} />
      {input.editGoto && <EditBrief label={words.edit} goto={input.editGoto} density={density} />}
    </>}
  </>;
  return <kit.KitCard padded density={density}>
    <kit.KitState part="empty" icon="file_text" message={words.empty} density={density} loading={content}>
      {content}
    </kit.KitState>
  </kit.KitCard>;
}
