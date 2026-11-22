import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it, vi } from "vitest";
import { components, themeName, type Definition } from "@lmthing/ui/catalog";
import { KitMicCapture, useKit, type MicCaptureAdapter, type ScreenController } from "@lmthing/ui/kit";
import { addressedElements, config } from "../../../test/render";
import { PhoneScreen } from "./PhoneScreen";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const address = "home/f1/mic";
const defs = {
  MicFixture: {
    ...components.Header,
    meta: {
      ...components.Header.meta,
      id: "MicFixture",
      parts: ["root", "mic"],
      partTiers: { mic: "ok" },
      actions: { parts: { mic: ["start", "stop"] } },
    },
  },
} satisfies Record<string, Definition>;
const screen = { id: "home", components: [{ c: "MicFixture", id: "f1", title: "Speech" }] };

function renderMic(micCapture?: MicCaptureAdapter) {
  const mounted = vi.fn<(controller: ScreenController | undefined) => void>();
  function MicFixture() {
    mounted(useKit().controller);
    return <KitMicCapture part="mic" label="Record" target={{ part: "mic" }} recording={false} level={0} />;
  }
  const html = renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <PhoneScreen {...{ defs, screen, theme, micCapture, renderers: { MicFixture } }} />
    </TamaguiProvider>,
  );
  return { controller: mounted.mock.lastCall![0]!, attrs: addressedElements(html).get(address)!.attributes };
}

it("leaves the microphone unavailable when PhoneScreen has no microphone adapter", () => {
  const { controller, attrs } = renderMic();
  try {
    expect(attrs).toContain('aria-disabled="true"');
    expect(controller.micCapturePhase(address)).toBe("unavailable");
  } finally {
    controller.dispose();
  }
});

it("forwards the PhoneScreen adapter to the mounted microphone control", async () => {
  const close = vi.fn();
  const open = vi.fn(() => ({ close }));
  const { controller, attrs } = renderMic({ open });
  const unregister = controller.registerPart(address);
  try {
    expect(attrs).not.toContain('aria-disabled="true"');
    await controller.startMicCapture(address);
    expect(open).toHaveBeenCalledExactlyOnceWith(address, expect.any(AbortSignal));
    expect(controller.micCapturePhase(address)).toBe("recording");
    controller.stopMicCapture(address);
    expect(close).toHaveBeenCalledExactlyOnceWith("stop");
    expect(controller.micCapturePhase(address)).toBe("idle");
  } finally {
    unregister();
    controller.dispose();
  }
});
