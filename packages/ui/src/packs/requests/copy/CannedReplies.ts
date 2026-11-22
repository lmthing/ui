import { z } from "zod";
import { defineLocalState, type StateName, type Values } from "../../../catalog";
import { requestsWordsFor } from "../lang";

export function allReplyCategories() {
  return "__all__";
}
const snippetLimit = 78;
type Template = { id: string; category?: string; title: string; body: string };

export function validReplyCategories({
  categories,
  activeCategory,
  templates,
}: {
  categories: string[];
  activeCategory?: string | undefined;
  templates: { category?: string | undefined }[];
}) {
  const names = new Set(categories);
  return (
    !names.has(allReplyCategories()) &&
    !names.has(requestsWordsFor().cannedReplies.all) &&
    names.size === categories.length &&
    (!activeCategory || names.has(activeCategory)) &&
    templates.every(({ category }) => category === undefined || names.has(category))
  );
}

export const cannedReplyPreview = defineLocalState({
  schema: z.strictObject({ preview: z.string().max(3) }),
  initial: () => ({ preview: "" }),
  events: [],
  itemEvents: ["root.press"],
  reduce: ({ preview }, { item }) => ({ state: { preview: preview === item ? "" : (item ?? "") } }),
  project: ({ preview }) => ({ preview }),
});

export function cannedReplySnippet(body: string, lang?: string) {
  const line = body.replace(/\s+/g, " ");
  if (line.length <= snippetLimit) return line;
  let sentenceEnd = 0;
  for (const { index } of line.matchAll(/[.!?](?= |$)/g)) {
    if (index >= snippetLimit) break;
    sentenceEnd = index + 1;
  }
  if (sentenceEnd) return line.slice(0, sentenceEnd);
  const piece = line.slice(0, snippetLimit + 1);
  const end = piece.lastIndexOf(" ");
  return requestsWordsFor(lang).cannedReplies.snippet(
    end > 0 ? piece.slice(0, end) : line.slice(0, snippetLimit),
  );
}

export function projectCannedReplies(input: Readonly<Values>): Values {
  const templates = input.templates as Template[];
  return {
    categoryChoices: [
      ...(input.categories as string[]),
      { value: allReplyCategories(), label: requestsWordsFor().cannedReplies.all },
    ],
    templates: templates.map((row) => ({
      ...row,
      visible: !input.activeCategory || input.activeCategory === row.category,
      previewOpen: input.preview === row.id,
    })),
  };
}

export function readCannedReplies(raw: unknown, state: StateName, lang?: string) {
  if (state !== "filled") return [];
  const input = raw as {
    categories: string[];
    templates: (Template & { visible: boolean; previewOpen: boolean })[];
    activeCategory?: string;
    detail: "full" | "brief";
  };
  const words = requestsWordsFor(lang).cannedReplies;
  const rows = input.templates.filter(({ visible }) => visible);
  const brief = input.detail === "brief";
  const lines = rows.flatMap(({ id, previewOpen, body, title }) => {
    const text = previewOpen ? body : brief ? undefined : cannedReplySnippet(body, lang);
    return [...(brief ? [words.insertReply(title)] : []), ...(text ? [`${id}: ${text}`] : [])];
  });
  return [
    words.title,
    ...(input.categories.length ? [words.all, ...input.categories] : []),
    ...(rows.length ? [brief ? words.preview : words.insert] : []),
    ...(rows.length ? lines : [words.noMatches]),
  ];
}
