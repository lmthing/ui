import { StrictMode, useCallback, useMemo, useRef, useState } from "react";
import { TamaguiProvider, YStack } from "tamagui";
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
  type ScreenReturnPoint,
  type ScreenTransition,
} from "@lmthing/ui/kit";
import { config } from "../index";

const ringExample = { style: "ring", bars: [{ label: "Watered today", value: 3, of: 5 }] };
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;

export function MotionPreview({ name }: { name: string }) {
  if (name === "record_arrive") return <RecordArrivalPreview />;
  if (name === "insertions") return <InsertionPreview />;
  if (name === "navigation")
    return (
      <StrictMode>
        <CrossTreePreview />
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
const dispatchTime = {
  waiting: receipt.at,
  received: "2026-11-27T14:19:00Z",
  returned: "2026-11-27T14:19:00Z",
};

const pickupTime = "13:43 UTC";
const nextAction = {
  waiting: { label: "Acknowledge walk notes" },
  received: { label: "Review walk notes", goto: "walk_notes" },
  returned: { label: "Add pickup time", goto: "pickup_time" },
} as const;

function handoffScreen(phase: ArrivalPhase, pickupAdded = false): ScreenLike {
  return {
    id: "dispatch",
    components: [
      { id: "header", c: "Header", title: "Dispatch handoff" },
      { id: "outbox", c: "SectionTitle", text: "Walker’s outbox" },
      { id: "sent", c: "Note", text: "TROT-92 · Walk notes sent at 14:15 UTC" },
      { id: "inbox", c: "SectionTitle", text: "Dispatch inbox" },
      {
        id: "receipt",
        c: "HandoffReceipt",
        ...receipt,
        phase,
        at: dispatchTime[phase],
        summary:
          pickupAdded && phase === "waiting"
            ? `The walker added the ${pickupTime} pickup. Dispatch has not acknowledged it.`
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

const walkNotes: ScreenLike = {
  id: "walk_notes",
  components: [
    { id: "header", c: "Header", style: "back", title: "Clover’s walk notes", sub: "TROT-92" },
    {
      id: "walk",
      c: "KeyValue",
      pairs: [
        { label: "Leash time", value: "32 min" },
        { label: "Route", value: "Canal towpath" },
        { label: "Drop-off", value: "Water bowl refilled" },
      ],
    },
  ],
};

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
    { id: "add", c: "Button", label: `Use ${pickupTime}` },
  ],
};

function CrossTreePreview() {
  const source = useRef<ScreenNavigation>(null);
  const origin = useRef<ScreenReturnPoint | undefined>(undefined);
  const [play, setPlay] = useState<{ screen: ScreenLike; transition?: ScreenTransition | undefined }>({
    screen: handoffScreen("received"),
  });
  const onLink = (goto: string, address: string) => {
    const back = goto === "back";
    const screen = back ? handoffScreen("received") : walkNotes;
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
        <PhoneScreen
          key={play.screen.id}
          screen={play.screen}
          theme={theme}
          navigationRef={source}
          navigationTransition={play.transition}
          onLink={onLink}
        />
      </YStack>
    </TamaguiProvider>
  );
}

function RecordArrivalPreview() {
  const [phase, setPhase] = useState<ArrivalPhase>("waiting");
  const [route, setRoute] = useState("dispatch");
  const [pickupAdded, setPickupAdded] = useState(false);
  const screen = useMemo(
    () =>
      route === "walk_notes"
        ? walkNotes
        : route === "pickup_time"
          ? pickup
          : handoffScreen(phase, pickupAdded),
    [route, phase, pickupAdded],
  );
  const onAction = ({ address }: { address: string }) => {
    const [role, part] = address.split("/");
    if (role === "pickup_time" && part === "add") {
      setPickupAdded(true);
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
