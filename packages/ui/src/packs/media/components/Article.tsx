import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { articleEdges, articleHeader, articleReading, parseArticleBody, type ArticleBlock } from "../copy";
import { mediaWordsFor } from "../lang";

// Core first: Note/default cannot show a long structured reading with links to other screens.
export const meta = {
  id: "Article",
  status: "ready",
  group: "content",
  purpose: "Read a long piece with headings, paragraphs, quotes and links.",
  pick: "A long article, guide, or policy with several paragraphs and structured text. Not one short supporting sentence (Note), expandable answers (List), a community post (Post), or terms to sign (Agreement).",
  writeHints: [
    "Body uses headings, paragraphs, lists, quotes, bold, italic and [label](screen:screen_id) links. No HTML or external links.",
    "Encode line breaks using \\n in the JSON body string. Put headings, quotes and list items on separate lines, and use \\n\\n between paragraphs. Do not substitute spaces for line breaks.",
    'For body-only reading with no header, set detail "brief". Keep title in the line; reading time is computed. Leave density null unless the brief explicitly asks for tighter spacing.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The text is stored on or bundled with the app.",
  variants: {
    density: ["comfortable", "compact"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["title", "by", "date", "reading_time", "photo"] } },
  parts: ["root", "title", "by", "date", "reading_time", "photo", "body"],
  items: { key: "links", parts: ["root"] },
  states: ["filled", "loading"],
  actions: { items: { root: ["press"] } },
  read: (input, state, lang): string[] =>
    state === "filled" ? articleReading(input as ArticleProps, lang) : [],
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    title: c.text(80).meta({ kind: undefined }),
    by: c.text(32).meta({ kind: undefined }).optional(),
    date: c.isoDate.optional(),
    photo: c.photo.optional(),
    body: c.text(2000).meta({ kind: undefined }),
  })
  .overwrite((value) => ({
    ...value,
    ...(value.detail === "brief" ? { photo: undefined } : {}),
    ...parseArticleBody(value.body),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const [item] = c.itemsOf(cast, 1);
  return {
    title: (item && c.titleOf(item, 80, thing)) || c.placeholderTitle(0, lang),
    body: (item && c.detailOf(item, 2000, thing)) || c.wordsFor(lang).placeholderDetail,
  };
}

export const examples = [
  {
    title: "A fern's first week at home",
    by: "Noor Martin",
    date: "2026-11-08",
    photo: "lib:plants",
    body: "## Pick a spot\nSet the fern by a bright window in **indirect light**. Give its fronds room to unfurl.\n\n> Check the pot before you water.\n\nSee the [fern care schedule](screen:fern_schedule) for a reminder.",
  },
  {
    title: "Before the first walk",
    body: "## At the door\nBring the lead, a water bowl, and a spare bag. Let Clover sniff the lead before clipping it on.\n\n- Check the gate latch.\n- Keep the first loop *short and familiar*.\n\nOpen the [park route](screen:park_route) before setting out.",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Article");
export const probes = [
  choose(
    "Publish a full reading page with a byline, a lead photo, several headings, paragraphs and inline links",
  ),
  choose(
    "Put one short supporting sentence below today's plan: The side gate sticks in wet weather.",
    "Note",
  ),
  write(
    "Write a long reading page called A fern's first week, by Noor Martin, dated 2026-11-08. Use lib:plants, a heading called Pick a spot, two paragraphs about indirect light and a link to fern_schedule.",
  ),
  {
    ...write(
      "Write a long guide titled Before the first walk, with two paragraphs and a heading about the lead. Show only its body, without the title or any reading header.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Follow the fern care schedule link", { address: "a1/r1", action: "press" }),
] satisfies c.Probe[];

type ArticleProps = c.Props<typeof props, typeof meta> & {
  blocks: ArticleBlock[];
  links: { id: string; goto: string }[];
};

// prettier-ignore
function ArticleHeader({ input, density, loading }: { input: ArticleProps; density: c.ThemeDensity; loading: boolean }) {
  const { lang, words } = kit.useWords(mediaWordsFor);
  const { by, date, time } = articleHeader(input, lang);
  const separator = words.article.metadataSeparator;
  const label = { role: "label", tone: "muted", density } as const;
  if (loading) return <kit.KitSkeleton shape="figure" inset="none" {...{ density }}
    content={[["title", input.title], ["label", by], ["label", date ? `${date}${separator}${time}` : time]]} />;
  return (
    <kit.KitContent lineRole="title" {...{ density }}>
      <kit.KitText role="title" part="title" {...{ density }}>{input.title}</kit.KitText>
      {by && <kit.KitText part="by" {...label}>{by}</kit.KitText>}
      <kit.KitText part={null} {...label}>
        {date && <kit.KitText part="date" {...label} tabular>{date}</kit.KitText>}
        {date && separator}
        <kit.KitText part="reading_time" {...label} tabular>{time}</kit.KitText>
      </kit.KitText>
    </kit.KitContent>
  );
}

// prettier-ignore
function ArticleLine({ block, links, density, loading }: {
  block: ArticleBlock; links: ArticleProps["links"]; density: c.ThemeDensity; loading: boolean;
}) {
  const { lang } = kit.useWords(mediaWordsFor);
  const [start, end] = articleEdges(block, lang);
  if (loading) {
    const text = `${start}${block.runs.map((run) => run.text).join("")}${end}`;
    return <kit.KitSkeleton shape="figure" inset="none" content={[["body", text]]} {...{ density }} />;
  }
  const emphasis = block.kind === "heading" ? "strong" : block.kind === "quote" ? "emphasis" : undefined;
  return (
    <kit.KitText part={null} {...{ density, emphasis }}>
      {start}
      {block.runs.map(({ text, emphasis: format, link }, index) => {
        const target = link === undefined ? undefined : links[link];
        return target || format ? (
          <kit.KitText key={index} item={target?.id} goto={target?.goto} part={target ? "root" : null}
            emphasis={format ?? emphasis} {...{ density }}>
            {text}
          </kit.KitText>
        ) : text;
      })}
      {end}
    </kit.KitText>
  );
}

function ArticleBody({
  input,
  density,
  loading,
  full,
}: {
  input: ArticleProps;
  density: c.ThemeDensity;
  loading: boolean;
  full: boolean;
}) {
  const { blocks, links, title } = input;
  return (
    <kit.KitRow part={loading ? null : "body"} label={title} inline {...{ density }}>
      <kit.KitContent lineRole="body" group={full ? "response" : "content"} {...{ density }}>
        {blocks.map((block, index) => {
          const previous = blocks[index - 1]?.kind;
          const tight =
            previous === "heading" ||
            (previous === block.kind && (previous === "bullet" || previous === "ordered"));
          return (
            <kit.KitContent
              key={index}
              group={previous && !tight ? "response" : "content"}
              lineRole="body"
              {...{ density }}
            >
              <ArticleLine {...{ block, links, density, loading }} />
            </kit.KitContent>
          );
        })}
      </kit.KitContent>
    </kit.KitRow>
  );
}

// prettier-ignore
export function Article(input: ArticleProps) {
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const full = kit.useVariant("detail", meta.variants.detail, input.detail) === "full";
  const loading = kit.useComponentState() === "loading";
  const { photo } = input;
  return (
    <kit.KitCard part="root" padded {...{ density }}>
      {full && <ArticleHeader {...{ input, density, loading }} />}
      {full && photo && (loading
        ? <kit.KitSkeleton shape="media" aspect="wide" inset="none" content={[]} />
        : <kit.KitPhoto part="photo" shape="wide" {...{ photo }} />)}
      <ArticleBody {...{ input, density, loading, full }} />
    </kit.KitCard>
  );
}
