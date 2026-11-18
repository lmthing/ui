import { photo, type ActStep } from "../../../catalog";
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
function openMedia(ctx: ControllerContext, id: string): MediaSession | undefined {
  const entry = ctx.sourceOf(id);
  if (ctx.status.disposed || !entry || entry.c !== "Player" || !ctx.options.media) return undefined;
  const input = ctx.inputOf(entry);
  const seconds = Number(input.seconds);
  return ctx.options.media.open(String(input.media), {
    video: input.style === "video",
    at: Number(ctx.store.get(ctx.key(id, "scrubber")) ?? input.at ?? 0),
    onTime: (at) => {
      if (!ctx.status.disposed && Number.isFinite(at))
        ctx.store.set(ctx.key(id, "scrubber"), Math.min(seconds, Math.max(0, Math.floor(at))));
    },
    onPlaying: (playing) => {
      if (!ctx.status.disposed) ctx.store.set(ctx.key(id, "play"), playing);
    },
    onError: (message) => {
      if (!ctx.status.disposed) {
        ctx.store.set(ctx.key(id, "play"), false);
        ctx.store.set(ctx.key(id, "error"), message);
      }
    },
  });
}
export function createMediaRuntime(ctx: ControllerContext) {
  const sessions = new Map<string, MediaSession>();
  function mountMedia(id: string) {
    if (sessions.has(id)) return sessions.get(id)!;
    const session = openMedia(ctx, id);
    if (session) sessions.set(id, session);
    return session;
  }
  return {
    mountMedia,
    playMedia: (id: string, playing: boolean) => playMedia(ctx, mountMedia(id), id, playing),
    seekMedia: (id: string, target: number) => mountMedia(id)?.seek(target),
    requestPhoto: (id: string, target: string) => requestPhoto(ctx, id, target),
    prepare: (steps: ActStep[]) => {
      for (const step of steps) {
        const id = ctx.relative(step.address).split("/")[0]!;
        if (ctx.sourceOf(id)?.c === "Player") mountMedia(id);
      }
    },
    reset: () => {
      for (const [id, session] of sessions) {
        session.pause();
        session.seek(Number(ctx.inputOf(ctx.sourceOf(id)!).at ?? 0));
      }
    },
    dispose: () => {
      for (const session of sessions.values()) session.dispose();
      sessions.clear();
    },
  };
}
export type MediaRuntime = ReturnType<typeof createMediaRuntime>;
