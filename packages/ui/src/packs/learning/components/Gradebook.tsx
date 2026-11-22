import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { categoryGrade, courseGrade, gradeItemCopy, gradebookRead, projectGradebook } from "../copy";
import { learningWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Gradebook.generated";

const itemParts = Array.from({ length: 12 }, (_, index) => `item_${index + 1}` as const);
const dates = itemParts.map((part) => `${part}_date` as const);

// Core first: Stats/default shows independent figures, not computed weighted grades with expandable coursework.
export const meta = {
  id: "Gradebook",
  status: "ready",
  group: "data",
  tier: "phone",
  ...prompt,
  region: "body",
  weight: 3,
  realPath: "Coursework grades stored locally or synced from a school LMS host.",
  dense: true,
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["term", ...dates] } },
  parts: ["root", "course", "term", "grade", "status"],
  items: {
    key: "categories",
    parts: ["root", "amount", ...itemParts, ...dates],
    visibleWhen: { breakdown: true },
  },
  select: { prop: "expanded", value: "index", mode: "flags", runtime: true },
  actions: {
    items: { root: ["toggle"], ...Object.fromEntries(itemParts.map((part) => [part, ["press"] as const])) },
    when: { root: { canExpand: true } },
  },
  states: ["filled", "empty", "loading", "error"],
  live: { derive: (value) => projectGradebook(value, itemParts) },
  read: gradebookRead,
} as const satisfies c.Meta;

const item = z
  .strictObject({
    title: c.text(28),
    earned: z.number().min(0).optional(),
    possible: z.number().gt(0),
    date: c.isoDate.optional(),
    goto: c.screenId.optional(),
  })
  .refine(({ earned, possible }) => earned === undefined || earned <= possible, { path: ["earned"] });
const category = z.strictObject({
  label: c.text(24),
  weight: z.number().min(0).max(100),
  items: z.array(item).min(1).max(itemParts.length),
});
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    course: c.text(32),
    term: c.text(20).optional(),
    scale: z.enum(["percent", "letter", "gpa"]).default("percent"),
    categories: z.array(category).min(1).max(6),
    style: z.enum(["categories", "summary"]).default("categories"),
  })
  .refine(({ categories }) => Math.abs(categories.reduce((sum, row) => sum + row.weight, 0) - 100) < 1e-10, {
    path: ["categories"],
    message: "Category weights must total 100",
  })
  .overwrite((value) => ({
    ...value,
    term: value.detail === "brief" ? undefined : value.term,
    categories: value.categories.map((row, index) => ({ ...row, expanded: index === 0 })),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const seed = c.itemsOf(cast, 1)[0];
  const title = (max: number, index: number) =>
    (seed && c.titleOf(seed, max, thing)) ?? c.clip(c.placeholderTitle(index, lang), max);
  return {
    course: title(32, 0),
    categories: [{ label: title(24, 1), weight: 100, items: [{ title: title(28, 2), possible: 1 }] }],
  };
}

// prettier-ignore
export const examples = [
  { course: "Indoor Plant Care", term: "Autumn term", categories: [
    { label: "Practical work", weight: 60, items: [
      { title: "Fern care plan", earned: 18, possible: 20, date: "2026-10-12", goto: "fern_plan" },
      { title: "Watering log", earned: 9, possible: 10 },
    ] },
    { label: "Knowledge checks", weight: 40, items: [{ title: "Light and humidity", earned: 17, possible: 20 }] },
  ] },
  { course: "Dog Walking Basics", term: "Winter term", scale: "gpa", style: "summary", surface: "outlined",
    categories: [{ label: "Field assessment", weight: 100,
      items: [{ title: "Practice walk", earned: 19, possible: 20 }, { title: "Final walk", possible: 20 }] }] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Gradebook");
// prettier-ignore
export const probes = [
  choose("Calculate my overall course grade and GPA from weighted categories, with expandable rows showing each assignment's earned and possible points."),
  choose("Put three independent totals side by side: courses enrolled, notes saved and study hours. No calculated grade or item breakdown.", "Stats"),
  write("Show weighted grades for Biology: Labs count 40% (Microscope lab 18 out of 20) and Exams count 60% (Midterm 81 out of 100). Show the overall percentage and let me expand each category."),
  { ...write("Show Biology, Spring term, with Labs worth 100% and a Microscope lab scored 18 out of 20 on 2026-04-10. Keep the term and date in the data but hide both from view. Keep the course and expandable coursework visible. Change nothing else about the presentation."),
    variant: { axis: "detail", value: "brief" } },
  read("Expand Knowledge checks to see its coursework.", { address: "g1/r2", action: "toggle" }),
  read("Open the Fern care plan coursework.", { address: "g1/r1/item_1", action: "press" }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Category = View["categories"][number] & { expanded: boolean };
type Finish = { density: c.ThemeDensity; detail: View["detail"] };

// prettier-ignore
function GradeItems({ row, density, detail, loading }: Finish & { row: Category; loading: boolean }) {
  const { lang } = kit.useWords(learningWordsFor);
  return <kit.KitRowGroup density={density} separators={false}>
    {row.items.map((item, index) => {
      const { score, date } = gradeItemCopy(item, detail, lang);
      const part = itemParts[index]!;
      return <kit.KitRow key={part} item={row.id} part={loading ? null : part} {...{ density }} inline fitContent={!item.goto}
        label={item.title} goto={loading ? undefined : item.goto}
        trailing={<kit.KitLayoutText {...{ density }} line={{ text: score, role: "figure", compact: true, tabular: true }} />}>
        <kit.KitMetaLine density={density} title={{ text: item.title, tone: item.goto ? "accent" : "text" }}
          {...(date ? { meta: { text: date, role: "body", part: dates[index]! } } : {})} />
      </kit.KitRow>;
    })}
  </kit.KitRowGroup>;
}

// prettier-ignore
function GradeCategory({ row, loading, density, detail, disclose }: Finish & { row: Category; loading: boolean; disclose: boolean }) {
  const { lang, words: { gradebook: words } } = kit.useWords(learningWordsFor);
  const { screen, component } = kit.usePartContext();
  const expanded = kit.useControlValue(c.formatAddress({ screen, component, item: row.id }), row.expanded);
  const { ratio, amount, label } = categoryGrade(row, lang);
  return <kit.KitContent density={density}>
    <kit.KitRow item={row.id} part={loading ? null : "root"} role={!loading && disclose ? "button" : "group"}
      label={words.categoryReading(label, amount)} {...(!loading && disclose ? { expanded } : {})} inline fitContent={!disclose} density={density}
      {...(disclose ? { leading: <kit.KitIcon name={expanded ? "minus" : "plus"} scale="sm" decorative loading={loading} /> } : {})}
      trailing={<kit.KitLayoutText {...{ density }} line={{ text: amount, part: "amount", role: "figure", compact: true, tabular: true }} />}>
      <kit.KitLayoutText {...{ density }} line={{ text: label, strong: true }} />
    </kit.KitRow>
    {disclose && <kit.KitMeter label="" amount="" ratio={loading ? 0 : ratio ?? 0} slim addressed={false} />}
    {disclose && expanded && <GradeItems {...{ row, density, detail, loading }} />}
  </kit.KitContent>;
}

// prettier-ignore
export function Gradebook(input: View) {
  const state = kit.useComponentState();
  const thing = kit.useEmptyThing();
  const { lang, words: { gradebook: words } } = kit.useWords(learningWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const grade = courseGrade(input, lang);
  const body = <><kit.KitHeader density={density} title={{ text: input.course, part: "course" }}
    {...(detail === "full" && input.term ? { meta: { text: input.term, role: "body", part: "term" } } : {})} />
    <kit.KitFigure density={density} value={{ text: grade?.primary ?? words.ungraded, part: "grade" }}
      caption={<kit.KitLayoutText density={density} line={{ text: grade?.secondary, role: "body", tone: "muted" }} />} />
    <kit.KitRowGroup density={density} spacing="groups">
      {input.categories.map((row, index) => <GradeCategory key={row.id} row={{ ...row, expanded: index === 0 }}
        {...{ density, detail }} disclose={input.style === "categories"} loading={state === "loading"} />)}
    </kit.KitRowGroup>
  </>;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    {state === "filled" && !grade
      ? <kit.KitEmpty title={words.empty} icon="book" part="status" decorativeIcon prominence="body" {...{ density }} />
      : <kit.KitState part="status" message={state === "error" ? words.error : thing ? c.emptyLine(thing, lang) : words.empty} icon={state === "error" ? "alert" : "book"}
        loading={body} density={density}>{body}</kit.KitState>}
  </kit.KitCard>;
}
