import {
  affordancesOf,
  liveProps,
  resolveDefinition,
  photo,
  clip,
  limitAt,
  migrateScreen,
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
import { createInteractionStore, type InteractionStore } from "./store";
import { controlStep, selectedStep } from "./control-step";
import { projectScreen, valueKey, type TimerState } from "./live-screen";
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
  store?: InteractionStore | undefined;
  now?: (() => number) | undefined;
  onChange?: ((screen: ScreenLike, values: Values) => void) | undefined;
  onSend?: ((text: string, address: string) => void) | undefined;
  requestPhoto?: ((address: string) => Promise<string | undefined>) | undefined;
  interactive?: boolean | undefined;
  requireMounted?: boolean | undefined;
  onLink?: ((goto: string, address: string) => void) | undefined;
  onAction?: ((step: ActStep) => void) | undefined;
}) {
  const { defs } = options;
  const migrated = migrateScreen(options.screen);
  const screen: ScreenLike = {
    ...migrated,
    components: migrated.components.map((entry) => ({
      ...entry,
      c: resolveDefinition(defs, entry.c)?.meta.id ?? entry.c,
    })),
  };
  const now = options.now ?? Date.now;
  const store = options.store ?? createInteractionStore();
  const initial: Values = {};
  for (const entry of screen.components) {
    const { id, c, state: _state, ...raw } = entry;
    const input = defs[c]?.props.safeParse(raw);
    if (!input?.success) continue;
    const value = input.data as Values;
    initial[valueKey(screen.id, id, "$runtime")] = true;
    if (c === "Timer" && value.style !== "until")
      initial[valueKey(screen.id, id, "$timer")] = {
        running: false,
        from: now(),
        seconds: Number(value.seconds),
      } satisfies TimerState;
    if (c === "List" && value.style === "expand")
      (value.rows as Values[]).forEach((_row, index) => {
        initial[valueKey(screen.id, id, `r${index + 1}`)] = false;
      });
  }
  const valuesOf = () => ({ ...initial, ...store.snapshot() });
  const localValues = (values: Values) =>
    Object.fromEntries(
      Object.entries(values).map(([address, value]) => [address.replace(`${screen.id}/`, ""), value]),
    );
  const sessions = new Map<string, MediaSession>();
  const mounted = new Map<string, symbol>();
  let openSheet = store.get(`${screen.id}/$sheet`) as string | undefined;
  let confirmation = store.get(`${screen.id}/$confirmation`) as Confirmation | undefined;
  let clock: ReturnType<typeof setInterval> | undefined;
  let disposed = false;
  const key = (id: string, part: string) => `${screen.id}/${id}/${part}`;
  const fail = (at: number, code: string, hint: string): ActReply => ({ ok: false, at, code, hint });
  const relative = (address: string) => address.replace(`${screen.id}/`, "").replace(/\/root$/, "");
  const sourceOf = (id: string) => screen.components.find((entry) => entry.id === id);
  const inputOf = (entry: ScreenComponent) => {
    const { id: _id, c: _c, state: _state, ...input } = entry;
    return defs[entry.c]!.props.parse(input) as Values;
  };
  const liveScreen = (values: Values, sheet: string | undefined, covered = false): ScreenLike => {
    const projected = projectScreen(screen, defs, values, now(), sheet);
    return covered
      ? { ...projected, components: projected.components.filter((entry) => entry.id === sheet) }
      : projected;
  };
  const notifyChange = () =>
    options.onChange?.(projectScreen(screen, defs, valuesOf(), now(), openSheet, true), store.snapshot());
  const needsClock = () =>
    screen.components.some(
      (entry) =>
        entry.c === "Timer" &&
        ((store.get(key(entry.id, "$timer")) as TimerState | undefined)?.running ||
          (entry.style === "until" && new Date(`${entry.until}T${entry.at ?? "00:00"}`).getTime() > now())),
    );
  function tick() {
    if (disposed) return;
    const values = valuesOf();
    const current = projectScreen(screen, defs, values, now(), openSheet, true);
    let changed = false;
    for (const entry of current.components)
      if (entry.c === "Timer") {
        const timer = values[key(entry.id, "$timer")] as TimerState | undefined;
        if (timer?.running) {
          const seconds = Number(entry.seconds);
          if (values[key(entry.id, "$seconds")] !== seconds) {
            values[key(entry.id, "$seconds")] = seconds;
            changed = true;
          }
          if ((entry.style !== "up" && seconds === 0) || (entry.style === "up" && seconds === 86400)) {
            values[key(entry.id, "$timer")] = { ...timer, running: false, seconds: 0 };
            changed = true;
          }
        }
        if (entry.style === "until" && values[key(entry.id, "$tick")] !== Math.floor(now() / 60000)) {
          values[key(entry.id, "$tick")] = Math.floor(now() / 60000);
          changed = true;
        }
      }
    if (changed) {
      store.setMany(values);
      notifyChange();
    }
    scheduleClock();
  }
  function scheduleClock() {
    if (needsClock() && !clock && !disposed) clock = setInterval(tick, 1000);
    else if ((!needsClock() || disposed) && clock) {
      clearInterval(clock);
      clock = undefined;
    }
  }
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
  function actionsAt(address: string): string[] {
    const local = relative(address),
      id = local.split("/")[0]!;
    if (disposed) return [];
    if (confirmation)
      return local === "confirm/confirm"
        ? ["press"]
        : ["confirm/cancel", "confirm/close"].includes(local)
          ? ["dismiss"]
          : [];
    const entry = liveScreen(valuesOf(), openSheet, Boolean(openSheet)).components.find(
      (item) => item.id === id,
    );
    if (!entry || (entry.state && entry.state !== "filled") || !defs[entry.c]) return [];
    try {
      const props = liveProps(
        defs[entry.c]!.meta,
        stampItemIds(defs[entry.c]!.meta, inputOf(entry)),
        id,
        localValues(valuesOf()),
      );
      return affordancesOf(defs[entry.c]!.meta, props, id)
        .filter((item) => item.address === local)
        .map((item) => item.action);
    } catch {
      return [];
    }
  }
  const pressActions = [
    "press",
    "select",
    "toggle",
    "check",
    "increment",
    "decrement",
    "start",
    "stop",
    "send",
    "dismiss",
  ];
  function act(steps: ActStep | ActStep[], opts: ActOptions = {}): ActReply {
    if (disposed) return fail(0, "not_actionable", "This screen is no longer mounted");
    if (options.interactive === false) return fail(0, "not_interactive", "This screen is a preview");
    const list = Array.isArray(steps) ? steps : [steps];
    if (!list.length) return { ok: true, screen: screen.id, changed: "", dryRun: Boolean(opts.dryRun) };
    let values = valuesOf();
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
      const id = address.split("/")[0]!;
      const entry = active.components.find((item) => item.id === id);
      if (!entry || !defs[entry.c]) return fail(at, "not_actionable", "No component at this address");
      if (entry.state && entry.state !== "filled")
        return fail(at, "not_actionable", "This component is not filled");
      let input: Values;
      try {
        input = inputOf(entry);
      } catch {
        return fail(at, "invalid_value", "This component has invalid props");
      }
      if (entry.c === "Composer" && step.action === "send" && !String(input.value ?? "").trim())
        return fail(at, "disabled", "Write a reply before sending");
      if (entry.c === "Counter" && step.action === "decrement" && Number(input.value) < Number(input.step))
        return fail(at, "disabled", "The counter cannot go below zero");
      const selected = selectedStep({ ...step, address }, entry, input, defs[entry.c]!);
      const plan = planAct(active, defs, values, [selected]);
      if (!plan.ok) return { ...plan, at };
      const introduced =
        (entry.c === "Sheet" && sheet !== openSheet) ||
        (entry.c === "SwipeStack" && values[key(id, "$cursor")] !== store.get(key(id, "$cursor")));
      if (options.requireMounted && !introduced && !mounted.has(address))
        return fail(at, "not_mounted", "This control is not mounted");
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
      const control = controlStep(active, entry, input, defs, values, selected, now());
      if (control.error) return fail(at, control.disabled ? "disabled" : "invalid_value", control.error);
      values = control.values;
      if (step.action === "type") {
        values[`${screen.id}/${address}/$draft`] = undefined;
        values[`${screen.id}/${address}/$error`] = undefined;
      }
      if (control.value !== undefined)
        changes[changes.length - 1] = `${address} ${step.action} = ${JSON.stringify(control.value)}`;
      if (control.send) {
        const message = control.send;
        const conversation = active.components.filter((item) => item.c === "Bubbles").at(-1);
        if (conversation) {
          const maxText = limitAt(defs.Bubbles!, ["messages", "*", "text"]) ?? message.text.length;
          const maxMessages = limitAt(defs.Bubbles!, ["messages"], "maxItems") ?? Number.MAX_SAFE_INTEGER;
          values[key(conversation.id, "$messages")] = [
            ...(conversation.messages as Values[]),
            { from: "me", text: clip(message.text, maxText) },
          ].slice(-maxMessages);
        }
        effects.push(() => options.onSend?.(message.text, message.address));
      }
      if (control.requestPhoto && options.requestPhoto) {
        const target = control.requestPhoto;
        effects.push(() => {
          void options.requestPhoto!(target)
            .then((reference) => {
              if (disposed || reference === undefined) return;
              if (!photo.safeParse(reference).success) {
                store.set(key(id, "error"), "Invalid photo reference");
                return;
              }
              store.set(target, reference);
              notifyChange();
            })
            .catch((error: unknown) => {
              if (!disposed)
                store.set(key(id, "error"), error instanceof Error ? error.message : "Photo unavailable");
            });
        });
      }
      if (entry.c === "Sheet" && ["dismiss", "press"].includes(step.action)) sheet = undefined;
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
    values[`${screen.id}/$sheet`] = sheet;
    values[`${screen.id}/$confirmation`] = confirm;
    values[`${screen.id}/$agentMode`] = Boolean(opts.agent);
    store.setMany(values);
    for (const effect of effects) effect();
    scheduleClock();
    notifyChange();
    return reply;
  }
  return {
    defs,
    store,
    act,
    mountMedia,
    tick,
    actionsAt,
    edit(address: string, text: string) {
      const result = act({ address, action: "type", value: text });
      if (!result.ok && result.code === "invalid_value") {
        const full = `${screen.id}/${relative(address)}`;
        store.setMany({ [`${full}/$draft`]: text, [`${full}/$error`]: result.hint ?? "Check this value" });
      }
      return result;
    },
    canPress: (address: string) =>
      actionsAt(address).some((action) => pressActions.includes(action)) ||
      (address.endsWith("/play") && actionsAt(address).includes("play")),
    registerPart(address: string) {
      const local = relative(address),
        token = Symbol(local);
      mounted.set(local, token);
      return () => {
        if (mounted.get(local) === token) mounted.delete(local);
      };
    },
    mount: scheduleClock,
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
      const offered = actionsAt(address);
      const action =
        local.endsWith("/play") && offered.includes("play")
          ? store.get(key(local.split("/")[0]!, "play"))
            ? "pause"
            : "play"
          : offered.find((item) => pressActions.includes(item));
      return action ? act({ address, action }) : fail(0, "not_actionable", "No press action at this address");
    },
    get openSheet() {
      return openSheet;
    },
    get confirmation() {
      return confirmation;
    },
    snapshotScreen: () => liveScreen(valuesOf(), openSheet),
    read() {
      if (confirmation)
        return `screen ${screen.id}\nconfirm ${JSON.stringify(confirmation.message)} [confirm/confirm press] ${JSON.stringify(confirmLabel)} [confirm/cancel dismiss] ${JSON.stringify(cancelLabel)}`;
      const visible = liveScreen(valuesOf(), openSheet, Boolean(openSheet));
      return [
        readScreen(visible, defs, valuesOf()),
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
      store.reset(screen.id);
      scheduleClock();
      notifyChange();
    },
    dispose() {
      disposed = true;
      if (clock) clearInterval(clock);
      clock = undefined;
      for (const session of sessions.values()) session.dispose();
      sessions.clear();
    },
  };
}
export type ScreenController = ReturnType<typeof createScreenController>;
