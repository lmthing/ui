import { afterAll, beforeAll, expect, it } from "vitest";
import {
  appointmentDate,
  components,
  defaultLang,
  moneyLine,
  readComponent,
  readPrompt,
  registerWords,
  wordsFor,
  type Words,
} from "@lmthing/ui/catalog";
import { bookingWordsFor, registerBookingWords, type BookingWords } from "../src/packs/booking/lang";
import { kitchenWordsFor, registerKitchenWords, type KitchenWords } from "../src/packs/kitchen/lang";
import { createScreenController } from "@lmthing/ui/kit";
import { renderInstance, type Theme } from "./render";

const lang = "en-XA-u-nu-fullwide";
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies Theme;
const bracket = (word: string) => `[${word}]`;
const english = wordsFor();
const booking = bookingWordsFor();
const kitchen = kitchenWordsFor();
const pseudo = {
  ...english,
  tag: lang,
  empty: (things: string) => bracket(english.empty(things)),
  nothing: bracket(english.nothing),
  loadingLabel: bracket(english.loadingLabel),
  pluralThing: (word: string) => `${word}~`,
  placeholderTitles: english.placeholderTitles.map(bracket),
  timerLabels: { start: bracket(english.timerLabels.start), stop: bracket(english.timerLabels.stop) },
  stepLabels: { less: bracket(english.stepLabels.less), more: bracket(english.stepLabels.more) },
  moneyLabels: { total: bracket(english.moneyLabels.total) },
  perWords: { ...english.perWords, hour: bracket(english.perWords.hour) },
  duration: (minutes: string) => bracket(english.duration(minutes)),
  cancelLabel: bracket(english.cancelLabel),
  repeatLabels: { ...english.repeatLabels, daily: bracket(english.repeatLabels.daily) },
} satisfies Words;
const pseudoBooking = {
  ...booking,
  bookLabel: bracket(booking.bookLabel),
  appointmentLabels: {
    ...booking.appointmentLabels,
    confirmed: bracket(booking.appointmentLabels.confirmed),
    reschedule: bracket(booking.appointmentLabels.reschedule),
  },
} satisfies BookingWords;
const pseudoKitchen = {
  ...kitchen,
  foodLogLabels: {
    ...kitchen.foodLogLabels,
    meals: { ...kitchen.foodLogLabels.meals, dinner: "[Evening meal]" },
    add: (meal: string) => `[Add] ${meal}`,
  },
  ingredientsLabels: {
    ...kitchen.ingredientsLabels,
    servings: "[Servings]",
    less: "[Fewer]",
    us: "[US]",
  },
  ingredientPieces: (_value, form) => `[${form}]`,
} satisfies KitchenWords;
const unregister: (() => void)[] = [];

beforeAll(() => {
  unregister.push(
    registerWords(lang, pseudo),
    registerBookingWords(lang, pseudoBooking),
    registerKitchenWords(lang, pseudoKitchen),
  );
});
afterAll(() => unregister.forEach((remove) => remove()));

it("switches the List empty and loading words without changing authored labels", () => {
  const list = { rows: [{ title: "Fern" }] };
  expect(renderInstance("List", list, "empty", theme, { lang, thing: "plant" })).toContain("[No plant~ yet]");
  expect(renderInstance("List", list, "empty", theme, { lang })).toContain("[Nothing here yet]");
  expect(renderInstance("List", list, "loading", theme, { lang })).toContain('aria-label="[Loading]"');
  expect(renderInstance("List", list, "filled", theme, { lang })).toContain("Fern");
  expect(components.List.fallback({ cast: { things: [], items: [] }, lang }).rows[0]?.title).toBe(
    "[Item one]",
  );
  expect(renderInstance("List", list, "empty", theme, { lang: defaultLang })).toBe(
    renderInstance("List", list, "empty", theme),
  );
});

it("switches Timer, Counter and their reader words; formats a clock and amount with Intl", () => {
  const timer = { seconds: 65, label: "Fern" };
  const html = renderInstance("Timer", timer, "filled", theme, { lang });
  expect(html).toContain("[Start]");
  expect(html).toContain("[Stop]");
  expect(html).toContain("１:０５");
  expect(html).toContain("Fern");
  const counter = renderInstance("Counter", components.Counter.examples[0], "filled", theme, { lang });
  expect(counter).toContain("[One less]");
  expect(counter).toContain("[One more]");
  expect(readComponent(components.Timer, timer, "t1", undefined, undefined, lang).join()).toContain(
    "[Start]",
  );
  expect(readPrompt(components.Timer, 0, "t1", "Start it", lang)).toContain("[Stop]");

  const amount = renderInstance("Amount", { value: 24, per: "hour", style: "total" }, "filled", theme, {
    lang,
  });
  expect(amount).toContain("[Total]");
  expect(amount).toContain("$２４ / [hr]");
  expect(moneyLine(24, undefined, "hour")).toBe("$24 / hr");
});

it("switches booking-specific words and date formatting in the view and reader", () => {
  const input = {
    service: "Fern",
    goto: "details",
    date: "2026-11-18",
    time: "10:00",
    minutes: 30,
    status: "confirmed",
    style: "card",
  };
  const html = renderInstance("Appointment", input, "filled", theme, { lang });
  const date = appointmentDate(input.date, lang);
  expect(date).toContain("２０２６");
  for (const word of [date, "１０:００", "[Confirmed]", "[３０ min]", "[Reschedule]", "[Cancel]"]) {
    expect(html).toContain(word);
    expect(readComponent(components.Appointment, input, "a1", undefined, undefined, lang).join()).toContain(
      word,
    );
  }
  const service = renderInstance("ServiceMenu", components.ServiceMenu.examples[0], "filled", theme, {
    lang,
  });
  expect(service).toContain("[Book]");
  expect(service).toContain("[３０ min]");
});

it("builds FoodLog's add label from the display word, not the meal key", () => {
  const input = { meals: [{ meal: "dinner", items: [] }], goto: "food_add" };
  const html = renderInstance("FoodLog", input, "filled", theme, { lang });
  expect(html).toContain('aria-label="[Add] [Evening meal]"');
  expect(readComponent(components.FoodLog, input, "f1", undefined, undefined, lang).join()).toContain(
    "[Evening meal]",
  );
  expect(renderInstance("FoodLog", input, "filled", theme)).toContain('aria-label="Add food to dinner"');
});

it("localizes ingredient controls, quantities and the corresponding reader", () => {
  const input = {
    servings: 2,
    groups: [{ items: [{ name: "Seed", amount: 2, unit: "piece" }] }],
  };
  const html = renderInstance("Ingredients", input, "filled", theme, { lang });
  for (const word of ["２", "[Servings]", "[US]", "[other]"]) {
    expect(html).toContain(word);
    expect(readComponent(components.Ingredients, input, "i1", undefined, undefined, lang).join()).toContain(
      word,
    );
  }
  expect(html).toContain('aria-label="[Fewer]"');
});

it("uses the same localized clock in BabyLog's visible row and reader", () => {
  const input = { log: [{ kind: "sleep", time: "09:15" }] };
  expect(renderInstance("BabyLog", input, "filled", theme, { lang })).toContain("０９:１５");
  expect(readComponent(components.BabyLog, input, "b1", undefined, undefined, lang).join()).toContain(
    "０９:１５",
  );
});

it("keeps localized repeat choices actionable without changing the stored enum", () => {
  const controller = createScreenController({
    lang,
    defs: components,
    screen: {
      id: "home",
      components: [{ id: "f1", c: "Field", kind: "repeat", label: "Fern", repeat: "weekly" }],
    },
  });
  try {
    expect(controller.act({ address: "f1/field", action: "select", value: "[Daily]" }).ok).toBe(true);
    expect(controller.snapshotScreen().components[0]?.repeat).toBe("daily");
    expect(controller.read()).toContain("[Daily] chosen");
  } finally {
    controller.dispose();
  }
});
