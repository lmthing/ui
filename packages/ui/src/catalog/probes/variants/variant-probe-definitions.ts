import { z } from "zod";
import { itemVariantProps, photo, text } from "../../props";
import { variantFixture } from "./variant-fixture";

const listAxes = {
  density: ["comfortable", "compact"],
  arrange: ["rows", "grid", "strip"],
  group: ["none", "sections", "dates"],
  overflow: ["all", "peek", "page"],
  lead: ["none", "icon", "avatar", "number"],
  trail: ["none", "chevron", "value", "toggle"],
} as const;
const itemAxes = {
  tone: ["neutral", "good", "warn", "bad"],
  mark: ["none", "highlight", "muted", "new"],
} as const;
const list = variantFixture(
  "List",
  "Show several things of the same kind.",
  listAxes,
  {
    rows: z
      .array(z.strictObject({ title: text(28), ...itemVariantProps(itemAxes) }))
      .min(1)
      .max(6),
  },
  { rows: [{ title: "Fern" }, { title: "Basil" }, { title: "Aloe" }] },
  [
    [
      { axis: "density", value: "compact" },
      "Use tighter vertical spacing between walks: Clover, Pip and Scout.",
      "List today's walks: Clover, Pip and Scout.",
    ],
    [
      { axis: "arrange", value: "grid" },
      "Lay out Fern, Basil and Aloe in a grid instead of a single column.",
      "List Fern, Basil and Aloe.",
    ],
    [
      { axis: "group", value: "dates" },
      "Group Monday fern care and Tuesday basil care under date headings.",
      "List Water Fern and Prune Basil.",
    ],
    [
      { axis: "overflow", value: "peek" },
      "List watering, pruning, feeding and repotting. Show only the first few, with one See all link for the whole list.",
      "List watering, pruning, feeding and repotting.",
    ],
    [
      { axis: "lead", value: "number" },
      "List Fern, Basil and Aloe with a number at the start of each row.",
      "List Fern, Basil and Aloe in that order.",
    ],
    [
      { axis: "trail", value: "toggle" },
      "List reminders for Fern and Basil, with an on/off switch at the end of each row.",
      "List reminders for Fern and Basil.",
    ],
    [
      { axis: "tone", value: "warn", item: 0 },
      "List Fern, Basil and Aloe, in that order. Give only Fern a warning status.",
      "List the plants in order: Fern first, Basil second, Aloe third.",
    ],
    [
      { axis: "mark", value: "highlight", item: 0 },
      "List Fern, Basil and Aloe, in that order. Visually highlight only the first row for Fern.",
      "List three plants, in this order: Fern, Basil and Aloe.",
    ],
  ],
  {
    items: { key: "rows", parts: ["root", "title"], variants: itemAxes },
    writeHints: [
      "Use group dates only for date headings. A day mentioned in item content is not a heading request.",
      "Tighter spacing changes density only. A See all link for the whole list changes overflow, not the row trail.",
    ],
  },
);
const card = variantFixture(
  "Card",
  "Show one thing with a title and a little detail.",
  {
    emphasis: ["normal", "quiet", "hero"],
    surface: ["card", "plain", "tinted", "outlined"],
    align: ["start", "center"],
    detail: ["full", "brief"],
    media: ["thumb", "none", "icon", "cover"],
  },
  { title: text(40), body: text(120).optional(), photo: photo.optional() },
  { title: "Fern", body: "Water on Fridays", photo: "lib:plants" },
  [
    [
      { axis: "emphasis", value: "hero" },
      "Make the Morning Walk card the big focal point of the screen.",
      "Make a card titled Morning Walk.",
    ],
    [
      { axis: "surface", value: "outlined" },
      "Show Fern care in a card with just an outline and no filled background.",
      "Make a plant care card titled Fern Schedule with the body Water on Friday.",
    ],
    [
      { axis: "align", value: "center" },
      "On the Fern card, center all the text horizontally.",
      "Create a card titled Fern. Body: Remember to water on Friday.",
    ],
    [
      { axis: "detail", value: "brief" },
      "Make a Fern care card with Water Friday as its detail, but use a title-only view that hides secondary text.",
      "Make a card titled Fern Care. Body: Water Friday.",
    ],
    [
      { axis: "media", value: "cover" },
      "Show Fern with the photo lib:plants as a large cover image across the top.",
      "Make a card titled Fern Care, using lib:plants as its photo reference.",
    ],
  ],
  {
    writeHints: [
      "Set detail to brief only when asked to hide secondary text. Keep the body text in the data; supplying body copy by itself does not request a detail setting.",
      "Keep media null for a photo reference alone. Only change media when asked how to display the image, such as a large cover.",
      "A request for a focal point changes emphasis only. Supplying a title or body does not request emphasis. Do not add a photo or set media unless asked.",
    ],
  },
);
const picture = variantFixture(
  "Photo",
  "Show one picture with an optional caption.",
  { bleed: ["inset", "edge"], aspect: ["wide", "square", "tall"] },
  { photo, caption: text(80).optional() },
  { photo: "lib:plants", caption: "Morning light" },
  [
    [
      { axis: "bleed", value: "edge" },
      "Show lib:plants edge to edge without side margins.",
      "Show lib:plants with the caption Morning light.",
    ],
    [
      { axis: "aspect", value: "square" },
      "Show the photo lib:dogs cropped to a square.",
      "Show the photo lib:dogs.",
    ],
  ],
);
const bars = variantFixture(
  "Bars",
  "Compare amounts across days or categories.",
  { figures: ["exact", "short"], labels: ["key", "none", "all"] },
  {
    title: text(32),
    points: z
      .array(z.strictObject({ label: text(4), value: z.number().min(0) }))
      .min(2)
      .max(7),
  },
  {
    title: "Steps",
    points: [
      { label: "Mon", value: 1240 },
      { label: "Tue", value: 2300 },
    ],
  },
  [
    [
      { axis: "figures", value: "short" },
      "Chart 1,240 steps Monday and 2,300 Tuesday. Abbreviate thousands as k, but keep the exact source values.",
      "Chart 1,240 steps Monday and 2,300 Tuesday.",
    ],
    [
      { axis: "labels", value: "all" },
      "Show a value label above each bar. The walks were seven on Monday and eight on Tuesday.",
      "Chart 7 walks on Monday and 8 on Tuesday.",
    ],
  ],
  {
    items: { key: "points", parts: ["root", "label"] },
    writeHints: [
      "Leave both figures and labels null for plain data. Asking for values above the bars changes only labels; asking to abbreviate values changes only figures and does not request bar labels.",
    ],
  },
);

export const variantProbeDefinitions = [list, card, picture, bars];
