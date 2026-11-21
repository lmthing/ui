// What a model reads must match what a person sees, and every action it is offered must exist on
// screen with an accessible role that accepts it. Runs for every ready component and example.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { z } from "zod";
import {
  affordancesOf,
  components,
  driveAffordances,
  isDeviceDataVisible,
  moneyLine,
  readComponent,
  readScreen,
  stampItemIds,
  themeName,
  writerFormatFor,
  wordsFor,
  type AppCurrency,
  type ComponentName,
  type Definition,
  type ScreenLike,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import {
  createAgentAccess,
  createInteractionStore,
  createScreenController,
  KitProvider,
  KitText,
  renderers,
  Screen,
  useAppCurrency,
  useWords,
} from "@lmthing/ui/kit";
import { addressedElements, config, renderExample } from "./render";
import { selectedIds } from "../scripts/build";
import { decode, peekForExample, visibleTexts } from "./variants";
import { PhoneScreen } from "../src/kit/screen";
import { expectTarget } from "./kit/reading-target";
import { seatMoveReading } from "./kit/seat-move";
import { DateFixture, dateDefinition, dateDefs, dateScreen, dateTheme } from "./kit/kit-input-date";

const props = z.strictObject({ value: z.number() });
function Fixture({ value }: z.infer<typeof props>) {
  const currency = useAppCurrency();
  const { lang } = useWords();
  return <KitText>{moneyLine(value, currency, "hour", lang)}</KitText>;
}

const def: Definition = {
  ...components.Amount,
  props,
  meta: {
    ...components.Amount.meta,
    id: "Fixture",
    read: (input, _state, lang, _data, currency) => [
      moneyLine(props.parse(input).value, currency, "hour", lang),
    ],
  },
};
const defs = { Fixture: def };
const input = { value: 1240.125 };
const screen: ScreenLike = { id: "home", components: [{ id: "a1", c: "Fixture", ...input }] };
const currencyTheme: ThemeChoice = { preset: "calm", mode: "light", accent: "moss" };
const lang = "en-GB";

function renderedAmount(controller: ReturnType<typeof createScreenController>) {
  const html = renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme={themeName(currencyTheme)}>
      <KitProvider theme={currencyTheme} lang={lang} controller={controller}>
        <Screen controller={controller} renderers={{ Fixture }} />
      </KitProvider>
    </TamaguiProvider>,
  );
  return addressedElements(html).get("home/a1/root")?.text;
}

it.each([
  { currency: "GBP", expected: "£1,240.13 / hr" },
  { currency: "EUR", expected: "€1,240.13 / hr" },
  { currency: "KWD", expected: "KWD\u00a01,240.125 / hr" },
  { currency: undefined, expected: "US$1,240.13 / hr" },
] as const)("uses the same $currency amount in the kit and both readers", ({ currency, expected }) => {
  const controller = createScreenController({ screen, defs, lang, currency });
  const agent = createAgentAccess({
    current: () => screen,
    defs,
    store: createInteractionStore(),
    lang,
    currency,
  });
  try {
    expect(renderedAmount(controller)).toEqual([expected]);
    expect(controller.read()).toBe(`screen home\na1 Fixture ${expected}`);
    expect(agent.read()).toBe(controller.read());
    expect(readScreen(screen, defs, {}, lang, undefined, currency)).toBe(controller.read());
    expect(readComponent(def, input, "a1", "filled", {}, lang, undefined, currency)).toEqual([
      `a1 Fixture ${expected}`,
    ]);
  } finally {
    controller.dispose();
  }
});

it("rejects invalid host currency before reading or drawing", () => {
  const currency = "ZZZ" as AppCurrency;
  expect(() => createScreenController({ screen, defs, currency })).toThrow();
  expect(() => readScreen(screen, defs, {}, lang, undefined, currency)).toThrow();
  expect(() => readComponent(def, input, "a1", "filled", {}, lang, undefined, currency)).toThrow();
  expect(() =>
    createAgentAccess({ current: () => screen, defs, store: createInteractionStore(), currency }),
  ).toThrow();
});

it("does not take the app currency from Writer props or interaction values", () => {
  const schema = writerFormatFor(def).json_schema.schema;
  expect(schema.additionalProperties).toBe(false);
  expect(Object.keys(schema.properties ?? {})).toEqual(["c", "value"]);
  expect(def.props.safeParse({ ...input, currency: "JPY" }).success).toBe(false);
  const values = { "home/a1/currency": "JPY", "home/a1/$currency": "JPY" };
  expect(readScreen(screen, defs, values, lang, undefined, "EUR")).toBe(
    "screen home\na1 Fixture €1,240.13 / hr",
  );
});

const ready = selectedIds(Object.keys(renderers) as ComponentName[], import.meta.url);
const theme = { preset: "calm", mode: "light", accent: "moss" } as never;

function labels(html: string): string[] {
  return [...html.matchAll(/aria-label="([^"]*)"/g)].map((m) => decode(m[1]!));
}

it("accepts a named, addressed date textbox for the date set offered in the read", () => {
  const html = renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme={themeName(dateTheme)}>
      <PhoneScreen defs={dateDefs} renderers={{ DateFixture }} screen={dateScreen} theme={dateTheme} />
    </TamaguiProvider>,
  );
  const offers = affordancesOf(dateDefinition.meta, dateDefinition.examples[0]!, "c1", {});
  expect(offers.map(({ address, action }) => [address, action])).toEqual([["c1/date", "set"]]);
  const read = readScreen(dateScreen, dateDefs);
  const meta = dateDefinition.meta;
  expectTarget(read, addressedElements(html), offers[0]!, meta);
  expect(() =>
    expectTarget(read, addressedElements(html.replace('data-set-kind="date"', "")), offers[0]!, meta),
  ).toThrow("c1/date has role textbox");
  expect(() =>
    expectTarget(read, addressedElements(html), offers[0]!, { ...meta, set: { date: { prop: "on" } } }),
  ).toThrow("c1/date has role textbox");
});

it("accepts addressed KitSeatMap guest buttons for the move action offered in the read", () => {
  const { html, text, offers } = seatMoveReading();
  const addressed = addressedElements(html);
  expect(offers.map(({ address }) => address)).toEqual(["c1/r1", "c1/r2", "c1/r3", "c1/r4"]);
  expect(html.match(/aria-expanded="false"/g)).toHaveLength(4);
  for (const offer of offers) expectTarget(text, addressed, offer);
});

describe.each(ready)("%s reads as text and can be acted on", (id) => {
  const def = components[id];
  it.each(def.examples.map((example, index) => ({ example, index })))("example $index", ({ example }) => {
    const { html, deviceData, props: parsed } = renderExample(id, example, "filled", theme);
    const read = readComponent(def, example, "c1", "filled", {}, undefined, deviceData).join("\n");
    if (!isDeviceDataVisible(def.meta, deviceData)) {
      expect(read).toBe("");
      expect(addressedElements(html).size).toBe(0);
      return;
    }
    const seen = visibleTexts(html);
    const named = labels(html);
    const quoted = [...read.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]!.replace(/\\"/g, '"'));
    for (const text of seen) {
      const mask = (def as Definition).meta.items?.readSecrets && text === wordsFor().secretValue.mask;
      expect(read, `visible text missing from the read: "${text}"`).toContain(mask ? "(secret)" : text);
    }
    for (const text of quoted) {
      const shown = seen.some((s) => s.includes(text)) || named.includes(text);
      expect(shown, `read offers text that is not on screen: "${text}"`).toBe(true);
    }
    const props = stampItemIds(def.meta, parsed);
    const { hidden, issues } = peekForExample(def.meta, props, html);
    expect(issues).toEqual([]);
    const addressed = addressedElements(html);
    const declared = affordancesOf(def.meta, props, "c1", {}, undefined, false, { schema: def.props });
    // A standalone example has no same-screen seek target.
    const offers = driveAffordances(def.meta, props, "c1", declared);
    for (const affordance of offers) {
      if (!hidden.includes(affordance.address.split("/")[1]!))
        expectTarget(read, addressed, affordance, def.meta);
    }
  });
});
