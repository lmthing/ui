import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import {
  allReplyCategories,
  cannedReplyPreview,
  cannedReplySnippet,
  projectCannedReplies,
  readCannedReplies,
  validReplyCategories,
} from "../copy";
import { requestsWordsFor, type RequestsWords } from "../lang";
import { prompt } from "../../../entry/prompt-CannedReplies.generated";

// Core first: Composer[reply] edits one draft but cannot browse, preview or insert a saved reply template.
// prettier-ignore
export const meta = {
  id: "CannedReplies", status: "ready", group: "input", tier: "phone", region: "body", weight: 3, dense: true,
  purpose: prompt.purpose,
  pick: prompt.pick,
  realPath: "Reply templates are saved on the operator's phone or shared library, and RequestThread sends only on a separate action.",
  writeHints: prompt.writeHints,
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["snippet"] } },
  parts: ["root", "title", "category", "empty"],
  items: { key: "templates", visibleWhen: { visible: true }, parts: ["root", "title", "snippet", "preview", "insert"] },
  actions: { parts: { category: ["select"] }, items: { insert: ["press"], root: ["press"] }, when: { category: { hasCategories: true } } },
  selections: { category: { prop: "activeCategory", choices: { prop: "categoryChoices" }, runtime: true, clear: allReplyCategories() } },
  localState: cannedReplyPreview,
  live: { derive: projectCannedReplies },
  drives: { commands: [
    { scope: "item", part: "insert", to: { component: "RequestThread", part: "field" }, action: "type", payload: { from: "body" } },
  ] },
  states: ["filled", "empty", "loading"],
  read: readCannedReplies,
} as const satisfies c.Meta;

// prettier-ignore
const template = z.strictObject({
  title: c.text(28), category: c.text(16).meta({ kind: undefined }).optional(),
  body: c.text(240).meta({ kind: undefined }),
});

// prettier-ignore
export const props = z.strictObject({
  categories: z.array(c.text(16).meta({ kind: undefined })).min(0).max(5),
  templates: z.array(template).min(1).max(12), activeCategory: c.text(16).meta({ kind: undefined }).optional(),
  ...c.variantProps(meta.variants),
}).refine(validReplyCategories, { path: ["categories"], message: "Use unique category names and reference only declared categories" })
  .overwrite((input) => ({ ...input, hasCategories: input.categories.length > 0 }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const templates = c.itemsOf(cast, 3).map((item, i) => {
    const thing = c.thingOf(cast, item.type);
    return {
      title: c.titleOf(item, 28, thing) || c.placeholderTitle(i, lang),
      body: c.detailOf(item, 240, thing) || c.wordsFor(lang).placeholderDetail,
    };
  });
  return {
    categories: [],
    templates: templates.length
      ? templates
      : [{ title: c.placeholderTitle(0, lang), body: c.wordsFor(lang).placeholderDetail }],
  };
}

export const examples = [
  {
    categories: ["Diagnosis", "Update"],
    templates: [
      {
        title: "Ask for a leaf photo",
        category: "Diagnosis",
        body: "Could you send a close photo of the underside of a spotted leaf? A photo in daylight helps me check for pests.",
      },
      {
        title: "Grow light ordered",
        category: "Update",
        body: "I’ve ordered the replacement grow light. I’ll confirm the installation time once it arrives.",
      },
    ],
  },
  {
    categories: ["Pickup", "Follow-up"],
    activeCategory: "Pickup",
    detail: "brief",
    templates: [
      {
        title: "Confirm key handover",
        category: "Pickup",
        body: "I can collect the spare key at 8:30 before the park walk. Please let me know if that works.",
      },
      {
        title: "Meet at the side gate",
        category: "Pickup",
        body: "I’ll meet you at the side gate for pickup. Please clip the lead on before opening the latch.",
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("CannedReplies");
export const probes = [
  choose(
    "Give the repair desk a categorized picker of reusable reply templates that staff can preview and put into a draft without sending.",
  ),
  choose(
    "Give me an empty multiline box where I can type a reply from scratch, not a library of saved phrases.",
    "Composer",
  ),
  write(
    "Set up one saved template for the Diagnosis category. Title: Ask for a leaf photo. Body: Could you send a clear photo of the spotted leaf? Start with all categories visible.",
  ),
  {
    ...write(
      "Show saved reply templates as title-only insertion chips, not snippet rows: Diagnosis, Ask for a leaf photo, body Could you send a photo of the spotted leaf? Leave surface and density unchanged.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Switch the saved reply templates to the Update category", {
    address: "c1/category",
    action: "select",
  }),
  read("Preview the full text of Ask for a leaf photo, without inserting it", {
    address: "c1/r1",
    action: "press",
  }),
  {
    ...read("Insert the saved reply titled Ask for a leaf photo into the draft. Do not preview or send it.", {
      address: "c1/r1/insert",
      action: "press",
    }),
    siblings: [
      {
        id: "thread",
        c: "RequestThread",
        number: "LG-41",
        entries: [],
        draft: "Could you send some details?",
      },
    ],
  },
] satisfies c.Probe[];

type ReplyProps = c.Props<typeof props, typeof meta>;
type Reply = ReplyProps["templates"][number] & { visible: boolean; previewOpen: boolean };

function ReplyCategories({
  categories,
  value,
  words,
  loading,
}: {
  categories: string[];
  value: string | undefined;
  words: RequestsWords["cannedReplies"];
  loading: boolean;
}) {
  if (!categories.length) return null;
  return (
    <kit.KitTrack part="category" role="radiogroup" label={words.category}>
      <kit.KitChip
        item={null}
        label={words.all}
        value={allReplyCategories()}
        on={!value}
        role="radio"
        disabled={loading}
      />
      {categories.map((label) => (
        <kit.KitChip
          key={label}
          item={null}
          {...{ label }}
          on={value === label}
          role="radio"
          disabled={loading}
        />
      ))}
    </kit.KitTrack>
  );
}

function CannedPreviewRow(
  row: Reply,
  brief: boolean,
  density: c.ThemeDensity,
  words: RequestsWords["cannedReplies"],
  loading: boolean,
  body: ReturnType<typeof kit.KitLayoutText>,
) {
  return (
    <kit.KitRow
      part={loading ? null : "root"}
      role={loading ? "text" : "button"}
      expanded={row.previewOpen}
      inset="none"
      inline
      leading={
        brief ? undefined : (
          <kit.KitIcon decorative loading={loading} name={row.previewOpen ? "minus" : "plus"} tone="muted" />
        )
      }
      label={words.previewReply(row.title)}
      density={density}
    >
      <kit.KitContent density={density}>
        <kit.KitLayoutText
          density={density}
          line={
            brief
              ? { text: words.preview, role: "meta", tone: "muted" }
              : { text: row.title, part: "title", strong: true }
          }
        />
        {!brief && body}
      </kit.KitContent>
    </kit.KitRow>
  );
}

function ReplyRow({
  row,
  brief,
  density,
  words,
  lang,
  loading,
}: {
  row: Reply;
  brief: boolean;
  density: c.ThemeDensity;
  words: RequestsWords["cannedReplies"];
  lang: string;
  loading: boolean;
}) {
  const insert = (
    <kit.KitAction
      part="insert"
      label={brief ? words.insertReply(row.title) : words.insert}
      kind={brief ? "secondary" : "quiet"}
      contentParts={brief ? { label: "title" } : {}}
    />
  );
  const text = row.previewOpen ? row.body : brief ? undefined : cannedReplySnippet(row.body, lang);
  const body = (
    <kit.KitLayoutText
      density={density}
      line={{
        text,
        part: row.previewOpen ? "preview" : "snippet",
        role: "meta",
        tone: "muted",
      }}
    />
  );
  const preview = CannedPreviewRow(row, brief, density, words, loading, body);
  return (
    <kit.KitRow item={row.id} part={null} inset="none" label={row.title} density={density}>
      <kit.KitContent density={density}>
        <kit.KitGrid fitLast density={density}>
          {brief ? insert : preview}
          {brief ? preview : insert}
        </kit.KitGrid>
        {brief && body}
      </kit.KitContent>
    </kit.KitRow>
  );
}

export function CannedReplies(input: ReplyProps) {
  const state = kit.useComponentState(),
    loading = state === "loading";
  const density = kit.useKit().density;
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const {
    lang,
    words: { cannedReplies: words },
  } = kit.useWords(requestsWordsFor);
  const { templates, activeCategory } = kit.useLiveControls(meta, input) as {
    templates: Reply[];
    activeCategory?: string;
  };
  const rows = templates.filter(({ visible }) => visible);
  const content = (
    <>
      <ReplyCategories categories={input.categories} value={activeCategory} {...{ words, loading }} />
      {rows.length ? (
        <kit.KitRowGroup {...{ density }}>
          {rows.map((row) => (
            <ReplyRow key={row.id} {...{ row, density, words, lang, loading }} brief={detail === "brief"} />
          ))}
        </kit.KitRowGroup>
      ) : (
        <kit.KitLayoutText
          density={density}
          line={{ text: words.noMatches, part: "empty", role: "meta", tone: "muted" }}
        />
      )}
    </>
  );
  return (
    <kit.KitCard part="root" padded density={density} surface="card">
      <kit.KitHeader title={{ text: words.title, part: "title" }} {...{ density }} />
      <kit.KitState loading={content} message={words.empty} part="empty" icon="message" {...{ density }}>
        {content}
      </kit.KitState>
    </kit.KitCard>
  );
}
