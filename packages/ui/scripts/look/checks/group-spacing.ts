import { describe, ownText, partOf, shown, type FrameCheck } from "./shared";

type Pair = readonly [value: string, label: string, next: readonly string[]];

// These parts belong together even when the view puts them in separate KitContent wrappers.
const pairRecipes: Readonly<Record<string, readonly Pair[]>> = {
  shift: [["from", "date", ["role", "place", "with", "swap", "offer"]]],
  timeclock: [["elapsed", "elapsed_label", ["breaks", "clock"]]],
  appointment: [["time", "date", ["service", "provider", "policy"]]],
};

function layoutRect(el: Element) {
  // Nested KitText runs have a font box, not the line box used in layout (e.g. Shift's "from").
  while (el.parentElement && getComputedStyle(el).display === "inline") el = el.parentElement;
  return el.getBoundingClientRect();
}

function reportPair({ frame, add }: FrameCheck, value: Element, caption: Element, next: Element) {
  if (![value, caption, next].every(shown) || caption.closest("[data-look-timed]")) return;
  const [a, b] = [layoutRect(value), layoutRect(caption)].sort((x, y) => x.top - y.top);
  const within = b!.top - a!.bottom;
  const between = layoutRect(next).top - b!.bottom;
  if (between >= 0 && within - between > 1) {
    const why = `${describe(caption)} and ${describe(value)} are ${Math.round(within)}px apart`;
    add("group-rhythm", frame, caption, `${why}; only ${Math.round(between)}px to ${describe(next)}`);
  }
}

export function checkGroupSpacing(context: FrameCheck, parts: ReadonlyMap<string, Element>) {
  for (const [value, caption, following] of pairRecipes[context.frame.split("_")[0]!] ?? []) {
    const a = parts.get(value);
    const b = parts.get(caption);
    const next = following.map((part) => parts.get(part)).find((el) => el && shown(el));
    if (a && b && next) reportPair(context, a, b, next);
  }
  for (const [part, caption] of parts) {
    const item = part.match(/^r(\d+)\/label$/)?.[1];
    if (!item) continue;
    const value = parts.get(`r${item}/value`);
    const next = parts.get(`r${Number(item) + 1}/label`);
    if (value && next) reportPair(context, value, caption, next);
  }
  for (const term of Array.from(context.frameEl.querySelectorAll("dl > dt"))) {
    const value = term.nextElementSibling;
    const next = value?.nextElementSibling;
    if (value?.matches("dd") && next?.matches("dt")) reportPair(context, value, term, next);
  }
}

function reportHeading({ frame, add }: FrameCheck, heading: Element, item: Element) {
  if (![heading, item].every(shown) || item.closest("[data-look-timed]")) return;
  const first = [item, ...Array.from(item.querySelectorAll("*"))].filter((el) => ownText(el) && shown(el));
  const y = Math.min(...first.map((el) => el.getBoundingClientRect().top));
  const gap = y - heading.getBoundingClientRect().bottom;
  if (Number.isFinite(gap) && gap > 24) {
    add(
      "heading-gap",
      frame,
      heading,
      `${describe(heading)} is ${Math.round(gap)}px from first item ${describe(item)} (max 24px)`,
    );
  }
}

export function checkHeadingGap(context: FrameCheck, parts: ReadonlyMap<string, Element>) {
  for (const [part, heading] of parts) {
    const item = part.match(/^(r\d+)\/(?:group|section)$/)?.[1];
    const first = item && parts.get(`${item}/root`);
    if (first && !first.contains(heading)) reportHeading(context, heading, first);
  }
  const heading = parts.get("heading");
  const listItem = "li, [role=listitem]";
  let semanticMatch = false;
  for (const el of Array.from(context.frameEl.querySelectorAll("h1, h2, h3, h4, h5, h6, [role=heading]"))) {
    const next = el.nextElementSibling;
    const first = next?.matches(listItem)
      ? next
      : next?.matches("ul, ol, [role=list]") && next.querySelector(listItem);
    if (!first) continue;
    reportHeading(context, el, first);
    if (el === heading) semanticMatch = true;
  }
  if (heading && !semanticMatch) {
    const first = Array.from(parts).find(
      ([part, row]) =>
        /^r\d+\/root$/.test(part) &&
        !heading.contains(row) &&
        Boolean(heading.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING) &&
        shown(row),
    );
    if (first) reportHeading(context, heading, first[1]);
  }
}
