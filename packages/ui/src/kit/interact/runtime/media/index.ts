import {
  itemEditSpec,
  mediaHostKey,
  photo,
  planAct,
  stageReportEdit,
  type ActStep,
  type MediaOffer,
  type Values,
} from "../../../../catalog";
import type { MediaSession } from "../../index";
import type { ControllerContext } from "../index";
import { createAttachments } from "./attachments";
import { createClips } from "./clips";
export {
  mediaHostGate,
  bindMediaConfirmation,
  matchesMediaConfirmation,
  type AttachmentEntries,
} from "./media-host";
function applyPhoto(ctx: ControllerContext, target: string, reference: string) {
  const step = { address: ctx.relative(target), action: "press" };
  const [id, ...parts] = step.address.split("/");
  const source = ctx.sourceOf(id!);
  const meta = source && ctx.defs[source.c]?.meta;
  if (meta && itemEditSpec(meta, parts.join("/"))?.action === "photo") {
    const values = ctx.valuesOf();
    const visible = ctx.liveScreen(values, ctx.status.openSheet);
    if (!planAct(visible, ctx.defs, values, [step], null, "controller", ctx.options.deviceData).ok) return;
    if (
      !stageReportEdit(visible, ctx.defs, values, step, { kind: "photo", reference }, ctx.options.deviceData)
    )
      return;
    delete values[mediaHostKey];
    ctx.store.setMany(values);
  } else {
    ctx.store.set(target, reference);
  }
  ctx.notifyChange();
}

function requestPhoto(ctx: ControllerContext, id: string, target: string, isCurrent: () => boolean) {
  const errorAt = target.slice(ctx.key(id, "").length).includes("/")
    ? `${target}/$error`
    : ctx.key(id, "error");
  const fail = (error: unknown) => {
    if (isCurrent()) ctx.store.set(errorAt, error instanceof Error ? error.message : "Photo unavailable");
  };
  let pending: Promise<string | undefined>;
  try {
    pending = ctx.options.requestPhoto!(target);
  } catch (error) {
    fail(error);
    return;
  }
  void pending
    .then((reference) => {
      if (!isCurrent() || reference === undefined) return;
      if (!photo.safeParse(reference).success) {
        fail(new Error("Invalid photo reference"));
        return;
      }
      applyPhoto(ctx, target, reference);
    })
    .catch(fail);
}
function playMedia(ctx: ControllerContext, session: MediaSession | undefined, id: string, playing: boolean) {
  if (!playing) {
    session?.pause();
    return;
  }
  const result = session?.play();
  if (result)
    void result.catch((error: unknown) => {
      if (!ctx.status.disposed) {
        ctx.store.set(ctx.key(id, "play"), false);
        ctx.store.set(ctx.key(id, "error"), error instanceof Error ? error.message : "Playback failed");
      }
    });
}
type Gate = { status: "pending" | "active" | "closed"; values: Values };
type Opened = { session: MediaSession; gate: Gate };
function send(ctx: ControllerContext, gate: Gate, update: Values) {
  if (ctx.status.disposed) return;
  if (gate.status === "active") ctx.store.setMany(update);
  else if (gate.status === "pending") Object.assign(gate.values, update);
}

function openMedia(ctx: ControllerContext, id: string, gate: Gate): MediaSession | undefined {
  const entry = ctx.sourceOf(id);
  if (ctx.status.disposed || !entry || entry.c !== "Player" || !ctx.options.media) return undefined;
  const input = ctx.inputOf(entry);
  const seconds = Number(input.seconds);
  return ctx.options.media.open(String(input.media), {
    video: input.style === "video",
    at: Number(ctx.store.get(ctx.key(id, "scrubber")) ?? input.at ?? 0),
    onTime: (at) => {
      if (Number.isFinite(at))
        send(ctx, gate, { [ctx.key(id, "scrubber")]: Math.min(seconds, Math.max(0, Math.floor(at))) });
    },
    onPlaying: (playing) => send(ctx, gate, { [ctx.key(id, "play")]: playing }),
    onError: (message) => send(ctx, gate, { [ctx.key(id, "play")]: false, [ctx.key(id, "error")]: message }),
  });
}
function finishPrepared(sessions: Map<string, Opened>, added: Map<string, Opened>, commit: boolean) {
  const values: Values = {};
  for (const [id, { session, gate }] of added) {
    gate.status = commit ? "active" : "closed";
    if (commit) {
      Object.assign(values, gate.values);
    } else {
      sessions.delete(id);
      try {
        session.dispose();
      } catch {
        // A cleanup failure must not replace the batch's original error.
      }
    }
    gate.values = {};
  }
  return values;
}

export function createMediaRuntime(ctx: ControllerContext) {
  const attachments = createAttachments(ctx);
  const clips = createClips(ctx);
  const sessions = new Map<string, Opened>();
  let photoGeneration = 0;
  function mount(id: string, pending = false) {
    if (sessions.has(id)) return sessions.get(id);
    const gate: Gate = { status: pending ? "pending" : "active", values: {} };
    const session = openMedia(ctx, id, gate);
    if (!session) return;
    const opened = { session, gate };
    sessions.set(id, opened);
    return opened;
  }
  const mountMedia = (id: string) => mount(id)?.session;
  return {
    mountMedia,
    activeMedia: clips.session,
    attachmentReference: attachments.reference,
    reconcile: () => {
      attachments.reconcile();
      clips.reconcile();
    },
    effect: (offer: MediaOffer, action: string) =>
      offer.kind === "attachment" ? attachments.run(offer) : clips.act(offer, action),
    playMedia: (id: string, playing: boolean) => playMedia(ctx, mountMedia(id), id, playing),
    seekMedia: (id: string, target: number) => mountMedia(id)?.seek(target),
    requestPhoto: (id: string, target: string) => {
      const generation = photoGeneration;
      requestPhoto(ctx, id, target, () => !ctx.status.disposed && generation === photoGeneration);
    },
    prepare: (steps: ActStep[], pending: boolean) => prepareMedia(ctx, sessions, mount, steps, pending),
    reset: () => {
      photoGeneration++;
      attachments.clear();
      clips.dispose();
      for (const [id, { session }] of sessions) {
        session.pause();
        session.seek(Number(ctx.inputOf(ctx.sourceOf(id)!).at ?? 0));
      }
    },
    dispose: () => {
      attachments.clear();
      clips.dispose();
      for (const { session, gate } of sessions.values()) {
        gate.status = "closed";
        session.dispose();
      }
      sessions.clear();
    },
  };
}
export type MediaRuntime = ReturnType<typeof createMediaRuntime>;

function prepareMedia(
  ctx: ControllerContext,
  sessions: Map<string, Opened>,
  mount: (id: string, pending: boolean) => Opened | undefined,
  steps: ActStep[],
  pending: boolean,
) {
  const added = new Map<string, Opened>();
  const finish = (commit: boolean) => finishPrepared(sessions, added, commit);
  try {
    for (const step of steps) {
      const id = ctx.relative(step.address).split("/")[0]!;
      if (sessions.has(id)) continue;
      const opened = mount(id, pending);
      if (opened && pending) added.set(id, opened);
    }
  } catch (error) {
    finish(false);
    throw error;
  }
  return finish;
}
