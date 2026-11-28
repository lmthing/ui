import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { TamaguiProvider, YStack, type TamaguiElement } from "tamagui";
import { durations, themeName, type ActStep, type ThemeChoice } from "@lmthing/ui/catalog";
import { createMemoryParts, PhoneScreen, publishBrowserAgent } from "@lmthing/ui/kit";
import { motionLabScreen, type LabPhase } from "../fixtures/motion-lab";
import { config, resolvePhoto } from "../index";

declare global {
  interface Window {
    motionLabParts?: ReturnType<typeof createMemoryParts>["snapshot"];
  }
}

function useMotionParts() {
  const [parts] = useState(createMemoryParts);
  useEffect(() => {
    window.motionLabParts = parts.snapshot;
    return () => {
      delete window.motionLabParts;
    };
  }, [parts]);
  return parts;
}

function useSaveResultFocus(phase: LabPhase) {
  const phone = useRef<TamaguiElement>(null);
  const requested = useRef(false);
  useLayoutEffect(() => {
    if (phase !== "saved" || !requested.current) return;
    requested.current = false;
    const result = (phone.current as HTMLElement | null)?.querySelector<HTMLElement>(
      '[data-testid="fern/done/title"]',
    );
    if (!result || result.ownerDocument.activeElement !== result.ownerDocument.body) return;
    result.tabIndex = -1;
    result.focus({ preventScroll: true });
  }, [phase]);
  return {
    phone,
    remember: () => {
      requested.current = document.activeElement?.getAttribute("data-testid") === "fern/save/root";
    },
  };
}

export function MotionLab({ lively }: { lively: boolean }) {
  const [route, setRoute] = useState("garden");
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<LabPhase>("ready");
  const [loading, setLoading] = useState(false);
  const [shiftBadge, setShiftBadge] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const parts = useMotionParts();
  const { phone, remember } = useSaveResultFocus(phase);
  useEffect(() => () => clearTimeout(timer.current), []);
  const theme = {
    preset: "calm",
    mode: "light",
    accent: "moss",
    motion: lively ? "lively" : "calm",
  } satisfies ThemeChoice;
  const onLink = (destination: string) => {
    clearTimeout(timer.current);
    setLoading(false);
    setPhase("ready");
    setRoute(destination === "back" ? "garden" : destination);
  };
  const onAction = ({ address }: ActStep) => {
    const [, id] = address.split("/");
    if (id === "today" || id === "advance") setStep((current) => current + 1);
    if (id === "heading" && route === "garden") setShiftBadge((current) => !current);
    if (id === "week") {
      clearTimeout(timer.current);
      setLoading(true);
      timer.current = setTimeout(() => setLoading(false), durations.slow);
    }
    if (id === "error") {
      clearTimeout(timer.current);
      setPhase("error");
    }
    if (id === "save" && phase !== "working") {
      remember();
      setPhase("working");
      timer.current = setTimeout(() => setPhase("saved"), durations.slow * 2);
    }
  };
  return (
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <YStack ref={phone} width="100%" maxWidth={390} height="100vh" alignSelf="center">
        <PhoneScreen
          {...{ theme, onLink, onAction, parts }}
          onReady={publishBrowserAgent}
          screen={motionLabScreen(route, step, phase, loading, shiftBadge)}
          resolvePhoto={(ref) => resolvePhoto(ref, theme)}
        />
      </YStack>
    </TamaguiProvider>
  );
}
