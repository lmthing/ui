import { StrictMode, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button as GalleryButton, TamaguiProvider, Text, YStack } from "tamagui";
import {
  components,
  signatures,
  type SignatureName,
  type ScreenLike,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import {
  PhoneScreen,
  type ScreenNavigation,
  type ScreenOverlay,
  type ScreenReturnPoint,
  type ScreenTransition,
  type ScreenTransitionRequest,
} from "@lmthing/ui/kit";
import { config } from "../index";

const ringExample = { style: "ring", bars: [{ label: "Watered today", value: 3, of: 5 }] };
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;

export function MotionPreview({ name }: { name: string }) {
  if (name === "record_arrive") return <RecordArrivalPreview />;
  if (name === "journey") return <OnePhoneJourney />;
  if (name === "insertions") return <InsertionPreview />;
  if (name === "navigation" || name === "navigation_mounted" || name === "navigation_agent")
    return (
      <StrictMode>
        <CrossTreePreview mounted={name === "navigation_mounted"} agentBack={name === "navigation_agent"} />
      </StrictMode>
    );
  return <CuePreview name={Object.hasOwn(signatures, name) ? (name as SignatureName) : "ring_fill"} />;
}

const routeNotes = ["Keys collected", "Short lead packed", "Canal towpath open", "Water bowl refilled"];
const firstNote = { id: "early", c: "Note", text: "Pickup confirmed at 13:43 UTC" };
const lastNote = { id: "late", c: "Note", text: "Dispatch added a rain reminder" };

function InsertionPreview() {
  const [step, setStep] = useState(0);
  const notes = routeNotes.map((text, index) => ({ id: `note_${index}`, c: "Note", text }));
  const body =
    step === 0 ? notes : step % 2 ? [firstNote, ...notes, lastNote] : [lastNote, ...notes, firstNote];
  const screen: ScreenLike = {
    id: "route_notes",
    components: [
      { id: "header", c: "Header", title: "Clover’s route notes" },
      ...body,
      { id: "advance", c: "Button", label: "Update route notes" },
    ],
  };
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <YStack width="100%" maxWidth={390} height="100vh" alignSelf="center">
        <PhoneScreen screen={screen} theme={theme} onAction={() => setStep((value) => value + 1)} />
      </YStack>
    </TamaguiProvider>
  );
}

function CuePreview({ name }: { name: SignatureName }) {
  const [cue, setCue] = useState(0);
  const spec = signatures[name] ?? signatures.ring_fill;
  const screen = useMemo<ScreenLike>(() => {
    const c = spec.component as keyof typeof components;
    const def = components[c];
    const example =
      spec === signatures.ring_fill
        ? ringExample
        : name === "day_unfold"
          ? components.Timeline.examples[2]
          : def.examples[0];
    return {
      id: "preview",
      components: [
        { id: "h1", c: "Header", title: c },
        { id: "c1", c, ...(example as object) },
        { id: "b1", c: "Button", label: "Replay" },
      ],
    };
  }, [name]);
  const onAction = useCallback((step: { address: string }) => {
    if (step.address === "preview/b1" || step.address === "preview/b1/root") setCue((value) => value + 1);
  }, []);
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <YStack width="100%" maxWidth={430} height="100vh" alignSelf="center">
        <PhoneScreen screen={screen} theme={theme} signature={name} cue={cue} onAction={onAction} />
      </YStack>
    </TamaguiProvider>
  );
}

const receipt = components.HandoffReceipt.examples[1]!;
type ArrivalPhase = "waiting" | "received" | "returned";
const dispatchSummary: Record<ArrivalPhase, string> = {
  waiting: "The walker sent the notes. Dispatch still needs to acknowledge them.",
  received: "Dispatch has acknowledged the notes and can review the walk.",
  returned: "Dispatch returned the notes so the walker can add the pickup time.",
};
const dispatchMinute = { waiting: 15, received: 19, returned: 19 };

const pickupTime = "13:43 UTC";
const nextAction = {
  waiting: { label: "Acknowledge walk notes" },
  received: { label: "Review walk notes", goto: "walk_notes" },
  returned: { label: "Add pickup time", goto: "pickup_time" },
} as const;

function handoffScreen(phase: ArrivalPhase, revision = 0): ScreenLike {
  return {
    id: "dispatch",
    components: [
      { id: "header", c: "Header", title: "Dispatch handoff demo" },
      {
        id: "sent",
        c: "Note",
        text: "Walker’s outbox · TROT-92 sent at 14:15 UTC",
        emphasis: "quiet",
      },
      {
        id: "receipt",
        c: "HandoffReceipt",
        ...receipt,
        phase,
        at: new Date(Date.UTC(2026, 10, 27, 14, dispatchMinute[phase] + 6 * revision)).toISOString(),
        summary:
          revision && phase !== "returned"
            ? `Pickup corrected to ${pickupTime}. ${
                phase === "waiting" ? "Awaiting dispatch acknowledgment." : "Dispatch acknowledged the notes."
              }`
            : dispatchSummary[phase],
      },
      {
        id: "next",
        c: "Button",
        ...nextAction[phase],
      },
      ...(phase === "waiting"
        ? [{ id: "return", c: "Button", label: "Return to walker", emphasis: "quiet" }]
        : []),
    ],
  };
}

function walkNotesScreen(revision = 0): ScreenLike {
  return {
    id: "walk_notes",
    components: [
      { id: "header", c: "Header", style: "back", title: "Clover’s walk notes", sub: "TROT-92" },
      {
        id: "walk",
        c: "KeyValue",
        pairs: [
          { label: "Leash time", value: "32 min" },
          ...(revision ? [{ label: "Pickup", value: pickupTime }] : []),
          { label: "Route", value: "Canal towpath" },
          { label: "Drop-off", value: "Water bowl refilled" },
        ],
      },
    ],
  };
}

const pickup: ScreenLike = {
  id: "pickup_time",
  components: [
    { id: "header", c: "Header", style: "back", title: "Add pickup time", sub: "Walker · TROT-92" },
    {
      id: "walk",
      c: "KeyValue",
      pairs: [
        { label: "Walk", value: "Clover · Canal towpath" },
        { label: "Recorded start", value: pickupTime },
      ],
    },
    { id: "add", c: "Button", label: `Send ${pickupTime} pickup` },
  ],
};

const dispatch = handoffScreen("received");
const walkNotes = walkNotesScreen();
const previewOnly = (screen: ScreenLike): ScreenLike => ({
  ...screen,
  components: screen.components.filter(({ c }) => c !== "Button"),
});

type JourneyFrame = {
  label: string;
  screen: ScreenLike;
  move?: ScreenTransitionRequest;
  overlay?: ScreenOverlay;
};

const notesWithSheet: ScreenLike = {
  ...walkNotes,
  components: [
    ...walkNotes.components.map((entry) =>
      entry.c === "Header" ? { ...entry, style: undefined, emphasis: "quiet" } : entry,
    ),
    {
      id: "route_details",
      c: "Sheet",
      title: "Canal route details",
      items: [{ label: "Route", value: "Canal towpath" }],
    },
  ],
};
const waiting = previewOnly(handoffScreen("waiting"));
const inboxWithModal: ScreenLike = {
  ...waiting,
  id: "inbox",
  components: [
    ...waiting.components.map((entry) =>
      entry.id === "header" ? { ...entry, title: "Dispatch inbox demo" } : entry,
    ),
    {
      id: "check_receipt",
      c: "Sheet",
      title: "Review TROT-92 handoff",
      items: [{ label: "Recipient", value: "Dispatch" }],
    },
  ],
};
const receiving: ScreenLike = {
  ...dispatch,
  id: "receiving",
  components: previewOnly(dispatch).components.map((entry) =>
    entry.id === "header" ? { ...entry, title: "Record received demo" } : entry,
  ),
};
const receivingRecord = {
  component: "receipt",
  reference: receipt.reference,
  fromRole: receipt.fromRole,
  toRole: receipt.toRole,
};
const journeyFrames: readonly JourneyFrame[] = [
  { label: "Replay journey", screen: waiting },
  { label: "Open walk notes", screen: notesWithSheet, move: { to: notesWithSheet.id, kind: "push" } },
  { label: "Show route sheet", screen: notesWithSheet, overlay: { kind: "sheet", id: "route_details" } },
  { label: "Close route sheet", screen: notesWithSheet },
  { label: "Back to outbox", screen: waiting, move: { to: waiting.id, kind: "pop" } },
  { label: "Switch to inbox", screen: inboxWithModal, move: { to: inboxWithModal.id, kind: "tab" } },
  { label: "Show review dialog", screen: inboxWithModal, overlay: { kind: "modal", id: "check_receipt" } },
  { label: "Dismiss review dialog", screen: inboxWithModal },
  {
    label: "Acknowledge TROT-92",
    screen: receiving,
    move: { to: receiving.id, kind: "record", record: receivingRecord },
  },
];

function OnePhoneJourney() {
  const navigationRef = useRef<ScreenNavigation>(null);
  const [step, setStep] = useState(0);
  const [transition, setTransition] = useState<ScreenTransition>();
  const frame = journeyFrames[step]!;
  const nextStep = (step + 1) % journeyFrames.length;
  const next = journeyFrames[nextStep]!;
  const advance = () => {
    setTransition(next.move && navigationRef.current?.prepare(next.move));
    setStep(nextStep);
  };
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <YStack width="100%" maxWidth={390} height="100vh" alignSelf="center">
        <Text color="$muted" textAlign="center">
          Journey playback · read-only phone preview
        </Text>
        <GalleryButton onPress={advance} accessibilityRole="button">
          {next.label}
        </GalleryButton>
        <YStack flex={1} minHeight={0} data-journey-phone="">
          <PhoneScreen
            screen={frame.screen}
            theme={theme}
            interactive={false}
            navigationRef={navigationRef}
            navigationTransition={transition}
            navigationOverlay={frame.overlay ?? null}
          />
        </YStack>
      </YStack>
    </TamaguiProvider>
  );
}

function useWalkNotesFocus(screen: string, enabled = true) {
  useLayoutEffect(() => {
    if (enabled && screen === "walk_notes" && typeof document !== "undefined")
      document.querySelector<HTMLElement>('[data-testid="walk_notes/header/back"]')?.focus({
        preventScroll: true,
      });
  }, [enabled, screen]);
}

function CrossTreePreview({ mounted, agentBack }: { mounted: boolean; agentBack: boolean }) {
  const inbox = useRef<ScreenNavigation>(null);
  const detail = useRef<ScreenNavigation>(null);
  const origin = useRef<ScreenReturnPoint | undefined>(undefined);
  const [play, setPlay] = useState<{ screen: ScreenLike; transition?: ScreenTransition | undefined }>({
    screen: dispatch,
  });
  useWalkNotesFocus(play.screen.id, !agentBack);
  const onLink = (goto: string, address: string) => {
    const back = goto === "back";
    const source = play.screen === dispatch ? inbox : detail;
    const screen = back ? dispatch : walkNotes;
    if (!back) origin.current = source.current?.getReturnPoint(address);
    const transition = source.current?.prepare({
      to: screen.id,
      kind: back ? "back" : "push",
      address,
      ...(back && origin.current ? { restore: origin.current } : {}),
    });
    setPlay({ screen, transition });
  };
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <YStack width="100%" maxWidth={390} height="100vh" alignSelf="center">
        {[dispatch, walkNotes].map((screen) => {
          const active = play.screen === screen;
          if (!mounted && !active) return null;
          return (
            <YStack key={screen.id} display={active ? "flex" : "none"} flex={1} minHeight={0}>
              <PhoneScreen
                screen={screen}
                theme={theme}
                agentMode={agentBack && screen === walkNotes}
                navigationRef={screen === dispatch ? inbox : detail}
                navigationTransition={active ? play.transition : undefined}
                onLink={onLink}
              />
            </YStack>
          );
        })}
      </YStack>
    </TamaguiProvider>
  );
}

function RecordArrivalPreview() {
  const [phase, setPhase] = useState<ArrivalPhase>("waiting");
  const [route, setRoute] = useState("dispatch");
  const [revision, setRevision] = useState(0);
  useWalkNotesFocus(route);
  const screen = useMemo(
    () =>
      route === "walk_notes"
        ? walkNotesScreen(revision)
        : route === "pickup_time"
          ? pickup
          : handoffScreen(phase, revision),
    [route, phase, revision],
  );
  const onAction = ({ address }: { address: string }) => {
    const [role, part] = address.split("/");
    if (role === "pickup_time" && part === "add") {
      setRevision((current) => current + 1);
      setPhase("waiting");
      setRoute("dispatch");
    }
    if (role !== "dispatch" || phase !== "waiting") return;
    if (part === "next") setPhase("received");
    if (part === "return") setPhase("returned");
  };
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <YStack width="100%" maxWidth={390} height="100vh" alignSelf="center">
        <PhoneScreen
          screen={screen}
          theme={theme}
          signature="record_arrive"
          onLink={(destination) => setRoute(destination === "back" ? "dispatch" : destination)}
          onAction={onAction}
        />
      </YStack>
    </TamaguiProvider>
  );
}
