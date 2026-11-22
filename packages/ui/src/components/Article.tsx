import { z } from "zod";
import { articleEdges, articleHeader, articleReading, parseArticleBody, type ArticleBlock } from "../catalog";
import * as c from "../catalog";
import * as kit from "../kit";
import { prompt } from "../entry/prompt-Article.generated";

// Core first: Note/default cannot show a long structured reading with links to other screens.
export const meta = {
  id: "Article",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The text is stored on or bundled with the app.",
  variants: {
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
    style: z.enum(["article", "book", "response"]).default("article"),
    paper: z.enum(["light", "sepia", "dark"]).optional(),
    fontScale: z.enum(["normal", "small", "large"]).default("normal"),
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
// prettier-ignore
export const examples = [
  {
    title: "A fern's first week at home",
    by: "Noor Martin",
    date: "2026-11-08",
    photo: "lib:fern",
    body: "## Pick a spot\nSet the fern in **indirect light**, where its fronds have plenty of room to unfurl.\n\n> Check the pot before you water.\n\nSee the [fern care schedule](screen:fern_schedule) for a reminder.",
  },
  {
    title: "Before the first walk",
    style: "book", paper: "sepia", fontScale: "large", photo: "lib:dogs",
    body: "## At the door\nBefore clipping on the lead, let Clover sniff it while you pack a bowl and spare bag.\n\n- Check the gate latch.\n- Keep the loop *familiar*.\n\nOpen the [park route](screen:park_route) before setting out.",
  },
  {
    style: "response", paper: "dark", fontScale: "small",
    title: "Why leaves turn yellow", by: "Noor Martin",
    body: "Check the soil before watering again.\n\n> [!NOTE] A few older leaves may yellow naturally.",
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
const paperSwatch = { light: "white", sepia: "beige", dark: "black" } as const;
// Heading and body share a size on the kit scale; title is the next larger text step.
const bodyRole = { normal: "body", small: "label", large: "title" } as const;
type Layout = { input: ArticleProps; density: c.ThemeDensity; loading: boolean };
// prettier-ignore
function ArticleHeader({ input, density, loading }: Layout) {
  const { lang, words } = kit.useWords();
  const { by: author, date, time } = articleHeader(input, lang);
  const by = input.style === "response" ? undefined : author;
  const separator = words.article.metadataSeparator;
  const titleRole = "title";
  const label = { role: "label", tone: "muted", density } as const;
  if (loading) return <kit.KitSkeleton shape="figure" inset="none" {...{ density }}
    content={[[titleRole, input.title], ["label", by], ["label", date ? `${date}${separator}${time}` : time]]} />;
  return (
    <kit.KitContent lineRole="title" {...{ density }}>
      <kit.KitText role={titleRole} part="title" {...{ density }}>{input.title}</kit.KitText>
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
function ArticleLine({ block, density, loading, input }: Layout & { block: ArticleBlock }) {
  const role = bodyRole[input.fontScale];
  const { lang } = kit.useWords();
  const [start, end] = articleEdges(block, lang);
  if (loading) {
    const text = `${start}${block.runs.map((run) => run.text).join("")}${end}`;
    return <kit.KitSkeleton shape="figure" inset="none" content={[[role, text]]} {...{ density }} />;
  }
  const emphasis = block.kind === "heading" || block.kind === "callout" ? "strong" : block.kind === "quote" ? "emphasis" : undefined;
  return (
    <kit.KitText part={null} {...{ density, role, emphasis }}>
      {start}
      {block.runs.map(({ text, emphasis: format, link }, index) => {
        const target = link === undefined ? undefined : input.links[link];
        return target || format ? (
          <kit.KitText key={index} item={target?.id} goto={target?.goto} part={target ? "root" : null}
            emphasis={format ?? emphasis} {...{ density, role }}>
            {text}
          </kit.KitText>
        ) : text;
      })}
      {end}
    </kit.KitText>
  );
}
// prettier-ignore
function ArticleBody({ input, density, loading, full }: Layout & { full: boolean }) {
  const { blocks, title } = input;
  return (
    <kit.KitRow part={loading ? null : "body"} label={title} inline {...{ density }}>
      <kit.KitContent lineRole="body" group={full ? "response" : "content"} {...{ density }}>
        {blocks.map((block, index) => {
          const previous = blocks[index - 1]?.kind;
          const tight =
            previous === "heading" ||
            (previous === block.kind && (previous === "bullet" || previous === "ordered"));
          return (
            <kit.KitContent key={index} group={previous && !tight ? "response" : "content"} lineRole="body" {...{ density }}>
              <ArticleLine {...{ block, input, density, loading }} />
            </kit.KitContent>
          );
        })}
      </kit.KitContent>
    </kit.KitRow>
  );
}
// prettier-ignore
export function Article(input: ArticleProps) {
  const density = kit.useKit().density;
  const full = kit.useVariant("detail", meta.variants.detail, input.detail) === "full";
  const loading = kit.useComponentState() === "loading";
  const { photo, paper, style } = input;
  const layout = { input, density, loading };
  const { words } = kit.useWords();
  const cover = full && photo && (loading
    ? <kit.KitSkeleton shape="media" aspect="wide" inset="none" content={[]} />
    : <kit.KitPhoto part="photo" shape="wide" {...{ photo }} />);
  const attribution = full && style === "response" && input.by && words.article.byline(input.by);
  return (
    <kit.KitCard part="root" padded {...{ density }} {...(!loading && paper ? { swatch: paperSwatch[paper] } : {})}>
      {style === "book" && cover}
      {full && <ArticleHeader {...layout} />}
      {style !== "book" && cover}
      <ArticleBody {...layout} {...{ full }} />
      {attribution && (loading
        ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", attribution]]} {...{ density }} />
        : <kit.KitText part="by" role="label" tone="muted" {...{ density }}>{attribution}</kit.KitText>)}
    </kit.KitCard>
  );
}
