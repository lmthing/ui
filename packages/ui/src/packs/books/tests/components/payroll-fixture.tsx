import * as c from "@lmthing/ui/catalog";
import { createScreenController, KitProvider, PartScope } from "@lmthing/ui/kit";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import type { z } from "zod";
import { config, exampleDeviceData } from "../../../../../test/render";
import { Payroll as view } from "../../components";

const def = c.components.Payroll;
const { Payroll } = view;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
type Input = z.input<typeof def.props>;

// Keep the renderer exercised while the legacy scaffold assertions keep it out of the ready registry.
export function renderPayroll(input: Input, state: c.StateName, data?: c.DeviceData) {
  const component = "c1";
  const screen = { id: "home", components: [{ ...input, id: component, c: "Payroll", state }] };
  const props = c.stampItemIds(def.meta, def.props.parse(input)) as Parameters<typeof Payroll>[0];
  const controller = data
    ? createScreenController({ screen, defs: { Payroll: def }, deviceData: data, interactive: false })
    : undefined;
  try {
    return renderToStaticMarkup(
      <TamaguiProvider config={config} defaultTheme={c.themeName(theme)}>
        <KitProvider theme={theme} controller={controller}>
          <PartScope screen={screen.id} component={component} rev={1} state={state}>
            <Payroll {...props} />
          </PartScope>
        </KitProvider>
      </TamaguiProvider>,
    );
  } finally {
    controller?.dispose();
  }
}

export function renderPayrollExample(input: Input, state: c.StateName) {
  const deviceData = exampleDeviceData(def, def.props.parse(input), state);
  return { html: renderPayroll(input, state, deviceData), deviceData };
}
