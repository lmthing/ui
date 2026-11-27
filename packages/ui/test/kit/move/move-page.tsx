import { createRoot } from "react-dom/client";
import { TamaguiProvider, XStack, YStack } from "tamagui";
import { space, themeName, type ThemeChoice } from "@lmthing/ui/catalog";
import { config } from "../../../../../apps/gallery/tamagui.config";
import { PhoneScreen, publishBrowserAgent } from "../../../src/kit/screen";
import { moveScreen, moveDef, moveDefs, MoveFixture } from "./move.fixture";

const params = new URLSearchParams(location.search);
const mode = params.get("mode") === "dark" ? "dark" : "light";
const width = Number(params.get("width") ?? 320);
const look = params.has("look");
const moveOnly = params.has("move-only");
const renderers = { MoveFixture };
const defs = moveOnly
  ? {
      MoveFixture: { ...moveDef, meta: { ...moveDef.meta, actions: { items: { root: ["move"] } } as const } },
    }
  : moveDefs;
const presets = look ? (["calm", "bold", "editorial"] as const) : (["calm"] as const);

function Frame({ preset, style }: { preset: ThemeChoice["preset"]; style: "columns" | "stack" }) {
  const theme = { preset, mode, accent: "moss" } satisfies ThemeChoice;
  const screen = {
    ...moveScreen,
    id: look ? `${preset}_${style}` : moveScreen.id,
    components: moveScreen.components.map((entry) =>
      moveOnly
        ? {
            ...entry,
            style,
            columns: [{ label: "Waiting" }, { label: "Waiting" }, { label: "Finished" }],
            cards: [{ title: "Snake plant", column: 0 }],
          }
        : { ...entry, style },
    ),
  };
  return (
    <YStack width={width} height={style === "columns" ? 230 : 510} data-look-frame={`${preset} ${style}`}>
      <PhoneScreen
        onReady={look ? undefined : publishBrowserAgent}
        {...{ defs, renderers, screen, theme }}
        reduceMotion
        onLink={(goto) => {
          document.documentElement.dataset.link = goto;
        }}
      />
    </YStack>
  );
}

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme={themeName({ preset: "calm", mode, accent: "moss" })}>
    <XStack gap={space.xl} padding={space.lg} backgroundColor="$bg">
      {presets.map((preset) => (
        <YStack key={preset} gap={space.lg}>
          <Frame preset={preset} style="stack" />
          {look && <Frame preset={preset} style="columns" />}
        </YStack>
      ))}
    </XStack>
  </TamaguiProvider>,
);
