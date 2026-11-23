import type { ComponentName, ScreenLike, ThemeChoice } from "@lmthing/ui/catalog";
import { resolvePhoto } from "./photos";

const demoPhotos = new Set([
  "lib:plants",
  "lib:dogs",
  "lib:fern",
  "lib:monstera",
  "lib:basil",
  "lib:aloe",
  "lib:park_walk",
  "lib:river_walk",
  "lib:evening_walk",
  "lib:fern_shelf",
  "lib:window_pots",
  "lib:slow_walk",
  "lib:clover_walk",
]);
const mediaExamples = new Set<ComponentName>(["Photo", "Gallery", "Hero"]);

/** The fixture host returns bytes only for known sample references, never personal media. */
export function resolveMediaFixture(ref: string, theme: ThemeChoice) {
  if (ref === "lib:damaged_sample") return "data:image/png;base64,AA==";
  return demoPhotos.has(ref) ? resolvePhoto(ref, theme, undefined, true) : undefined;
}

export function lookPhoto(ref: string, theme: ThemeChoice, id: ComponentName) {
  return mediaExamples.has(id) ? resolveMediaFixture(ref, theme) : resolvePhoto(ref, theme, id);
}

const project = {
  id: "quilt_tracker",
  components: [
    { c: "Header", id: "header", title: "Birthday quilt" },
    {
      c: "Progress",
      id: "measure",
      bars: [{ label: "Blocks sewn", value: 8, of: 12, unit: "blocks", due: "2026-12-05" }],
    },
    {
      c: "KeyValue",
      id: "facts",
      pairs: [
        { label: "Next milestone", value: "Join the quilt top", mark: "highlight" },
        { label: "Status", value: "Waiting for backing fabric", mark: "muted" },
      ],
    },
  ],
} satisfies ScreenLike;

const sketch = {
  id: "sketch_review",
  components: [
    { c: "Header", id: "header", title: "Fern jacket sketch" },
    { c: "Photo", id: "image", photo: "lib:fern", caption: "Fern motif for the front cover" },
    {
      c: "KeyValue",
      id: "facts",
      pairs: [
        { label: "Version", value: "Sketch 2" },
        { label: "Status", value: "Ready for review" },
      ],
    },
  ],
} satisfies ScreenLike;

const browse = {
  id: "browse_thumbnails",
  components: [
    { c: "Header", id: "header", title: "Plant reference library" },
    {
      c: "List",
      id: "records",
      lead: "thumb",
      rows: [
        { title: "Fern guide", meta: "Indirect light", photo: "lib:fern_shelf" },
        { title: "Window pots", meta: "South-facing window", photo: "lib:window_pots" },
        { title: "Watering notes", meta: "No image attached", photo: "local:42" },
      ],
    },
    { c: "Note", id: "note", text: "Care notes are available even without a cover image." },
  ],
} satisfies ScreenLike;

const fallback = {
  id: "media_fallback",
  components: [
    { c: "Header", id: "header", title: "Walk photos" },
    { c: "Photo", id: "missing", photo: "local:41", caption: "Missing local image" },
    {
      c: "Gallery",
      id: "unavailable",
      style: "carousel",
      photos: [{ photo: "local:42" }, { photo: "local:43" }],
    },
    { c: "Photo", id: "damaged", photo: "lib:damaged_sample", caption: "Morning park walk" },
    { c: "Note", id: "note", text: "The walk notes are still available." },
  ],
} satisfies ScreenLike;

const unscored = {
  id: "unscored_rating",
  components: [
    { c: "Header", id: "header", title: "Riverside dog park" },
    { c: "Scale", id: "rating", style: "stars", readonly: true, label: "Walker rating" },
    { c: "Note", id: "note", text: "The east gate opens onto the riverside path." },
    { c: "KeyValue", id: "facts", pairs: [{ label: "Surface", value: "Grass" }] },
  ],
} satisfies ScreenLike;

const gallery = {
  id: "garden_gallery",
  components: [
    { c: "Header", id: "header", title: "Garden shelf" },
    {
      c: "Gallery",
      id: "photos",
      photos: [
        { photo: "lib:fern", caption: "Fern" },
        { photo: "local:46", caption: "Missing local sample", goto: "local_detail" },
        { photo: "lib:basil", caption: "Basil" },
      ],
    },
    { c: "Note", id: "note", text: "Both plants moved into the window this week." },
  ],
} satisfies ScreenLike;

export const mediaProgressFixtures: Partial<Record<ComponentName, readonly ScreenLike[]>> = {
  List: [browse],
  Photo: [sketch, fallback],
  Gallery: [gallery],
  Progress: [
    project,
    {
      ...project,
      id: "quilt_detail",
      components: project.components.map((entry) =>
        entry.c === "Progress" ? { ...entry, style: "ring" } : entry,
      ),
    },
  ],
  Scale: [unscored],
};
