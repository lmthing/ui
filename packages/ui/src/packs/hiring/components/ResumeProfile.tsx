import { z } from "zod";
import {
  clip,
  detailOf,
  emptyLine,
  itemsOf,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  variantProps,
  wordsFor,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import * as kit from "../../../kit";
import { resumeEducationLine, resumeExperienceLine, resumeProjection, resumeReading } from "../copy";
import { hiringWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-ResumeProfile.generated";

const experienceLimit = 6;
const educationLimit = 4;
const skillLimit = 12;
const topSkills = 4;
const partNames = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => `${prefix}_${index + 1}`);
const experienceParts = partNames("experience", experienceLimit);
const summaryParts = partNames("summary", experienceLimit);
const educationParts = partNames("education", educationLimit);
const skillParts = partNames("skill", skillLimit);

// Core first: Profile with default identity and supporting text cannot show a structured CV,
// career and education histories, skill tags, an attachment or a live availability switch.
export const meta = {
  id: "ResumeProfile",
  status: "ready",
  group: "content",
  tier: "phone",
  pick: prompt.pick,
  purpose: prompt.purpose,
  region: "body",
  weight: 3,
  realPath:
    "The CV and availability are stored on the phone; the host opens local attachments or shares the profile.",
  dense: true,
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: {
    "detail.brief": {
      hides: [
        "location",
        "education",
        "cv",
        "share",
        ...experienceParts.slice(1),
        ...summaryParts,
        ...educationParts,
        ...skillParts.slice(topSkills),
      ],
    },
  },
  parts: [
    "root",
    "name",
    "headline",
    "location",
    "experience",
    "education",
    "skills",
    "skill_chips",
    "open",
    "edit",
    "cv",
    "share",
    "empty",
    "success",
    "error",
    ...experienceParts,
    ...summaryParts,
    ...educationParts,
    ...skillParts,
  ],
  actions: {
    parts: { open: ["toggle"], edit: ["press"], cv: ["press"], share: ["press"] },
    when: { edit: { canEdit: true }, cv: { canPreview: true }, share: { canShare: true } },
    noGoto: { parts: ["cv", "share"] },
  },
  partTiers: { share: "service" },
  states: ["filled", "empty", "loading", "success", "error"],
  readSuccess: true,
  successActions: ["open.toggle", "edit.press", "cv.press", "share.press"],
  live: {
    toggles: { open: { prop: "openToWork", initial: false } },
    derive: (input) =>
      resumeProjection(input as Parameters<typeof resumeProjection>[0], input.detail === "brief", topSkills),
  },
  read: (input, state, lang): string[] => {
    const projected = input as ReturnType<typeof resumeProjection>;
    const lines = resumeReading(projected, lang);
    return state === "success" ? [hiringWordsFor(lang).resumeProfile.success, ...lines] : lines;
  },
  writeHints: prompt.writeHints,
} as const satisfies Meta;
export const props = z.strictObject({
  ...variantProps(meta.variants),
  name: text(24),
  headline: text(60),
  location: text(28).optional(),
  openToWork: z.boolean(),
  experience: z
    .array(
      z.strictObject({
        role: text(32),
        org: text(32),
        start: text(10),
        end: text(10).optional(),
        summary: text(120).optional(),
      }),
    )
    .min(0)
    .max(experienceLimit),
  education: z
    .array(z.strictObject({ credential: text(36), school: text(32), year: text(8).optional() }))
    .min(0)
    .max(educationLimit),
  skills: z.array(text(20)).min(0).max(skillLimit),
  cvLabel: text(32).optional(),
  editGoto: screenId.optional(),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const [item] = itemsOf(cast, 1);
  return {
    name: (item && titleOf(item, 24, thing)) ?? clip(placeholderTitle(0, lang), 24),
    headline: (item && detailOf(item, 60, thing)) ?? wordsFor(lang).placeholderDetail,
    openToWork: false,
    experience: [],
    education: [],
    skills: [],
  };
}

const resume = {
  name: "Sam Patel",
  headline: "Dog walker and animal care assistant",
  location: "North Park",
  openToWork: true,
  experience: [
    {
      role: "Dog walker",
      org: "Trot",
      start: "2025",
      summary: "Lead weekday walking groups and keep owners updated.",
    },
    { role: "Shelter volunteer", org: "Green Lane Rescue", start: "2023", end: "2025" },
  ],
  education: [{ credential: "Animal Care Certificate", school: "North College", year: "2023" }],
  skills: ["Group handling", "Pet first aid", "Route planning", "Owner updates", "Animal welfare"],
  cvLabel: "Sam Patel CV",
  editGoto: "resume_edit",
} satisfies z.input<typeof props>;

export const examples: z.input<typeof props>[] = [
  resume,
  { ...resume, detail: "brief", density: "compact", surface: "outlined" },
];

const { choose, write, read } = probesFor("ResumeProfile");
export const probes = [
  choose(
    "Let a job seeker show their dated work history, education, skill tags, CV attachment and open-to-work toggle.",
  ),
  choose(
    "Show my name and short job title under my portrait. No career history, education, skills or settings.",
    "Profile",
  ),
  write(
    "Show Sam Patel’s resume, headline Dog walker and animal care assistant, in North Park and open to work. Sam has worked as Dog walker at Trot since 2025 and earned an Animal Care Certificate from North College in 2023. List Group handling and Pet first aid, attach the label Sam Patel CV, and link to resume_edit.",
  ),
  {
    ...write(
      "Write Sam Patel’s résumé, headline Dog walker, open to work. Store both jobs in experience: Dog walker at Trot since 2025, then Shelter volunteer at Green Lane Rescue from 2023 to 2025. Store Animal Care Certificate at North College, 2023, in education. Skills: Group handling and Pet first aid. Use the brief preview (headline, latest role and top skills), but retain both job records and the education record for switching back to the full view.",
    ),
    variant: { axis: "detail", value: "brief" },
    expectProps: {
      experience: [{ role: "Dog walker" }, { role: "Shelter volunteer" }],
      education: [{ school: "North College" }],
    },
  },
  read("Turn off my open-to-work status.", { address: "r1/open", action: "toggle" }),
] satisfies Probe[];

type Input = Props<typeof props, typeof meta>;
type Projection = ReturnType<typeof resumeProjection<Input>>;
type Finish = { density: "comfortable" | "compact"; lang: string };

function WorkHistory({ rows, density, lang }: { rows: Projection["experience"] } & Finish) {
  const {
    words: { resumeProfile: words },
  } = kit.useWords(hiringWordsFor);
  if (!rows.length) return null;
  return (
    <kit.KitContent group="response" density={density}>
      <kit.KitHeader
        title={{ part: "experience", text: words.experience, role: "body", strong: true }}
        density={density}
      />
      <kit.KitRowGroup density={density} spacing="groups" separators={false}>
        {rows.map((row, index) => (
          <kit.KitMetaLine
            key={experienceParts[index]}
            title={{ part: experienceParts[index]!, text: row.role }}
            meta={[
              { text: resumeExperienceLine(row, lang) },
              { part: summaryParts[index]!, text: row.summary, tone: "text" },
            ]}
            density={density}
          />
        ))}
      </kit.KitRowGroup>
    </kit.KitContent>
  );
}

function Education({ rows, density, lang }: { rows: Projection["education"] } & Finish) {
  const {
    words: { resumeProfile: words },
  } = kit.useWords(hiringWordsFor);
  if (!rows.length) return null;
  return (
    <kit.KitContent group="response" density={density}>
      <kit.KitHeader
        title={{ part: "education", text: words.education, role: "body", strong: true }}
        density={density}
      />
      <kit.KitRowGroup density={density} spacing="groups" separators={false}>
        {rows.map((row, index) => (
          <kit.KitMetaLine
            key={educationParts[index]}
            density={density}
            title={{ part: educationParts[index]!, text: row.credential }}
            meta={{ text: resumeEducationLine(row, lang) }}
          />
        ))}
      </kit.KitRowGroup>
    </kit.KitContent>
  );
}

function Skills({ skills, density }: { skills: Projection["skills"]; density: Finish["density"] }) {
  const {
    words: { resumeProfile: words },
  } = kit.useWords(hiringWordsFor);
  if (!skills.length) return null;
  return (
    <kit.KitContent group="response" density={density}>
      <kit.KitHeader
        title={{ part: "skills", text: words.skills, role: "body", strong: true }}
        density={density}
      />
      <kit.KitTrack part="skill_chips" label={words.skills}>
        {skills.map((value, index) => (
          <kit.KitCard
            key={skillParts[index]}
            part={skillParts[index]!}
            surface="outlined"
            density={density}
            padded
          >
            <kit.KitLayoutText line={{ text: value, role: "meta", tone: "muted" }} density={density} />
          </kit.KitCard>
        ))}
      </kit.KitTrack>
    </kit.KitContent>
  );
}

function ResumeActions({ input, density }: { input: Projection; density: Finish["density"] }) {
  const {
    words: { resumeProfile: words },
  } = kit.useWords(hiringWordsFor);
  const loading = kit.useComponentState() === "loading";
  return (
    <kit.KitActionFooter density={density}>
      {input.cvLabel && (
        <kit.KitAction
          part={loading ? null : "cv"}
          contentParts={{}}
          icon="file_text"
          label={input.cvLabel}
          a11y={words.preview(input.cvLabel)}
          kind="secondary"
        />
      )}
      {input.canEdit && (
        <kit.KitAction
          part={loading ? null : "edit"}
          contentParts={{}}
          label={words.editShort}
          a11y={words.edit}
          goto={loading ? undefined : input.editGoto}
          kind="quiet"
        />
      )}
      {input.canShare && (
        <kit.KitAction
          part={loading ? null : "share"}
          contentParts={{}}
          label={words.shareShort}
          a11y={words.share}
          kind="quiet"
        />
      )}
    </kit.KitActionFooter>
  );
}

function ResumeBody({ input, density, lang }: { input: Projection } & Finish) {
  const {
    words: { resumeProfile: words },
  } = kit.useWords(hiringWordsFor);
  return (
    <>
      <kit.KitContent density={density}>
        <kit.KitHeader title={{ part: "name", text: input.name }} density="comfortable" />
        <kit.KitLayoutText
          line={{ part: "headline", text: input.headline, role: "body" }}
          density={density}
        />
        <kit.KitLayoutText
          line={{ part: "location", text: input.location, role: "meta", tone: "muted" }}
          density={density}
        />
      </kit.KitContent>
      <kit.KitRow
        label={words.open}
        inline
        density={density}
        trailing={
          <kit.KitTrail
            kind="toggle"
            part="open"
            on={input.openToWork}
            label={words.open}
            density={density}
          />
        }
      >
        <kit.KitLayoutText line={{ text: words.open, role: "body" }} density={density} />
      </kit.KitRow>
      <WorkHistory rows={input.experience} {...{ density, lang }} />
      <Education rows={input.education} {...{ density, lang }} />
      <Skills skills={input.skills} density={density} />
      <ResumeActions {...{ input, density }} />
    </>
  );
}

export function ResumeProfile(input: Input) {
  const state = kit.useComponentState();
  const {
    lang,
    words: { resumeProfile: words },
  } = kit.useWords(hiringWordsFor);
  const thing = kit.useEmptyThing();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const brief = kit.useVariant("detail", meta.variants.detail, input.detail) === "brief";
  const content = <ResumeBody input={resumeProjection(input, brief, topSkills)} {...{ density, lang }} />;
  const part = state === "empty" || state === "success" || state === "error" ? state : undefined;
  const message = state === "empty" && thing ? emptyLine(thing, lang) : part ? words[part] : undefined;
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      <kit.KitState
        part={part ?? null}
        message={message}
        density={density}
        loading={content}
        retain={state === "success"}
        {...(state === "empty" && { icon: "file_text" as const })}
      >
        {content}
      </kit.KitState>
    </kit.KitCard>
  );
}
