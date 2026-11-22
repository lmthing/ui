import { TamaguiProvider, YStack } from "tamagui";
import { component, space, type ComponentName, type SignatureName } from "@lmthing/ui/catalog";
import { config } from "../index";
import { Screens } from "./Screens";
import { Runtime } from "./Runtime";
import { Controls } from "./Controls";
import { MotionPreview } from "./Motion";
import { ComponentTitle, Overview, SharedVariants, VariantGrid } from "./overview";

const query = new URLSearchParams(globalThis.location?.search ?? "");
const only = query.get("c");
const width = Number(query.get("w")) || 0;
const mode = query.get("mode");

export function Gallery() {
  if (query.has("motion")) return <MotionPreview name={query.get("motion") as SignatureName} />;
  if (query.has("controls")) return <Controls kind={query.get("controls") ?? "form"} query={query} />;
  if (query.has("runtime")) return <Runtime />;
  if (only && query.has("variant-sheet")) {
    return (
      <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
        <SharedVariants id={only as ComponentName} sheet />
      </TamaguiProvider>
    );
  }
  if (only && width) {
    return (
      <Screens
        id={only as ComponentName}
        width={width}
        mode={mode === "dark" ? "dark" : "light"}
        presetIds={query.getAll("preset")}
      />
    );
  }
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      {only ? (
        <YStack padding={space.xl} gap={space.lg} alignSelf="center" maxWidth={component.Gallery.maxWidth}>
          <ComponentTitle id={only as ComponentName} />
          <SharedVariants id={only as ComponentName} />
          <VariantGrid id={only as ComponentName} preset={query.get("preset")} mode={mode} />
        </YStack>
      ) : (
        <Overview />
      )}
    </TamaguiProvider>
  );
}
