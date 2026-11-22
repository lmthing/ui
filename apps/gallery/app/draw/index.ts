import {
  components,
  selectionBindingFor,
  type Definition,
  type DeviceData,
  type ScreenLike,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController, type AuthenticateReveal, type Environment } from "@lmthing/ui/kit";

export { SignaturePreview } from "./signature-preview";

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

/** Mount the declared source in the preview controller, leaving the frame focused on the consumer. */
function createSelectionPreview(
  def: Definition,
  input: Record<string, unknown>,
  screenId: string,
  deviceData?: DeviceData,
  authenticateReveal?: AuthenticateReveal,
) {
  const binding = def.meta.selectionBinding!;
  const { component: c } = binding;
  const id = binding.source ?? "source";
  const source = (components as Record<string, Definition | undefined>)[c];
  if (!source || id === previewComponent) throw new Error(`Missing selection source for ${def.meta.id}`);
  const defs = { [def.meta.id]: def, [c]: source };
  const consumer = { ...input, id: previewComponent, c: def.meta.id };
  for (const example of source.examples) {
    if (!example || typeof example !== "object" || !source.props.safeParse(example).success) continue;
    const screen: ScreenLike = { id: screenId, components: [{ ...example, id, c }, consumer] };
    const check = selectionBindingFor(screen, defs, def.meta, previewComponent, {}, deviceData)?.checks[0];
    if (!check) continue;
    const controller = createScreenController({
      screen,
      defs,
      deviceData,
      authenticateReveal,
      now: authenticateReveal ? Date.now : () => 0,
    });
    let seeded = false;
    try {
      seeded = controller.act({ address: check.address, action: "check", value: true }).ok;
      if (seeded) return controller;
      throw new Error(`Could not check ${check.address} for ${def.meta.id} preview`);
    } finally {
      if (!seeded || !authenticateReveal) controller.dispose();
    }
  }
  throw new Error(`No selectable ${c} example for ${def.meta.id} preview`);
}

/** Both the gallery grid and look frames use the same out-of-band fixture for each example/state. */
export function createPreviewController(
  def: Definition,
  input: Record<string, unknown>,
  screen: string,
  { state, drawn }: { state: StateName; drawn?: true },
) {
  const deviceData = def.meta.deviceData?.length && def.meta.previewDeviceData?.({ input, state });
  const authenticateReveal = def.meta.actions?.reveal ? approveExampleReveal : undefined;
  if (state === "filled" && def.meta.selectionBinding)
    return createSelectionPreview(def, input, screen, deviceData || undefined, authenticateReveal);
  return createSeededDraw(def, input, screen, {
    state,
    ...(drawn ? { drawn } : {}),
    ...(deviceData ? { deviceData } : {}),
    ...(authenticateReveal ? { authenticateReveal } : {}),
  });
}
