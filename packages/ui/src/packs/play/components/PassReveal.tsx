import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { passRevealCurtain } from "../copy";
import { playWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-PassReveal.generated";

// Core first: Choice/default lets one person pick an option, not pass a veiled secret between players.
export const meta = {
  id: "PassReveal",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "One device hides each player's secret before the handoff, without claiming anti-cheat protection.",
  variants: { media: ["icon", "none"] },
  variantParts: { "media.none": { hides: ["lock"] } },
  parts: [
    "root",
    "card",
    "lock",
    "progress",
    "player",
    "prompt",
    "role",
    "detail",
    "reveal",
    "hide",
    "restart",
    "status",
  ],
  states: ["filled", "empty", "loading", "success"],
  session: {
    kind: "rounds",
    items: "players",
    hidden: ["role", "detail"],
    reveal: "reveal",
    hide: "hide",
    restart: "restart",
    actionProps: (item) => ({ roundOver: !item.name }),
  },
  read: (input, state, lang): string[] => {
    const words = playWordsFor(lang).passReveal;
    if (state === "success") return [words.ready, words.restart];
    if (state !== "filled") return [];
    const value = input as z.output<typeof props> & { [c.sessionKey]?: c.SessionState };
    const round = value[c.sessionKey];
    const name = value.players[0]?.name;
    return round?.kind === "rounds" && round.revealed
      ? [...(name ? [name] : []), value.style === "hold" ? words.release : words.hide]
      : [...passRevealCurtain(name, value.prompt, lang), value.style === "hold" ? words.hold : words.reveal];
  },
  actions: {
    parts: { reveal: ["press", "start", "stop"], hide: ["press"], restart: ["press"] },
    when: {
      "reveal.press": { style: "curtain" },
      "reveal.start": { style: "hold" },
      "reveal.stop": { style: "hold" },
      "hide.press": { style: "curtain" },
      "restart.press": { roundOver: true },
    },
  },
  confirmParts: ["restart"],
  successActions: ["restart.press"],
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  players: z
    .array(
      z.strictObject({
        name: c.text(24),
        role: c.text(32),
        detail: c.text(120).optional(),
        swatch: c.swatch.optional(),
      }),
    )
    .min(3)
    .max(12),
  prompt: c.text(48).optional(),
  style: z.enum(["curtain", "hold"]).default("curtain"),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const role = c.wordsFor(lang).placeholderDetail;
  const players = c.itemsOf(cast, 3).map((item, i) => ({
    name: c.titleOf(item, 24, thing) ?? c.placeholderTitle(i, lang),
    role,
  }));
  while (players.length < 3) players.push({ name: c.placeholderTitle(players.length, lang), role });
  return { players };
}

export const examples = [
  {
    prompt: "Find your garden role",
    players: [
      { name: "Anna", role: "Seed keeper", detail: "Save a seed for the final round.", swatch: "green" },
      { name: "Ben", role: "Rain maker" },
      { name: "Sam", role: "Trail finder" },
    ],
  },
  {
    style: "hold",
    players: [
      { name: "Jo", role: "Leash keeper" },
      { name: "Lee", role: "Route scout" },
      { name: "Kim", role: "Treat keeper" },
    ],
  },
  {
    media: "none",
    players: [
      { name: "Anna", role: "Seed keeper" },
      { name: "Ben", role: "Rain maker" },
      { name: "Sam", role: "Trail finder" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("PassReveal");
export const probes = [
  choose(
    "Pass a single phone around so each player can uncover their own secret role before hiding it again.",
  ),
  choose(
    "Privately pick one of three options with short explanations; nobody else uses the phone.",
    "Choice",
  ),
  write(
    "Deal Anna the Seed keeper, Ben the Rain maker and Sam the Trail finder. Use tap-to-reveal on one phone.",
  ),
  {
    ...write(
      "Deal Anna Gardener, Ben Seed keeper and Sam Rain maker on one phone. Use a text-only privacy curtain without a lock icon.",
    ),
    variant: { axis: "media", value: "none" },
  },
  read("Reveal the secret for the current player", { address: "p1/reveal", action: "press" }),
] satisfies c.Probe[];

type Setup = c.Props<typeof props, typeof meta>;
type Player = Setup["players"][number];
type VisiblePlayer = Omit<Player, "role"> & { role?: string };

function CurtainFace({ player, prompt, icon }: { player: VisiblePlayer; prompt: string; icon: boolean }) {
  return (
    <>
      {icon && <kit.KitIcon part="lock" name="lock" scale="sm" tone="muted" />}
      <kit.KitText part="player" role="heading" emphasis="quiet" align="center">
        {player.name}
      </kit.KitText>
      <kit.KitText part="prompt" role="label" align="center" tone="muted">
        {prompt}
      </kit.KitText>
    </>
  );
}

function SecretFace({ player }: { player: VisiblePlayer }) {
  if (player.role === undefined) return null;
  return (
    <>
      <kit.KitText part="player" role="label" align="center" tone="muted">
        {player.name}
      </kit.KitText>
      {player.swatch ? (
        <kit.KitCard part="role" padded swatch={player.swatch}>
          <kit.KitText part={null} role="heading" align="center">
            {player.role}
          </kit.KitText>
        </kit.KitCard>
      ) : (
        <kit.KitText part="role" role="heading" align="center">
          {player.role}
        </kit.KitText>
      )}
      {player.detail && (
        <kit.KitText part="detail" role="label" align="center">
          {player.detail}
        </kit.KitText>
      )}
    </>
  );
}

function PendingCurtain({
  icon,
  player,
  prompt,
  label,
}: {
  icon: boolean;
  player: VisiblePlayer;
  prompt: string;
  label: string;
}) {
  return (
    <kit.KitFlip
      part="card"
      target={{ part: null }}
      flipped={false}
      label={label}
      back={null}
      front={
        <>
          {icon && <kit.KitIcon name="lock" scale="sm" decorative loading />}
          <kit.KitSkeleton
            shape="figure"
            centered
            inset="none"
            content={[
              ["label", player.name],
              ["label", prompt],
            ]}
          />
          <kit.KitSkeleton shape="figure" centered inset="none" content={[["label", label]]} />
        </>
      }
    />
  );
}

function RevealCard({
  input,
  current,
}: {
  input: Setup;
  current: Extract<c.SessionState, { kind: "rounds" }>;
}) {
  const {
    lang,
    words: { passReveal: words },
  } = kit.useWords(playWordsFor);
  const media = kit.useVariant("media", meta.variants.media, input.media);
  const loading = kit.useComponentState() === "loading";
  const hold = input.style === "hold";
  const player = current.item as VisiblePlayer;
  const tapOpen = !hold && current.revealed;
  const label = hold ? (current.revealed ? words.release : words.hold) : words.reveal;
  const curtain = { player, prompt: input.prompt ?? words.prompt, icon: media === "icon" };
  const step = words.progress(
    c.numberLine(current.index + 1, lang),
    c.numberLine(input.players.length, lang),
  );
  return (
    <kit.KitContent group="response">
      <kit.KitLayoutText
        line={{ text: step, role: "meta", tone: "muted", part: "progress" }}
        align="center"
      />
      {loading ? (
        <PendingCurtain {...curtain} label={label} />
      ) : (
        <kit.KitFlip
          part="card"
          target={{ part: tapOpen ? null : "reveal" }}
          mode={hold ? "hold" : "press"}
          front={<CurtainFace {...curtain} />}
          back={current.revealed ? <SecretFace player={player} /> : null}
          flipped={current.revealed}
          label={label}
        />
      )}
      {tapOpen && !loading && (
        <kit.KitContent group="response">
          <kit.KitAction part="hide" action="press" label={words.hide} contentParts={{}} full />
        </kit.KitContent>
      )}
    </kit.KitContent>
  );
}

export function PassReveal(input: Setup) {
  const { screen, component, state } = kit.usePartContext();
  const {
    words: { passReveal: words },
  } = kit.useWords(playWordsFor);
  const { controller } = kit.useKit();
  const saved = kit.useControlValue<unknown>(`${screen}/${component}/${c.sessionKey}`, undefined);
  const current = c.sessionState(meta, input, () => saved);
  const empty = state === "empty" || current?.kind !== "rounds";
  const complete =
    !empty && state !== "loading" && (current.complete || (!controller && state === "success"));
  return (
    <kit.KitCard part="root" style="plain">
      {empty ? (
        <kit.KitCard part="card" padded>
          <kit.KitEmpty part="status" title={words.empty} icon="users" decorativeIcon />
        </kit.KitCard>
      ) : complete ? (
        <kit.KitContent group="response" align="center">
          <kit.KitEmpty
            part="status"
            title={words.ready}
            prominence="heading"
            icon="check"
            tone="good"
            announce="status"
            decorativeIcon
          />
          <kit.KitAction
            part="restart"
            action="press"
            kind="quiet"
            tone="neutral"
            label={words.restart}
            contentParts={{}}
            full
          />
        </kit.KitContent>
      ) : (
        <RevealCard {...{ input, current }} />
      )}
    </kit.KitCard>
  );
}
