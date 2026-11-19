import { photo, type ActStep, type Values } from "../../../catalog";
import type { MediaSession } from "../index";
import type { ControllerContext } from "./context";
function requestPhoto(ctx: ControllerContext, id: string, target: string) {
  void ctx.options.requestPhoto!(target)
    .then((reference) => {
      if (ctx.status.disposed || reference === undefined) return;
      if (!photo.safeParse(reference).success) {
        ctx.store.set(ctx.key(id, "error"), "Invalid photo reference");
        return;
      }
      ctx.store.set(target, reference);
      ctx.notifyChange();
    })
    .catch((error: unknown) => {
      if (!ctx.status.disposed)
        ctx.store.set(ctx.key(id, "error"), error instanceof Error ? error.message : "Photo unavailable");
    });
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
  const sessions = new Map<string, Opened>();
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
  function prepare(steps: ActStep[], pending: boolean) {
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
  return {
    mountMedia,
    playMedia: (id: string, playing: boolean) => playMedia(ctx, mountMedia(id), id, playing),
    seekMedia: (id: string, target: number) => mountMedia(id)?.seek(target),
    requestPhoto: (id: string, target: string) => requestPhoto(ctx, id, target),
    prepare,
    reset: () => {
      for (const [id, { session }] of sessions) {
        session.pause();
        session.seek(Number(ctx.inputOf(ctx.sourceOf(id)!).at ?? 0));
      }
    },
    dispose: () => {
      for (const { session, gate } of sessions.values()) {
        gate.status = "closed";
        session.dispose();
      }
      sessions.clear();
    },
  };
}
export type MediaRuntime = ReturnType<typeof createMediaRuntime>;
