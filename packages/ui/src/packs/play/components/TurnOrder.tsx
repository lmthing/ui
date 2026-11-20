import { z } from "zod";
// prettier-ignore
import {
  itemsOf, photo, placeholderTitle, probesFor, sessionAvailable, sessionKey, sessionState,
  text, thingOf, titleOf, variantProps, type FallbackInput, type Meta, type Probe, type Props, type SessionState,
} from "../../../catalog";
import * as kit from "../../../kit";
import { turnOrderLines } from "../copy";
import { playWordsFor } from "../lang";
// Core first: People/default cannot track a game turn cursor, laps, skips or reversed direction.
// prettier-ignore
export const meta = {
  id: "TurnOrder", status: "ready", group: "data",
  purpose: "Track the current game player, lap and direction with next, skip and reverse.",
  pick: "Game turns, laps and play direction. Not a plain roster (People), scheduled events (Timeline), or rotating household duties (Turns).",
  writeHints: [
    "first is a zero-based index into players. Optional laps bounds the game; omit it for open-ended rotation. Never write current player, lap, completed turns or skips.",
    'Use detail "brief" only when asked to hide the lap and direction line. Leave unrequested axes null.',
  ],
  region: "body", weight: 2, tier: "phone",
  confirmParts: ["restart"],
  realPath: "An ordered roster and turn events live on one device without accounts or remote replies.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["lap"] } },
  items: { key: "players", parts: ["root", "name", "photo"] },
  parts: ["root", "current", "lap", "next", "skip", "reverse", "restart"],
  states: ["filled", "loading", "success"],
  session: {
    kind: "turns", items: "players", first: "first", direction: "direction", laps: "laps",
    next: "next", skip: "skip", reverse: "reverse", restart: "restart",
  },
  actions: { parts: { next: ["press"], skip: ["press"], reverse: ["press"], restart: ["press"] } },
  successActions: ["restart.press"],
  read: (input, state, lang): string[] => {
    const value = input as z.output<typeof props> & { [sessionKey]?: SessionState };
    const current = value[sessionKey];
    if (current?.kind !== "turns") return [];
    const { status, player, lap } = turnOrderLines(value, current, state === "success", lang);
    const words = playWordsFor(lang).turnOrder;
    return [
      status,
      player,
      ...(value.detail === "brief" ? [] : [lap]),
      ...availableParts(current, state === "success").map((part) => words[part]),
    ];
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    players: z
      .array(z.strictObject({ name: text(24), photo: photo.optional() }))
      .min(2)
      .max(6),
    first: z.int().min(0).max(5).default(0),
    direction: z.enum(["forward", "reverse"]).default("forward"),
    laps: z.int().min(1).max(12).optional(),
    style: z.enum(["ring", "queue"]).default("ring"),
  })
  .refine(({ players, first }) => first < players.length, {
    path: ["first"],
    message: "First must index an existing player",
  });
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const players = itemsOf(cast, 3).map((item, index) => ({
    name: titleOf(item, 24, thing) ?? placeholderTitle(index, lang),
  }));
  while (players.length < 2) players.push({ name: placeholderTitle(players.length, lang) });
  return { players };
}
const roster = [{ name: "Anna", photo: "lib:people" }, { name: "Ben" }, { name: "Sam" }];
export const examples = [
  { players: roster, laps: 2, style: "ring" },
  { players: [{ name: "Jo" }, { name: "Lee" }], first: 1, direction: "reverse", style: "queue" },
  { players: roster, laps: 2, detail: "brief" },
  { players: roster, laps: 2, density: "compact" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("TurnOrder");
export const probes = [
  choose("Show whose game turn it is, advance or skip a turn, reverse order and stop after two laps"),
  choose("Show a plain roster of people with names and photos, without a turn cursor or game laps", "People"),
  write("Anna, Ben and Sam take turns for two laps; Ben starts, forward direction, displayed as a queue"),
  {
    ...write(
      "Anna, Ben and Sam take turns for two laps. Hide the lap and direction line; keep the roster and turn controls.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Move to the next player's turn", { address: "t1/next", action: "press" }),
  read("Reverse the following play order", { address: "t1/reverse", action: "press" }),
] satisfies Probe[];
type Setup = Props<typeof props, typeof meta>;
type Turns = Extract<SessionState, { kind: "turns" }>;
const turnParts = ["next", "skip", "reverse", "restart"] as const;
const availableParts = (current: Turns, success: boolean) =>
  turnParts.filter((part) => (!success || part === "restart") && sessionAvailable(current, part));
function PlayerAvatar({ player: { photo, name } }: { player: Setup["players"][number] }) {
  const image = photo && photo !== "lib:people" ? { photo } : { initials: Array.from(name)[0]! };
  return <kit.KitPhoto {...image} shape="round" part="photo" label={name} />;
}
type Actions = {
  current: Turns;
  loading: boolean;
  success: boolean;
  queue: boolean;
  density: Setup["density"];
};
function TurnActions({ current, loading, success, queue, density }: Actions) {
  const { KitAction, KitContent, KitGrid, KitRow, KitSkeleton, KitText } = kit;
  const { words } = kit.useWords(playWordsFor);
  const controls = availableParts(current, success).map((part) => {
    const label = words.turnOrder[part];
    if (part === "next" || success)
      return loading ? (
        <KitSkeleton key={part} shape="control" label={label} full />
      ) : (
        <KitAction key={part} part={part} label={label} action="press" full />
      );
    const role = loading ? "text" : "button";
    const target = { role, part: loading ? null : part, label: loading ? "" : label } as const;
    return (
      <KitRow key={part} {...target} surface="outlined" inline density={density}>
        <KitContent inset="md">
          {loading ? (
            <KitSkeleton shape="figure" centered inset="none" content={[["label", label]]} />
          ) : (
            <KitText part={null} role="label" align="center" children={label} />
          )}
        </KitContent>
      </KitRow>
    );
  });
  if (success) return controls;
  const group = queue ? "response" : "content";
  return (
    <KitContent group={group} density={density}>
      <KitContent group={group} density={density}>
        <KitGrid density={density}>{controls}</KitGrid>
      </KitContent>
    </KitContent>
  );
}

// prettier-ignore
export function TurnOrder(setup: Setup) {
  const { KitContent, KitOrbit, KitSkeleton, KitText } = kit;
  const { players, style, detail: shown } = setup;
  const density = kit.useVariant("density", meta.variants.density, setup.density);
  const { screen, component } = kit.usePartContext();
  const { lang } = kit.useWords(playWordsFor);
  const state = kit.useComponentState();
  const stored = kit.useControlValue<unknown>(`${screen}/${component}/${sessionKey}`, undefined);
  const current = sessionState(meta, setup, (part) => (part === sessionKey ? stored : undefined));
  if (current?.kind !== "turns") return null;
  const loading = state === "loading";
  const success = state === "success";
  // Static previews can request the success state without replaying a game.
  const display = success && !current.complete ? { ...current, lap: setup.laps ?? current.lap } : current;
  const { status, player, lap } = turnOrderLines(setup, display, success, lang);
  const hero = { role: "title", tone: "text" } as const;
  const detail = { role: "label", tone: "muted" } as const;
  const count = { role: "number", numberScale: "compact", tone: "muted" } as const;
  const loadingLines: NonNullable<Parameters<typeof KitSkeleton>[0]["content"]> = [["label", status], ["title", player]];
  if (shown !== "brief") loadingLines.push(["number", lap, "center", "compact"]);
  return (
    <KitContent density={density}>
      <KitContent align="center" density={density}>
        {loading ? (
          <KitSkeleton shape="figure" centered inset="none" content={loadingLines} />
        ) : (
          <>
            <KitText {...(success ? hero : detail)} align="center" part={null} children={status} />
            <KitText {...(success ? detail : hero)} {...{ density }} align="center" part="current" children={player} />
            {shown !== "brief" && <KitText {...count} align="center" part="lap" children={lap} />}
          </>
        )}
      </KitContent>
      <KitContent group="response" density={density}>
        <KitOrbit
          part="root"
          nodes={players.map((player) => ({
            id: player.id,
            label: player.name,
            content: <PlayerAvatar player={player} />,
          }))}
          at={success ? "" : (players[current.index]?.id ?? "")}
          reverse={current.direction === "reverse"}
          style={style}
          loading={loading}
          namePart
        />
      </KitContent>
      <TurnActions {...{ current, loading, success, density }} queue={style === "queue"} />
    </KitContent>
  );
}
