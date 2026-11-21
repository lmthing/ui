// What a model reads must match what a person sees, and every action it is offered must exist on
// screen with an accessible role that accepts it. Runs for every ready component and example.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { z } from "zod";
import {
  affordancesOf,
  components,
  isDeviceDataVisible,
  moneyLine,
  readComponent,
  readScreen,
  stampItemIds,
  themeName,
  writerFormatFor,
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
import { existsSync } from "node:fs";
import { addressedElements, config, hasStepTarget, renderExample } from "./render";
import { selectedIds } from "../scripts/build";
import { decode, peekForExample, visibleTexts } from "./variants";

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
const input = { value: 1240.5 };
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
  { currency: "GBP", expected: "£1,240.50 / hr" },
  { currency: "EUR", expected: "€1,240.50 / hr" },
  { currency: undefined, expected: "US$1,240.50 / hr" },
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
    "screen home\na1 Fixture €1,240.50 / hr",
  );
});

const ready = selectedIds(Object.keys(renderers) as ComponentName[]);
const theme = { preset: "calm", mode: "light", accent: "moss" } as never;
const roles: Record<string, string[]> = {
  press: ["button", "link"],
  toggle: ["switch", "checkbox", "button"],
  check: ["checkbox"],
  select: ["radio", "tab", "button", "option", "radiogroup"],
  swipe: ["button"],
  flip: ["button"],
  increment: ["button"],
  decrement: ["button"],
  start: ["button"],
  stop: ["button"],
  dismiss: ["button"],
  send: ["button"],
  play: ["button"],
  pause: ["button"],
  seek: ["slider"],
  type: ["textbox", "searchbox"],
  set: ["slider", "spinbutton"],
};

function labels(html: string): string[] {
  return [...html.matchAll(/aria-label="([^"]*)"/g)].map((m) => decode(m[1]!));
}

describe.each(ready)("%s reads as text and can be acted on", (id) => {
  const def = components[id];
  // An open problem listed in test/known/<Id>.md is expected to fail until it is fixed.
  const known = existsSync(`${import.meta.dirname}/known/${id}.md`);
  const test = known ? it.fails : it;
  test.each(def.examples.map((example, index) => ({ example, index })))("example $index", ({ example }) => {
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
    for (const text of seen) expect(read, `visible text missing from the read: "${text}"`).toContain(text);
    for (const text of quoted) {
      const shown = seen.some((s) => s.includes(text)) || named.includes(text);
      expect(shown, `read offers text that is not on screen: "${text}"`).toBe(true);
    }
    const props = stampItemIds(def.meta, parsed);
    const { hidden, issues } = peekForExample(def.meta, props, html);
    expect(issues).toEqual([]);
    const addressed = addressedElements(html);
    for (const affordance of affordancesOf(def.meta, props, "c1")) {
      if (hidden.includes(affordance.address.split("/")[1]!)) continue;
      expect(read, `${affordance.address} is missing from the read`).toContain(
        `[${affordance.address} ${affordance.action}`,
      );
      const testId = `home/${affordance.address}${affordance.part === "root" ? "/root" : ""}`;
      const element = addressed.get(testId);
      expect(element, `${affordance.address} offers ${affordance.action} but is not on screen`).toBeDefined();
      if (element && hasStepTarget(element, affordance.action)) continue;
      const role = element?.attributes.match(/\brole="([^"]+)"/)?.[1];
      expect(roles[affordance.action] ?? [], `${affordance.address} has role ${role ?? "none"}`).toContain(
        role,
      );
    }
  });
});
