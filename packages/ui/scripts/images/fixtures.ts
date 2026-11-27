import { artStyles, imageKinds, type ImageKind, type ImageSlot, type ThemeChoice } from "../../src/catalog";

// Keep each subject identical across the paired model and style runs.
const subjects = {
  app_icon: ["split monstera leaf", "Ledge"],
  hero: ["potted monstera on a greenhouse bench", "Ledge"],
  cover: ["beagle beside a trail leash", "Trot"],
  onboarding: ["pour-over coffee dripper and a fresh cup", "Cafe"],
  pattern: ["stacked weight plates", "Gym"],
  empty_state: ["plain empty terracotta pot and a small pile of loose seeds", "Ledge"],
  success: ["dog leash hanging beside muddy walking boots", "Trot"],
  badge: ["jumprope looped around a kettlebell", "Gym"],
  error: ["tipped paper cup beside a coffee dripper", "Cafe"],
  product: ["brass watering can with a long spout", "Ledge"],
  dish: ["lentil soup with lemon", "Cafe"],
  plant: ["potted bird’s nest fern", "Ledge"],
  pet: ["tricolor beagle", "Trot"],
  place: ["riverside footpath beside a willow tree", "Trot"],
  room: ["gym stretching room with a wall of mats", "Gym"],
  item: ["cast iron kettlebell with a loop handle", "Gym"],
  media_cover: ["quiet coffee counter at closing time", "Cafe"],
  poster: ["running shoes beside a track starting block", "Gym"],
  step_illustration: ["felt coffee filter folded along its seam", "Cafe"],
  avatar: ["fictional beagle walker with short curls", "Trot"],
} as const satisfies Record<ImageKind, readonly [string, string]>;

export const comparisonStyles = ["natural_photo", "soft_3d", "risograph"] as const;
export const routes = [
  { id: "image2-low", model: "gpt-image-2", quality: "low", textRate: 5, imageRate: 30 },
  { id: "mini-low", model: "gpt-image-1-mini", quality: "low", textRate: 2, imageRate: 8 },
  { id: "mini-medium", model: "gpt-image-1-mini", quality: "medium", textRate: 2, imageRate: 8 },
] as const;

export type Route = (typeof routes)[number];
export type ImageJob = {
  id: string;
  slot: ImageSlot;
  world: string;
  theme: ThemeChoice & { artStyle: (typeof artStyles)[number] };
  route: Route;
  sample?: true;
};
const theme = { preset: "calm", accent: "moss", mode: "light" } as const;

export const galleryImages = {
  icon: { kind: "app_icon", subject: subjects.app_icon[0] },
  hero: { kind: "hero", subject: subjects.hero[0] },
  monstera: { kind: "plant", subject: "potted swiss cheese monstera" },
  fern: { kind: "plant", subject: subjects.plant[0] },
  aloe: { kind: "plant", subject: "potted spotted aloe vera" },
  empty: { kind: "empty_state", subject: subjects.empty_state[0] },
} as const satisfies Record<string, ImageSlot>;

export function bakeoffJobs(): ImageJob[] {
  return imageKinds.flatMap((kind) => {
    const [subject, world] = subjects[kind];
    return comparisonStyles.flatMap((artStyle) =>
      routes.map((route) => ({
        id: `${kind}-${artStyle}-${route.id}`,
        slot: { kind, subject },
        world,
        theme: { ...theme, artStyle },
        route,
      })),
    );
  });
}

export function sampleJobs(): ImageJob[] {
  return artStyles.flatMap((artStyle) =>
    Object.entries(galleryImages).map(([name, slot]) => ({
      id: `${artStyle}-${name}`,
      slot,
      world: "Ledge",
      theme: { ...theme, artStyle },
      route: name === "icon" || name === "hero" ? routes[0] : routes[2],
      sample: true,
    })),
  );
}
