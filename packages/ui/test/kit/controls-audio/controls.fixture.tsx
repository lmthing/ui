import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { themeName } from "@lmthing/ui/catalog";
import {
  createScreenController,
  KitHoldButton,
  KitMicCapture,
  KitProvider,
  KitRemotePad,
  PartScope,
  type MicCaptureSession,
} from "@lmthing/ui/kit";
import { config } from "../../render";
import { defs, scope, screen, theme } from "./fixture-data";

const log: string[] = [];
let allow: ((session: MicCaptureSession) => void) | undefined;
const controller = createScreenController({
  screen,
  defs,
  requireMounted: true,
  onAction: ({ address, action }) => log.push(`${address} ${action}`),
  micCapture: {
    open(address, signal) {
      log.push(`open ${address}`);
      signal.addEventListener("abort", () => log.push("aborted"), { once: true });
      return new Promise((done) => {
        allow = done;
      });
    },
  },
});
declare global {
  interface Window {
    controlLog: string[];
    allowMic(): void;
    attemptHold(agent: boolean): string;
  }
}
window.controlLog = log;
window.attemptHold = (agent) => {
  const address = "test/hold/hold";
  const reply = agent ? controller.act({ address, action: "press" }, { agent }) : controller.press(address);
  return reply.ok ? "ok" : reply.code;
};
window.allowMic = () => allow?.({ close: (reason) => log.push(`closed ${reason}`) });

const env = {
  insets: { top: 0, left: 0, bottom: 0, right: 0 },
  keyboardHeight: 0,
  reduceMotion: true,
  agentMode: false,
};
function Fixture() {
  const [mode, setMode] = useState<"hold" | "toggle">("hold");
  const [offline, setOffline] = useState(false);
  return (
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <button type="button" onClick={() => setMode("toggle")}>
        Use toggle
      </button>
      <button type="button" onClick={() => setOffline(true)}>
        Go offline
      </button>
      <KitProvider theme={theme} controller={controller} interactive environment={env}>
        <PartScope {...scope} component="hold">
          <KitHoldButton
            label="Hold"
            armedLabel="Ready"
            progress={0}
            holding={false}
            target={{ part: "hold" }}
          />
        </PartScope>
        <PartScope {...scope} component="remote">
          <KitRemotePad label="Remote" hasMic target={{ part: "ok" }} disabled={offline} />
        </PartScope>
        <PartScope {...scope} component="mic">
          <KitMicCapture
            label="Record"
            recording={false}
            level={0.75}
            style={mode}
            target={{ part: "record" }}
          />
        </PartScope>
      </KitProvider>
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
