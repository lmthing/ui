import { clipKey, planAct, validMediaReference, type MediaOffer } from "../../../../catalog";
import type { MediaSession } from "../../index";
import type { ControllerContext } from "../index";

type Offer = Extract<MediaOffer, { kind: "playback" }>;
type Clip = {
  offer: Offer;
  reference: string;
  session?: MediaSession;
  playing: boolean;
  intent: number;
};

type ClipRuntime = { ctx: ControllerContext; active?: Clip | undefined; key: (address: string) => string };

function dispose(runtime: ClipRuntime) {
  if (!runtime.active) return;
  const { session, offer } = runtime.active;
  runtime.active = undefined;
  try {
    session?.dispose();
  } catch {
    // A failed cleanup cannot make the old session current again.
  } finally {
    runtime.ctx.store.set(runtime.key(offer.address), undefined);
  }
}
function open(runtime: ClipRuntime, offer: Offer, reference: string) {
  dispose(runtime);
  const clip: Clip = { offer, reference, playing: true, intent: 0 };
  runtime.active = clip;
  const at = runtime.key(offer.address);
  try {
    clip.session = runtime.ctx.options.media!.open(reference, {
      video: offer.video,
      at: 0,
      onTime: () => {},
      onPlaying: (playing) => {
        if (runtime.active !== clip || !clip.session || !clip.playing) return;
        if (!playing) clip.playing = false;
        runtime.ctx.store.set(at, playing);
      },
      onError: () => {
        if (runtime.active !== clip) return;
        clip.playing = false;
        runtime.ctx.store.set(at, "error");
      },
    });
    if (runtime.active === clip) return clip;
    clip.session.dispose();
  } catch {
    if (runtime.active === clip) {
      runtime.active = undefined;
      runtime.ctx.store.set(at, "error");
    }
  }
}
function play(runtime: ClipRuntime, offer: Offer) {
  const address = offer.address;
  let reference: unknown;
  try {
    reference = runtime.ctx.options.resolvePlayback?.(`${runtime.ctx.screen.id}/${address}`);
  } catch {
    reference = undefined;
  }
  if (!runtime.ctx.options.media || !validMediaReference(reference))
    return runtime.ctx.store.set(runtime.key(address), "error");
  const same = runtime.active?.offer.address === address && runtime.active.reference === reference;
  const clip = same ? runtime.active : open(runtime, offer, reference);
  if (!clip?.session) return;
  if (!same && !clip.playing) return;
  const intent = ++clip.intent;
  const fail = () => {
    if (runtime.active !== clip || clip.intent !== intent) return;
    clip.playing = false;
    runtime.ctx.store.set(runtime.key(address), "error");
  };
  try {
    clip.playing = true;
    runtime.ctx.store.set(runtime.key(address), true);
    if (runtime.active === clip && clip.intent === intent)
      void Promise.resolve(clip.session.play()).catch(fail);
  } catch {
    fail();
  }
}
function act(runtime: ClipRuntime, offer: Offer, action: string) {
  if (runtime.ctx.status.disposed) return;
  if (action === "play") return play(runtime, offer);
  if (runtime.active?.offer.address !== offer.address) return;
  if (action === "stop") return dispose(runtime);
  runtime.active.playing = false;
  runtime.active.intent++;
  try {
    runtime.active.session?.pause();
    runtime.ctx.store.set(runtime.key(offer.address), false);
  } catch {
    runtime.ctx.store.set(runtime.key(offer.address), "error");
  }
}
function reconcile(runtime: ClipRuntime) {
  if (!runtime.active) return;
  const { offer, reference } = runtime.active;
  if (
    runtime.ctx.disabledParts.has(offer.address) ||
    (runtime.ctx.options.requireMounted && !runtime.ctx.mounted.has(offer.address))
  )
    return dispose(runtime);
  const values = runtime.ctx.valuesOf();
  const sheet = runtime.ctx.status.openSheet;
  const visible = runtime.ctx.liveScreen(values, sheet, Boolean(sheet));
  try {
    if (
      runtime.ctx.options.resolvePlayback?.(`${runtime.ctx.screen.id}/${offer.address}`) === reference &&
      planAct(
        visible,
        runtime.ctx.defs,
        values,
        [{ address: offer.address, action: "play" }],
        null,
        "controller",
        runtime.ctx.options.deviceData,
      ).ok
    )
      return;
  } catch {
    // Treat a failed lookup as loss of the target.
  }
  dispose(runtime);
}

export function createClips(ctx: ControllerContext) {
  const runtime: ClipRuntime = {
    ctx,
    key: (address) => {
      const [id, ...target] = address.split("/");
      return ctx.key(id!, clipKey(target.join("/") || "root"));
    },
  };
  return {
    act: (offer: Offer, action: string) => act(runtime, offer, action),
    dispose: () => dispose(runtime),
    reconcile: () => reconcile(runtime),
    session: (address: string) =>
      runtime.active?.offer.address === ctx.relative(address) ? runtime.active.session : undefined,
  };
}
