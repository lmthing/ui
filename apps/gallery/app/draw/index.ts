import { type Definition, type DeviceData, type StateName } from "@lmthing/ui/catalog";
import { createScreenController, type AuthenticateReveal, type Environment } from "@lmthing/ui/kit";

const previewSeed = 123456789;
export const previewComponent = "c1";
export const drawPreviewEnvironment: Environment = {
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  keyboardHeight: 0,
  reduceMotion: true,
  agentMode: true,
};
const approveExampleReveal: AuthenticateReveal = async () => "approved";

/** A deterministic stream of unsigned 32-bit words for gallery fixtures only. */
function seededRandom(seed: number) {
  return () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
}

/** Populate a fresh controller through its normal actions, then keep its store for the static frame. */
export function createSeededDraw(
  def: Definition,
  input: Record<string, unknown>,
  screen: string,
  {
    seed = previewSeed,
    state = "filled",
    drawn,
    deviceData,
    authenticateReveal,
  }: {
    seed?: number | undefined;
    state?: StateName;
    drawn?: true;
    deviceData?: DeviceData;
    authenticateReveal?: AuthenticateReveal;
  },
) {
  const { draw, id, items } = def.meta;
  const shouldDraw = draw && (drawn || state === "success");
  if (!shouldDraw && !deviceData && !authenticateReveal) return;
  const controller = createScreenController({
    screen: { id: screen, components: [{ ...input, id: previewComponent, c: id, state }] },
    defs: { [id]: def },
    random: seededRandom(seed),
    now: authenticateReveal ? Date.now : () => 0,
    deviceData,
    authenticateReveal,
  });
  try {
    if (!shouldDraw) return controller;
    if (!controller.act({ address: `${previewComponent}/${draw.press}`, action: "press" }).ok) return;
    // Hold one face in a pair or larger set so the reroll action remains available.
    if (draw.kind === "faces" && draw.hold && Number(input[draw.count]) > 1) {
      const address = `${previewComponent}/${items?.prefix ?? "r"}1/${draw.hold}`;
      controller.act({ address, action: "toggle", value: true });
    }
    return controller;
  } finally {
    if (!authenticateReveal) controller.dispose();
  }
}

/** Both the gallery grid and look frames use the same out-of-band fixture for each example/state. */
export function createPreviewController(
  def: Definition,
  input: Record<string, unknown>,
  screen: string,
  { state, drawn }: { state: StateName; drawn?: true },
) {
  const deviceData = def.meta.deviceData?.length && def.meta.previewDeviceData?.({ input, state });
  return createSeededDraw(def, input, screen, {
    state,
    ...(drawn ? { drawn } : {}),
    ...(deviceData ? { deviceData } : {}),
    ...(def.meta.actions?.reveal ? { authenticateReveal: approveExampleReveal } : {}),
  });
}
