import { useRef, useState } from "react";
import { TamaguiProvider, YStack } from "tamagui";
import {
  accents,
  components,
  presets,
  themeName,
  type ScreenLike,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { PhoneScreen, type AttachmentHost, type HostCommandAdapter } from "@lmthing/ui/kit";
import { config } from "../index";
import { resolvePhoto } from "./photos";
const header = { id: "h1", c: "Header", title: "Try the controls" };
const button = { id: "b1", c: "Button", label: "Save" };
const note = { id: "n1", c: "Note", text: "Make your choice." };
const choices = [
  { title: "Weekly", sub: "Five walks each week", value: "£65" },
  { title: "Single", sub: "One walk when needed", value: "£18" },
];
const tabs = [
  { icon: "home", label: "Home", goto: "home" },
  { icon: "message", label: "Inbox", goto: "inbox", count: 120 },
];
const navigationTabBar = { id: "t1", c: "TabBar", tabs };
const screens: Record<string, ScreenLike> = {
  choice: { id: "controls", components: [header, { id: "c1", c: "Choice", options: choices }, note, button] },
  multi: {
    id: "controls",
    components: [header, { id: "c1", c: "Choice", multi: true, options: choices }, note, button],
  },
  chat: {
    id: "controls",
    components: [
      header,
      { id: "m1", c: "Bubbles", messages: [{ from: "them", text: "See you at nine." }] },
      { id: "c1", c: "Composer", style: "reply", hint: "Reply to Anna", max: 80 },
    ],
  },
  form: {
    id: "controls",
    components: [
      header,
      { id: "f1", c: "Field", label: "Plant name", value: "Fern" },
      { id: "f2", c: "Field", kind: "repeat", label: "Water it", repeat: "daily" },
      { id: "f3", c: "Field", kind: "toggle", label: "Remind me", value: "off" },
      { id: "f4", c: "Field", kind: "slider", label: "Intensity", value: "5" },
      { id: "f5", c: "Field", kind: "number", label: "Days", value: "7" },
      { id: "f6", c: "Field", kind: "date", label: "Date", value: "2026-11-18" },
      { id: "f7", c: "Field", kind: "time", label: "Time", value: "09:00" },
      button,
    ],
  },
  lists: {
    id: "controls",
    components: [
      header,
      { id: "q1", c: "Checklist", items: [{ text: "Water the fern" }, { text: "Walk Clover" }] },
      {
        id: "l1",
        c: "List",
        style: "expand",
        rows: [{ title: "When should I water?", body: "Check the soil first." }],
      },
      { id: "s1", c: "SectionTitle", text: "Reminders" },
      { id: "l2", c: "List", rows: [{ title: "Daily care", trail: "toggle", goto: "care" }] },
      button,
    ],
  },
  numbers: {
    id: "controls",
    components: [
      header,
      { id: "c1", c: "Counter", label: "Water glasses", value: 2, step: 3 },
      { id: "t1", c: "Timer", style: "up", label: "Walk timer", seconds: 0 },
      { id: "s1", c: "Scale", label: "How was it?", value: 3 },
    ],
  },
  navigation: {
    id: "controls",
    components: [
      header,
      { id: "s1", c: "Segmented", options: [{ label: "Today" }, { label: "Week" }], at: 0 },
      { id: "f1", c: "Chips", style: "choose", items: [{ label: "All" }, { label: "Due" }] },
    ],
  },
  calendar: {
    id: "controls",
    components: [
      header,
      { id: "c1", c: "Calendar", style: "month", month: "June", marked: [], days: 30 },
      note,
    ],
  },
  swipe: {
    id: "controls",
    components: [
      header,
      { id: "s1", c: "SwipeStack", cards: [{ title: "Fern" }, { title: "Basil" }, { title: "Monstera" }] },
      note,
    ],
  },
  photo: {
    id: "controls",
    components: [header, { id: "f1", c: "Field", kind: "photo", label: "Plant photo" }, note, button],
  },
  attachment: {
    id: "controls",
    components: [
      { id: "h1", c: "Header", title: "Walk handover" },
      {
        id: "f1",
        c: "Field",
        kind: "file",
        label: "Walk notes",
        hint: "Choose the notes you want to share.",
      },
    ],
  },
  decision: {
    id: "controls",
    components: [
      { id: "h1", c: "Header", title: "Estimate review" },
      {
        id: "a1",
        c: "Approval",
        ...components.Approval.examples.find(
          (example) => example.style === "review" && !example.review?.reason,
        ),
      },
    ],
  },
};
const event = (name: string, detail: unknown) => globalThis.dispatchEvent(new CustomEvent(name, { detail }));
const onSend = (text: string, address: string) => event("gallery-send", { text, address });
const onChange = (screen: ScreenLike, values: Record<string, unknown>) =>
  event("gallery-change", { screen, values });
const requestPhoto = async () => "lib:plants";
function previewWait(signal: AbortSignal, manual: boolean) {
  if (!manual) return new Promise<void>((resolve) => setTimeout(resolve, 1600));
  return new Promise<void>((resolve) => {
    const finish = () => {
      signal.removeEventListener("abort", finish);
      globalThis.removeEventListener("gallery-settle-demo", finish);
      resolve();
    };
    if (signal.aborted) return finish();
    signal.addEventListener("abort", finish, { once: true });
    globalThis.addEventListener("gallery-settle-demo", finish, { once: true });
  });
}

function useDemoAttachments(manual: boolean): AttachmentHost {
  const attempts = useRef(0);
  return {
    canRun: () => true,
    async run({ signal }) {
      const attempt = ++attempts.current;
      await previewWait(signal, manual);
      return signal.aborted || attempt === 1
        ? { status: "rejected" }
        : { status: "accepted", reference: "demo_walk_notes" };
    },
  };
}

function useDemoDecision(manual: boolean): HostCommandAdapter {
  const attempts = useRef(0);
  const handler: NonNullable<HostCommandAdapter["commands"]>[string] = {
    allows: () => true,
    async run({ input }, { signal }) {
      const attempt = ++attempts.current;
      await previewWait(signal, manual);
      return signal.aborted || attempt === 1
        ? { status: "rejected" }
        : { status: "accepted", records: typeof input.reason === "string" ? [{ reason: input.reason }] : [] };
    },
  };
  return { commands: { "approval.accept": handler, "approval.reject": handler } };
}

export function Controls({ kind, query }: { kind: string; query: URLSearchParams }) {
  const [activeTab, setActiveTab] = useState(0);
  const manual = query.has("manual-settle");
  const attachments = useDemoAttachments(manual);
  const decisionHost = useDemoDecision(manual);
  const fixture = screens[kind] ?? screens.form!;
  const screen =
    kind === "navigation"
      ? { ...fixture, components: [...fixture.components, { ...navigationTabBar, at: activeTab }] }
      : fixture;
  const onLink = (goto: string, address: string) => {
    if (kind === "navigation") {
      const index = tabs.findIndex((tab) => tab.goto === goto);
      if (index >= 0) setActiveTab(index);
    }
    event("gallery-link", { goto, address });
  };
  const theme: ThemeChoice = {
    preset: presets.find(({ id }) => id === query.get("preset"))?.id ?? "calm",
    accent: accents.find(({ id }) => id === query.get("accent"))?.id ?? "moss",
    mode: query.get("mode") === "dark" ? "dark" : "light",
  };
  return (
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <YStack width="100%" maxWidth={430} height="100vh" alignSelf="center">
        <PhoneScreen
          screen={screen}
          theme={theme}
          resolvePhoto={(ref) => resolvePhoto(ref, theme)}
          onLink={onLink}
          onSend={onSend}
          onChange={onChange}
          requestPhoto={requestPhoto}
          attachments={kind === "attachment" ? attachments : undefined}
          hostCommands={kind === "decision" ? decisionHost : undefined}
        />
      </YStack>
    </TamaguiProvider>
  );
}
