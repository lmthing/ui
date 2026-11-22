import React, { type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it, vi } from "vitest";
import { themeName } from "@lmthing/ui/catalog";
import {
  createScreenController,
  KitHoldButton,
  KitMicCapture,
  KitProvider,
  KitRemotePad,
  PartScope,
  type ScreenController,
} from "@lmthing/ui/kit";
import { addressedElements, config, elementAt, styleAt } from "../../render";
import { defs, scope, screen, theme } from "./fixture-data";

const env = {
  insets: { top: 0, bottom: 0, left: 0, right: 0 },
  keyboardHeight: 0,
  reduceMotion: true,
  agentMode: false,
};
function draw(children: ReactNode, id: string, controller?: ScreenController) {
  return renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <KitProvider theme={theme} environment={env} controller={controller} interactive>
        <PartScope {...scope} component={id}>
          {children}
        </PartScope>
      </KitProvider>
    </TamaguiProvider>,
  );
}

it("draws idle, holding, armed, disabled and inert loading states at stable addresses", () => {
  const hold = { label: "Hold to continue", armedLabel: "Ready", target: { part: "hold" } };
  const idle = draw(<KitHoldButton {...hold} progress={0} holding={false} />, "hold");
  const holding = draw(<KitHoldButton {...hold} progress={0.5} holding />, "hold");
  const armed = draw(<KitHoldButton {...hold} progress={1} holding />, "hold");
  const disabled = draw(<KitHoldButton {...hold} progress={0} holding={false} disabled />, "hold");
  const loading = draw(<KitHoldButton {...hold} progress={1} holding loading />, "hold");
  expect(idle.match(/<circle\b/g)).toHaveLength(1);
  expect(holding.match(/<circle\b/g)).toHaveLength(2);
  expect(elementAt(armed, "test/hold/hold").attributes).toContain('aria-label="Ready"');
  expect(elementAt(disabled, "test/hold/hold").attributes).toContain('aria-disabled="true"');
  expect([...addressedElements(loading).keys()]).toEqual(["test/hold/root"]);
  expect(loading).not.toMatch(/role="button"|Ready/);
});

it("draws named remote keys once, scopes targets to the item, and hides loading controls", () => {
  const props = { label: "Remote", target: { item: "r2", part: "ok" } };
  const connected = draw(<KitRemotePad {...props} hasMic />, "remote");
  const offline = draw(<KitRemotePad {...props} disabled />, "remote");
  const loading = draw(<KitRemotePad {...props} loading hasMic />, "remote");
  const keys = [
    "up",
    "left",
    "ok",
    "right",
    "down",
    "back",
    "play",
    "home",
    "volume_down",
    "mute",
    "volume_up",
    "voice",
  ];
  expect([...addressedElements(connected).keys()]).toEqual([
    "test/remote/root",
    ...keys.map((key) => `test/remote/r2/${key}`),
  ]);
  expect(elementAt(connected, "test/remote/r2/voice").attributes).toContain('aria-label="Voice search"');
  expect(elementAt(offline, "test/remote/r2/ok").attributes).toContain('aria-disabled="true"');
  expect(offline).not.toContain("Voice search");
  expect([...addressedElements(loading).keys()]).toEqual(["test/remote/root"]);
  expect(loading).not.toContain('role="button"');
});

it("draws a reduced-motion level immediately, a paused clock, and unavailable and loading states", () => {
  const props = { label: "Record", target: { part: "record" }, level: 0.75, elapsedSeconds: 65 };
  const open = vi.fn();
  const controller = createScreenController({ screen, defs, micCapture: { open } });
  const live = draw(<KitMicCapture {...props} recording />, "mic", controller);
  const paused = draw(<KitMicCapture {...props} recording={false} />, "mic", controller);
  const unavailable = draw(<KitMicCapture {...props} recording={false} />, "mic");
  const loading = draw(<KitMicCapture {...props} recording loading />, "mic", controller);
  expect(elementAt(live, "test/mic/record").attributes).toContain('aria-pressed="true"');
  const levelStyle = (html: string) =>
    styleAt(html, elementAt(html, "test/mic/root").children[0]!.children[1]!.children[0]!.children[0]!);
  expect(levelStyle(live)).toContain("width:75%");
  expect(levelStyle(paused)).toContain("width:0%");
  expect(paused).toContain("1:05");
  expect(elementAt(unavailable, "test/mic/record").attributes).toContain('aria-disabled="true"');
  expect(unavailable).toContain("Recording unavailable");
  expect(unavailable).not.toContain("1:05");
  expect(elementAt(unavailable, "test/mic/root").children[0]!.children).toHaveLength(2);
  expect(elementAt(unavailable, "test/mic/root").children[0]!.children[1]!.children).toHaveLength(0);
  expect([...addressedElements(loading).keys()]).toEqual(["test/mic/root"]);
  expect(loading).not.toMatch(/role="button"|1:05|Recording unavailable/);
  expect(open).not.toHaveBeenCalled();
  controller.dispose();
});
