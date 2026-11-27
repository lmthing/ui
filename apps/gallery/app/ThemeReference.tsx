import { useLayoutEffect, useRef, useState } from "react";
import { TamaguiProvider, Text, XStack, YStack } from "tamagui";
import {
  accents,
  presets,
  space,
  themeName,
  themeRoles,
  type ScreenLike,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { PhoneScreen } from "@lmthing/ui/kit";
import { config } from "../index";
import { themeReferenceScreens } from "./theme-reference-screens";

const width = 390;
const height = 576;

const varietyTheme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const shows = [
  {
    id: "glass",
    title: "The Glass Menagerie",
    curtain: "Fri 7:30 pm",
    seats: "12 seats left",
    stage: "Main stage",
    photo: "lib:glass",
    note: "The box office releases unclaimed seats 10 minutes before curtain.",
  },
  {
    id: "dream",
    title: "Twelfth Night",
    curtain: "Sat 8 pm",
    seats: "Sold out",
    stage: "Studio stage",
    photo: "lib:dream",
    note: "No seats remain for this performance. Check with the box office for returns.",
  },
] as const;

const repairs = [
  {
    id: "cargo",
    title: "Longtail cargo bike",
    bay: "RC-184 · Bay 2",
    status: "Parts hold",
    eta: "11:00 am",
    tone: "warn",
    note: "Rear brake cable due at 10:20. The pickup estimate assumes it arrives on time.",
  },
  {
    id: "commuter",
    title: "Belt-drive commuter bike",
    bay: "RC-207 · Bay 4",
    status: "In repair",
    eta: "10:35 am",
    tone: "neutral",
    note: "Belt tension is set. The wheel alignment check is next.",
  },
] as const;

function repairStatus(repair: (typeof repairs)[number], layout: string | null) {
  return layout === "long" && repair.id === "cargo" ? "Waiting for brake cable" : repair.status;
}

// Two abstract stage posters, made of simple shapes so the comparison has no remote image dependency.
function poster(ref: string) {
  const roles = themeRoles(
    presets.find(({ id }) => id === varietyTheme.preset)!,
    accents.find(({ id }) => id === varietyTheme.accent)!,
    varietyTheme.mode,
  );
  const border = `<path d="M12 139V26Q60 5 108 26V139Z" fill="none" stroke="${roles.accentSoft}"/>`;
  const glass = `<path d="M24 116L61 30l35 86Z" fill="${roles.accentSoft}"/><path d="M61 30v86H24Z" fill="${roles.accent}"/><path d="M24 116h72L61 92Z" fill="${roles.surface}"/>`;
  const dream = `<path d="M80 38a33 33 0 1 0 8 54A34 34 0 0 1 80 38Z" fill="${roles.accentSoft}"/><path d="M9 139l29-34 11 14 21-21 41 41Z" fill="${roles.accent}"/>`;
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150"><rect width="120" height="150" fill="${roles.text}"/>${border}${ref === "lib:glass" ? glass : dream}</svg>`,
  )}`;
}

function theater(layout: string | null): ScreenLike {
  const header = {
    id: "heading",
    c: "Header",
    title: "This weekend on stage",
    sub: "27–28 Nov · Curtain times",
    emphasis: "quiet",
  };
  if (layout === "quiet" || layout === "normal" || layout === "hero")
    return {
      id: "theater",
      components: [
        header,
        ...shows.map(({ id, title, curtain, seats, stage, photo }) => ({
          id: `show_${id}`,
          c: "Card",
          title,
          body: `${curtain} · ${stage}`,
          meta: seats,
          emphasis: layout === "hero" && id !== "glass" ? "normal" : layout,
          media: "thumb",
          photo,
          goto: id,
        })),
      ],
    };
  return {
    id: "theater",
    components: [
      header,
      {
        id: "shows",
        c: "List",
        style: "shelf",
        aspect: "tall",
        rows: shows.map(({ id, title, curtain, seats, stage, photo }) => ({
          title,
          meta: `${curtain} · ${stage}`,
          fact: seats,
          photo,
          trail: "chevron",
          goto: id,
        })),
      },
    ],
  };
}

function dispatch(layout: string | null): ScreenLike {
  return {
    id: "dispatch",
    components: [
      {
        id: "heading",
        c: "Header",
        title: "Repair dispatch",
        sub: "27 Nov pickup ETAs · Open a job",
        emphasis: "quiet",
      },
      {
        id: "jobs",
        c: "List",
        lead: "icon",
        trail: layout === "badge" ? "badge" : "value",
        rows: repairs.map((repair) => {
          const { id, title, bay, eta, tone } = repair;
          const status = repairStatus(repair, layout);
          return {
            title,
            meta: bay,
            icon: "chevron_right",
            goto: id,
            ...(layout === "badge"
              ? { fact: eta, value: status }
              : layout === "value"
                ? { fact: status, value: eta }
                : { badge: status, value: eta, tone }),
          };
        }),
      },
    ],
  };
}

function recordScreen(id: string, layout: string | null): ScreenLike | undefined {
  const show = shows.find((entry) => entry.id === id);
  const repair = repairs.find((entry) => entry.id === id);
  if (!show && !repair) return;
  const record = show ?? repair!;
  const facts = show
    ? [
        { label: "Curtain", value: show.curtain },
        { label: "Stage", value: show.stage },
        { label: "Seats", value: show.seats, status: true, tone: id === "dream" ? "warn" : "good" },
      ]
    : [
        { label: "Work order", value: repair!.bay },
        { label: "Status", value: repairStatus(repair!, layout), status: true, tone: repair!.tone },
        { label: "Pickup ETA", value: repair!.eta },
      ];
  return {
    id,
    components: [
      { id: "heading", c: "Header", title: record.title, style: "back" },
      { id: "facts", c: "KeyValue", lead: "none", pairs: facts },
      { id: "note", c: "Note", text: record.note, emphasis: "quiet" },
    ],
  };
}

function VarietyReference({ domain }: { domain: "theater" | "dispatch" }) {
  const query = new URLSearchParams(globalThis.location?.search ?? "");
  const layout = query.get("layout");
  const [home] = useState(() => (domain === "theater" ? theater(layout) : dispatch(layout)));
  const [record, setRecord] = useState<ScreenLike>();
  const frame = useRef<HTMLDivElement>(null);
  const opener = useRef<string | undefined>(undefined);
  const focusNext = useRef<string | undefined>(undefined);
  const onLink = (destination: string, address: string) => {
    if (destination === "back") {
      focusNext.current = opener.current;
      setRecord(undefined);
    } else {
      const next = recordScreen(destination, layout);
      if (!next) return;
      opener.current = address;
      focusNext.current = `${next.id}/heading/back`;
      setRecord(next);
    }
  };
  useLayoutEffect(() => {
    const address = focusNext.current;
    if (address) {
      // Controller links may omit the root suffix that the mounted control includes.
      const target = [address, `${address}/root`]
        .map((part) => frame.current?.querySelector<HTMLElement>(`[data-testid="${CSS.escape(part)}"]`))
        .find(Boolean);
      target?.focus();
      focusNext.current = undefined;
    }
  }, [record]);
  const screen = record ?? home;
  return (
    <TamaguiProvider config={config} defaultTheme={themeName(varietyTheme)}>
      <div ref={frame} data-variety-screen={screen.id}>
        <YStack width="100%" maxWidth={width} height="100vh" alignSelf="center" data-look-frame={screen.id}>
          <PhoneScreen screen={screen} theme={varietyTheme} resolvePhoto={poster} onLink={onLink} />
        </YStack>
      </div>
    </TamaguiProvider>
  );
}

function ReferencePhone({ screen, theme }: { screen: ScreenLike; theme: ThemeChoice }) {
  return (
    <YStack
      width={width}
      height={height}
      data-reference-phone={screen.id}
      data-look-frame={`${theme.preset}/${screen.id}`}
    >
      <PhoneScreen screen={screen} theme={theme} reduceMotion />
    </YStack>
  );
}

export function ThemeReference({ mode, screenId }: { mode: "light" | "dark"; screenId: string | null }) {
  if (screenId === "theater" || screenId === "dispatch") return <VarietyReference domain={screenId} />;
  const screens = screenId
    ? themeReferenceScreens.filter((screen) => screen.id === screenId)
    : themeReferenceScreens;
  return (
    <TamaguiProvider config={config} defaultTheme={themeName({ preset: "calm", mode, accent: "moss" })}>
      <YStack padding={space.lg} gap={space.sm} backgroundColor="$bg" data-theme-reference={mode}>
        <Text color="$text" fontSize={24} fontWeight="700">
          {`Theme reference · ${mode}`}
        </Text>
        <Text color="$muted" fontSize={16}>
          {screenId ? `${screenId} · Moss accent` : "List / Dashboard / Form · Moss accent"}
        </Text>
        <XStack
          flexWrap="wrap"
          gap={space.lg}
          width={screenId ? 4 * width + 3 * space.lg : undefined}
          style={screenId ? undefined : { zoom: 0.36 }}
        >
          {presets.map(({ id }) => (
            <YStack key={id} data-reference-preset={id} gap={space.sm}>
              <Text color="$text" fontSize={screenId ? 18 : 42} fontWeight="700">
                {id}
              </Text>
              <XStack gap={space.sm}>
                {screens.map((screen) => (
                  <ReferencePhone
                    key={screen.id}
                    screen={screen}
                    theme={{ preset: id, mode, accent: "moss" }}
                  />
                ))}
              </XStack>
            </YStack>
          ))}
        </XStack>
      </YStack>
    </TamaguiProvider>
  );
}
