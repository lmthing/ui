import { numberLine } from "../../format";
import { appointmentDate } from "..";
import { wordsFor } from "../../lang";

type Emphasis = "strong" | "emphasis";
type Run = { text: string; emphasis?: Emphasis | undefined; link?: number };
type Link = { title: string; goto: string };
type Kind = "heading" | "paragraph" | "quote" | "callout" | "bullet" | "ordered";
export type ArticleBlock = { kind: Kind; runs: Run[]; ordinal?: number };

const wordsPerMinute = 200;

function inline(text: string, links: Link[], emphasis?: Emphasis): Run[] {
  const runs: Run[] = [];
  const add = (value: string) => {
    if (value) runs.push({ text: value, emphasis });
  };
  let end = 0;
  for (const token of text.matchAll(
    /\\(?<escaped>[\\*_[\]!])|(?<!!)\[(?<title>[^\][\n]+)\]\(screen:(?<goto>[a-z][a-z0-9_]{0,63})\)|(?<bold>\*\*|__)(?=\S)(?<strong>.+?)(?<=\S)\k<bold>|(?<![\p{L}\p{N}*_])(?<slant>[*_])(?=\S)(?<italic>.+?)(?<=\S)\k<slant>(?![\p{L}\p{N}*_])/gu,
  )) {
    const [raw] = token;
    const { escaped, title, goto, strong, italic } = token.groups!;
    add(text.slice(end, token.index));
    if (title && goto && title.trim()) {
      runs.push({ text: title, emphasis, link: links.length });
      links.push({ title, goto });
    } else if (strong) {
      runs.push(...inline(strong, links, "strong"));
    } else if (italic) {
      runs.push(...inline(italic, links, "emphasis"));
    } else {
      add(escaped ?? raw);
    }
    end = token.index + raw.length;
  }
  add(text.slice(end));
  return runs;
}

export function parseArticleBody(body: string) {
  const source: { kind: Kind; text: string; ordinal?: number }[] = [];
  let separated = true;
  for (const line of body.split(/\r\n|[\n\r\u2028\u2029]/).map((line) => line.trim())) {
    if (!line) {
      separated = true;
      continue;
    }
    const match = /^(#{1,6}|>|[-*+]|\d{1,9}\.)\s+(.+)$/.exec(line);
    const marker = match?.[1];
    const callout = marker === ">" && /^\[!NOTE\]\s+(.+)$/i.exec(match![2]!);
    const text = (callout && callout[1]) || match?.[2] || line;
    const kind = !marker
      ? "paragraph"
      : marker.startsWith("#")
        ? "heading"
        : marker === ">"
          ? callout
            ? "callout"
            : "quote"
          : marker.endsWith(".")
            ? "ordered"
            : "bullet";
    const previous = source.at(-1);
    if (!separated && previous?.kind === kind && (kind === "paragraph" || kind === "quote"))
      previous.text += ` ${text}`;
    else if (kind === "ordered") source.push({ kind, text, ordinal: Number(marker!.slice(0, -1)) });
    else source.push({ kind, text });
    separated = false;
  }
  const links: Link[] = [];
  const blocks: ArticleBlock[] = source.map(({ text, ...block }) => ({
    ...block,
    runs: inline(text, links),
  }));
  return { blocks, links };
}

export function articleEdges(block: ArticleBlock, lang?: string): [string, string] {
  const words = wordsFor(lang).article;
  if (block.kind === "quote") return words.quote;
  if (block.kind === "callout") return [words.callout, ""];
  if (block.kind === "bullet") return [words.bullet, ""];
  if (block.ordinal !== undefined) return [words.ordinal(numberLine(block.ordinal, lang)), ""];
  return ["", ""];
}

const blockText = (block: ArticleBlock) => block.runs.map(({ text }) => text).join("");

type ArticleCopy = {
  title: string;
  by?: string | undefined;
  date?: string | undefined;
  detail: "full" | "brief";
  style?: "article" | "book" | "response";
  blocks: ArticleBlock[];
};

export function articleHeader({ by, date, blocks }: ArticleCopy, lang?: string) {
  const words = wordsFor(lang).article;
  const wordCount = blocks
    .map(blockText)
    .join(" ")
    .match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:['’][\p{L}\p{M}\p{N}]+)*/gu)?.length;
  const minutes = Math.max(1, Math.ceil((wordCount ?? 0) / wordsPerMinute));
  return {
    by: by ? words.byline(by) : undefined,
    date: date ? appointmentDate(date, lang) : undefined,
    time: words.readingTime(numberLine(minutes, lang)),
  };
}

export function articleReading(input: ArticleCopy, lang?: string): string[] {
  const { blocks, detail, title } = input;
  const body = blocks.map((block) => {
    const [start, end] = articleEdges(block, lang);
    return `${start}${blockText(block)}${end}`;
  });
  if (detail === "brief") return body;
  const { by, date, time } = articleHeader(input, lang);
  const separator = wordsFor(lang).article.metadataSeparator;
  const header = [title, ...(by ? [by] : []), date ? `${date}${separator}${time}` : time];
  return input.style === "response" ? [...body, ...header] : [...header, ...body];
}
