import { type Definition } from "@lmthing/ui/catalog";
import { createScreenController, type Environment } from "@lmthing/ui/kit";

const previewSeed = 123456789;
export const previewComponent = "c1";
export const drawPreviewEnvironment: Environment = {
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  keyboardHeight: 0,
  reduceMotion: true,
  agentMode: true,
};

/** A deterministic stream of unsigned 32-bit words for gallery fixtures only. */
function seededRandom(seed: number) {
  return () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
}

/** Populate a fresh controller through its normal actions, then keep its store for the static frame. */
export function createSeededDraw(
  def: Definition,
  input: Record<string, unknown>,
  screen: string,
  seed = previewSeed,
) {
  const { draw, id, items } = def.meta;
  if (!draw) return;
  const controller = createScreenController({
    screen: { id: screen, components: [{ ...input, id: previewComponent, c: id, state: "filled" }] },
    defs: { [id]: def },
    random: seededRandom(seed),
    now: () => 0,
  });
  try {
    if (!controller.act({ address: `${previewComponent}/${draw.press}`, action: "press" }).ok) return;
    // Hold one face in a pair or larger set so the reroll action remains available.
    if (draw.kind === "faces" && draw.hold && Number(input[draw.count]) > 1) {
      const address = `${previewComponent}/${items?.prefix ?? "r"}1/${draw.hold}`;
      controller.act({ address, action: "toggle", value: true });
    }
    return controller;
  } finally {
    controller.dispose();
  }
}
