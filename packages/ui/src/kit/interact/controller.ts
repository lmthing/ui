import {
  affordancesOf,
  planAct,
  readScreen,
  stampItemIds,
  type ActStep,
  type Definition,
  type ScreenLike,
  type Values,
} from "../../catalog";
import { cancelLabel, confirmLabel, mediaUnavailable } from "../../catalog";
import type { ActOptions, ActReply } from "./agent";
import { createInteractionStore } from "./store";
import type { MediaAdapter, MediaSession } from "./media";

export type Confirmation = {
  message: string;
  kind: "primary" | "secondary" | "quiet" | "danger";
  source: string;
  goto?: string;
};
type ScreenComponent = ScreenLike["components"][number];

/** One dispatcher for human taps and agent steps. Hidden sheets and covered controls are not actionable. */
export function createScreenController(options: {
  screen: ScreenLike;
  defs: Record<string, Definition>;
  media?: MediaAdapter | undefined;
  onLink?: ((goto: string, address: string) => void) | undefined;
  onAction?: ((step: ActStep) => void) | undefined;
}) {
  const { screen, defs } = options;
  const store = createInteractionStore();
  const sessions = new Map<string, MediaSession>();
  let openSheet: string | undefined;
  let confirmation: Confirmation | undefined;
  let disposed = false;
  const key = (id: string, part: string) => `${screen.id}/${id}/${part}`;
  const fail = (at: number, code: string, hint: string): ActReply => ({ ok: false, at, code, hint });
  const relative = (address: string) => address.replace(`${screen.id}/`, "").replace(/\/root$/, "");
  const sourceOf = (id: string) => screen.components.find((entry) => entry.id === id);
  const inputOf = (entry: ScreenComponent) => {
    const { id: _id, c: _c, state: _state, ...input } = entry;
    return defs[entry.c]!.props.parse(input) as Values;
  };
  const liveScreen = (values: Values, sheet: string | undefined, covered = false): ScreenLike => ({
    ...screen,
    components: screen.components
      .filter((entry) => entry.c !== "Sheet" || entry.id === sheet)
      .filter((entry) => !covered || entry.id === sheet)
      .map((entry) => {
        if (entry.c === "Player") {
          const at = values[key(entry.id, "scrubber")];
          return typeof at === "number" ? { ...entry, at: Math.floor(at) } : entry;
        }
        if (entry.c === "Sheet") {
          const at = values[key(entry.id, "at")];
          return typeof at === "number" ? { ...entry, at: Math.floor(at) } : entry;
        }
        return entry;
      }),
  });
  function mountMedia(id: string) {
    if (sessions.has(id)) return sessions.get(id)!;
    const entry = sourceOf(id);
    if (disposed || !entry || entry.c !== "Player" || !options.media) return undefined;
    const input = inputOf(entry);
    const seconds = Number(input.seconds);
    const session = options.media.open(String(input.media), {
      video: input.style === "video",
      at: Number(store.get(key(id, "scrubber")) ?? input.at ?? 0),
      onTime: (at) => {
        if (!disposed && Number.isFinite(at))
          store.set(key(id, "scrubber"), Math.min(seconds, Math.max(0, Math.floor(at))));
      },
      onPlaying: (playing) => {
        if (!disposed) store.set(key(id, "play"), playing);
      },
      onError: (message) => {
        if (!disposed) {
          store.set(key(id, "play"), false);
          store.set(key(id, "error"), message);
        }
      },
    });
    sessions.set(id, session);
    return session;
  }
  function act(steps: ActStep | ActStep[], opts: ActOptions = {}): ActReply {
    if (disposed) return fail(0, "not_actionable", "This screen is no longer mounted");
    const list = Array.isArray(steps) ? steps : [steps];
    let values = store.snapshot();
    let sheet = openSheet;
    let confirm = confirmation;
    const effects: (() => void)[] = [];
    const changes: string[] = [];
    for (const [at, step] of list.entries()) {
      const address = relative(step.address);
      if (confirm) {
        const accepting = address === "confirm/confirm" && step.action === "press";
        const cancelling = address === "confirm/cancel" && step.action === "dismiss";
        if (!accepting && !cancelling) return fail(at, "not_actionable", "Answer the confirmation first");
        if (step.value !== undefined) return fail(at, "invalid_value", "Confirmation takes no value");
        const pending = confirm;
        if (accepting) {
          if (pending.goto === "sheet") {
            const sheets = screen.components.filter((entry) => entry.c === "Sheet");
            if (sheets.length !== 1)
              return fail(at, "not_actionable", "A sheet link needs exactly one sheet on this screen");
            sheet = sheets[0]!.id;
          }
          effects.push(() => {
            if (pending.goto && pending.goto !== "sheet") options.onLink?.(pending.goto, pending.source);
            options.onAction?.({ address: pending.source, action: "press" });
          });
        }
        confirm = undefined;
        changes.push(`${address} ${step.action}`);
        continue;
      }
      const active = liveScreen(values, sheet, Boolean(sheet));
      const selected =
        step.action === "select" && step.value === undefined && /\/r[1-9][0-9]*$/.test(address)
          ? { ...step, value: Number(address.split("/")[1]!.slice(1)) - 1 }
          : step;
      const plan = planAct(active, defs, values, [selected]);
      if (!plan.ok) return { ...plan, at };
      const id = address.split("/")[0]!;
      const entry = sourceOf(id)!;
      if (entry.state && entry.state !== "filled")
        return fail(at, "not_actionable", "This component is not filled");
      const input = inputOf(entry);
      values = plan.values;
      changes.push(...plan.changed);
      if (entry.c === "Button" && step.action === "press" && input.confirm) {
        confirm = {
          message: String(input.confirm),
          kind: input.kind as Confirmation["kind"],
          source: key(id, "root"),
          ...(input.goto ? { goto: String(input.goto) } : {}),
        };
        continue;
      }
      if (entry.c === "Player") {
        const part = address.split("/")[1];
        if (!options.media) return fail(at, "media_unavailable", "The host has no local media adapter");
        if (step.action === "seek" || part === "back" || part === "forward") {
          const here = Number(values[key(id, "scrubber")] ?? input.at ?? 0);
          const target =
            step.action === "seek"
              ? Number(step.value)
              : Math.max(0, Math.min(Number(input.seconds), here + (part === "back" ? -15 : 15)));
          if (target > Number(input.seconds))
            return fail(at, "invalid_value", "Cannot seek past the end of this recording");
          values[key(id, "scrubber")] = target;
          effects.push(() => mountMedia(id)?.seek(target));
        } else if (step.action === "play" || step.action === "pause") {
          const playing = step.action === "play";
          values[key(id, "play")] = playing;
          if (playing) values[key(id, "error")] = undefined;
          effects.push(() => {
            const session = mountMedia(id);
            if (!playing) {
              session?.pause();
              return;
            }
            const result = session?.play();
            if (result)
              void result.catch((error: unknown) => {
                if (!disposed) {
                  store.set(key(id, "play"), false);
                  store.set(key(id, "error"), error instanceof Error ? error.message : "Playback failed");
                }
              });
          });
        }
        continue;
      }
      if (entry.c === "Sheet") {
        if (step.action === "dismiss") sheet = undefined;
        if (step.action === "select") {
          const index = Number(address.split("/")[1]?.slice(1)) - 1;
          const item = (input.items as { label: string }[])[index]!;
          if (step.value !== undefined && step.value !== index && step.value !== item.label)
            return fail(at, "invalid_value", "Select the option at this address");
          values[key(id, "at")] = index;
        }
        if (step.action === "press") sheet = undefined;
      }
      for (const link of plan.links) {
        if (link.goto === "sheet") {
          const sheets = screen.components.filter((component) => component.c === "Sheet");
          if (sheets.length !== 1)
            return fail(at, "not_actionable", "A sheet link needs exactly one sheet on this screen");
          sheet = sheets[0]!.id;
        } else effects.push(() => options.onLink?.(link.goto, link.address));
      }
      effects.push(() => options.onAction?.({ ...step, address: `${screen.id}/${address}` }));
    }
    const reply = {
      ok: true as const,
      screen: screen.id,
      changed: changes.join("\n"),
      dryRun: Boolean(opts.dryRun),
    };
    if (opts.dryRun) return reply;
    // Prepare media only after validation, before committing any changes.
    try {
      for (const step of list) {
        const id = relative(step.address).split("/")[0]!;
        if (sourceOf(id)?.c === "Player") mountMedia(id);
      }
    } catch (error) {
      return fail(0, "media_unavailable", error instanceof Error ? error.message : "Recording unavailable");
    }
    openSheet = sheet;
    confirmation = confirm;
    store.setMany(values);
    for (const effect of effects) effect();
    return reply;
  }
  return {
    defs,
    store,
    act,
    mountMedia,
    press(address: string) {
      const local = relative(address);
      if (confirmation) {
        if (!["confirm/confirm", "confirm/cancel", "confirm/close"].includes(local))
          return fail(0, "not_actionable", "Answer the confirmation first");
        return act({
          address: local === "confirm/confirm" ? local : "confirm/cancel",
          action: local === "confirm/confirm" ? "press" : "dismiss",
        });
      }
      const id = local.split("/")[0]!;
      const entry = sourceOf(id);
      if (!entry || !defs[entry.c]) return fail(0, "not_actionable", "No control at this address");
      const offered = affordancesOf(
        defs[entry.c]!.meta,
        stampItemIds(defs[entry.c]!.meta, inputOf(entry)),
        id,
      ).filter((a) => a.address === local);
      const action =
        entry.c === "Player" && local.endsWith("/play")
          ? store.get(key(id, "play"))
            ? "pause"
            : "play"
          : offered.find((a) => ["press", "select", "toggle", "dismiss"].includes(a.action))?.action;
      return action ? act({ address, action }) : fail(0, "not_actionable", "No press action at this address");
    },
    get openSheet() {
      return openSheet;
    },
    get confirmation() {
      return confirmation;
    },
    snapshotScreen: () => liveScreen(store.snapshot(), openSheet),
    read() {
      if (confirmation)
        return `screen ${screen.id}\nconfirm ${JSON.stringify(confirmation.message)} [confirm/confirm press] ${JSON.stringify(confirmLabel)} [confirm/cancel dismiss] ${JSON.stringify(cancelLabel)}`;
      const visible = liveScreen(store.snapshot(), openSheet, Boolean(openSheet));
      return [
        readScreen(visible, defs, store.snapshot()),
        ...visible.components
          .filter((entry) => store.get(key(entry.id, "error")))
          .map((entry) => `${entry.id} ${mediaUnavailable}`),
      ].join("\n");
    },
    reset() {
      openSheet = undefined;
      confirmation = undefined;
      for (const [id, session] of sessions) {
        session.pause();
        session.seek(Number(inputOf(sourceOf(id)!).at ?? 0));
      }
      store.reset();
    },
    dispose() {
      disposed = true;
      for (const session of sessions.values()) session.dispose();
      sessions.clear();
    },
  };
}
export type ScreenController = ReturnType<typeof createScreenController>;
