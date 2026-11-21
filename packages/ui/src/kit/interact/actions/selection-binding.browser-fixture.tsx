import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { themeName, type BoundSelection, type ThemeChoice } from "../../../catalog";
import { allStep, checkStep, selectionFixture } from "../../../catalog/probes/fixtures";
import { PartScope } from "../../part";
import { KitProvider } from "../../provider";
import { createScreenController, useLiveControls } from "../index";
import { config } from "../../../../../../apps/gallery";

const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const { screen, defs } = selectionFixture({ requireSelection: true });
const controller = createScreenController({ screen, defs });

function Selection() {
  const live = useLiveControls(defs.BulkActions.meta, { items: [] });
  const selection = live.$selection as BoundSelection | undefined;
  return selection?.selected.length ? (
    <button onClick={() => controller.press(allStep.address)}>{selection.selected.join(",")}</button>
  ) : null;
}

createRoot(document.body).render(
  <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
    <KitProvider controller={controller} theme={theme}>
      <button onClick={() => controller.press(checkStep.address)}>Check row</button>
      <PartScope screen={screen.id} component="bulk" rev={1} state="filled">
        <Selection />
      </PartScope>
    </KitProvider>
  </TamaguiProvider>,
);
