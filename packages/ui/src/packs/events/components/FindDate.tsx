import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import {
  dateAnswer,
  dateCells,
  dateMatrix,
  dateMatrixReading,
  dateReplyChoices,
  fittedDates,
  projectDateViewer,
} from "../copy";
import { eventsWordsFor } from "../lang";
import { seedDate, seedTitles } from "../seeds";
import { prompt } from "../../../entry/prompt-FindDate.generated";

// Core first: Calendar/week cannot compare each participant's availability across candidate dates.
const maxDates = 6;
export const meta = {
  id: "FindDate",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath: "Availability is collected through a shared app or link.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["guide"] } },
  parts: ["root", "dates", "best", "count", "scroll", "guide", "empty"],
  items: { key: "cells", parts: ["root"], pickers: { root: { prop: "answer", choices: dateReplyChoices } } },
  states: ["filled", "empty"],
  actions: { items: { root: ["press", "select"] }, when: { root: { own: true } } },
  deviceData: ["eventViewer"],
  previewDeviceData: ({ state }) =>
    state === "filled"
      ? {
          eventViewer: [
            { instance: "c1", row: 0 },
            { instance: "f1", row: 0 },
          ],
        }
      : {},
  live: { derive: projectDateViewer },
  read: dateMatrixReading,
} as const satisfies c.Meta;

const candidate = z.strictObject({ date: c.isoDate, time: c.clock.optional() });
const person = z.strictObject({ name: c.text(16), answers: z.array(dateAnswer).min(2).max(maxDates) });
const schema = z
  .strictObject({
    ...c.variantProps(meta.variants),
    dates: z.array(candidate).min(2).max(maxDates),
    people: z.array(person).min(1).max(12),
  })
  .refine(({ dates, people }) => people.every(({ answers }) => answers.length === dates.length), {
    path: ["people"],
    message: "Each person needs one answer per date",
  })
  .refine(
    ({ dates }) => new Set(dates.map(({ date, time }) => `${date}/${time ?? ""}`)).size === dates.length,
    {
      path: ["dates"],
      message: "Use distinct candidate slots",
    },
  );

const withCells = (input: z.output<typeof schema>) => ({ ...input, cells: dateCells(input.people) });
export const props = schema.overwrite(withCells) as typeof schema &
  z.ZodType<ReturnType<typeof withCells>, z.input<typeof schema>>;

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    dates: [{ date: seedDate }, { date: "2026-11-21" }],
    people: seedTitles(input, 16, 3).map((name) => ({ name, answers: ["none", "none"] })),
  };
}

export const examples = [
  {
    dates: [
      { date: "2027-04-09", time: "18:30" },
      { date: "2027-04-10", time: "19:00" },
    ],
    people: [
      { name: "Imani Cole", answers: ["yes", "none"] },
      { name: "Hugo Wells", answers: ["maybe", "no"] },
    ],
  },
  {
    dates: [{ date: "2027-06-11" }, { date: "2027-06-12" }, { date: "2027-06-13" }],
    people: [{ name: "Ruth Shah", answers: ["no", "yes", "maybe"] }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("FindDate");
export const probes = [
  choose(
    "Find when our reunion works for most people: a grid of candidate dates against each person's yes, maybe or no, with the best date highlighted.",
  ),
  choose(
    "Show a week of dates with activity dots so I can tap a day; don't ask anyone whether they can attend.",
    "Calendar",
  ),
  write(
    "Compare availability on 2027-04-09 at 18:30 and 2027-04-10 at 19:00. I'm Imani Cole: yes then no reply. Hugo Wells: maybe then no.",
  ),
  {
    ...write(
      "Compare availability for June 11 and 12, 2027. Ruth Shah can make June 11 and might make June 12. Omit the instructions for replying.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Set my April 10 reply to Yes directly, without opening the picker. I’m Imani.", {
    address: "f1/r2",
    action: "select",
  }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type DateWords = ReturnType<typeof eventsWordsFor>["findDate"];
type Density = c.ThemeDensity;

function ColumnHeading({
  heading,
  details,
  density,
  corner = false,
}: {
  heading: string;
  details: readonly (string | undefined)[];
  density: Density;
  corner?: boolean;
}) {
  return (
    <kit.KitContent density={density} inset={corner ? "none" : "md"}>
      <kit.KitText part={null} role="label" lines={1} tone={corner ? "muted" : "text"}>
        {heading}
      </kit.KitText>
      {details.map((line, index) => (
        <kit.KitText key={index} part={null} role="label" lines={1} tone="muted">
          {line ?? "\u00a0"}
        </kit.KitText>
      ))}
    </kit.KitContent>
  );
}

function AvailabilityCell({ id, answer, own }: View["cells"][number], words: DateWords, density: Density) {
  return own ? (
    <kit.KitOption
      item={id}
      title={answer === undefined ? words.reply : words.answer[answer]}
      choices={dateReplyChoices.map(({ label }) => label)}
    />
  ) : (
    <kit.KitContent inset="md" density={density}>
      <kit.KitText
        item={id}
        part="root"
        role="label"
        lines={1}
        tone={answer === undefined ? "muted" : "text"}
      >
        {words.answer[answer ?? "none"]}
      </kit.KitText>
    </kit.KitContent>
  );
}

function Availability({
  input,
  matrix,
  words,
  density,
}: {
  input: View;
  matrix: ReturnType<typeof dateMatrix>;
  words: DateWords;
  density: Density;
}) {
  const columns = matrix.slots.map(({ heading, details, label }, index) => ({
    id: String(index),
    label,
    header: <ColumnHeading {...{ heading, details, density }} />,
  }));
  const rows = input.people.map(({ name }, index) => ({
    id: String(index),
    label: name,
    heading: (
      <kit.KitText part={null} role="label" lines={1}>
        {name}
      </kit.KitText>
    ),
    cells: input.cells
      .filter(({ row }) => row === index)
      .map((cell) => ({
        id: cell.id,
        content: AvailabilityCell(cell, words, density),
      })),
  }));
  return (
    <kit.KitTable
      part="dates"
      fitColumns={columns.length <= fittedDates}
      {...{ columns, rows }}
      corner={
        <ColumnHeading
          heading={words.people}
          details={matrix.slots[0]!.details.map(() => undefined)}
          density={density}
          corner
        />
      }
      {...(matrix.bestColumn === undefined ? {} : { activeColumn: String(matrix.bestColumn) })}
    />
  );
}

export function FindDate(input: View) {
  const {
    lang,
    words: { findDate: words },
  } = kit.useWords(eventsWordsFor);
  const scope = kit.usePartContext();
  const density = kit.useKit().density;
  const surface = "card";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const live = kit.useLiveControls(meta, input) as View;
  if (scope.state === "empty")
    return (
      <kit.KitCard part="root" {...{ density, surface }}>
        <kit.PartScope {...scope} thing={words.dateThing}>
          <kit.KitEmpty part="empty" icon="calendar_days" decorativeIcon />
        </kit.PartScope>
      </kit.KitCard>
    );
  const matrix = dateMatrix(live, lang);
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      <kit.KitContent density={density}>
        <kit.KitText part="best" role="heading">
          {matrix.title}
        </kit.KitText>
        {matrix.count && (
          <kit.KitText part="count" role="number" numberScale="compact" tone="muted">
            {matrix.count}
          </kit.KitText>
        )}
      </kit.KitContent>
      <Availability input={live} {...{ matrix, words, density }} />
      {matrix.slots.length > fittedDates && (
        <kit.KitText part="scroll" role="label" tone="muted">
          {words.scroll}
        </kit.KitText>
      )}
      {detail === "full" && live.cells.some(({ own }) => own) && (
        <kit.KitText part="guide" role="label" tone="muted">
          {words.guide}
        </kit.KitText>
      )}
    </kit.KitCard>
  );
}
