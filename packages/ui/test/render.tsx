// Server-render one component instance in a theme and state, the way a host does.
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider, createTamagui, createTokens } from "tamagui";
import {
  components,
  selectDeviceData,
  stampItemIds,
  themeName,
  type ComponentName,
  type Definition,
  type DeviceData,
  type StateName,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import {
  createScreenController,
  KitProvider,
  PartScope,
  PhoneScreen,
  kitFonts,
  kitThemes,
  kitTokens,
  renderers,
} from "@lmthing/ui/kit";
import { exampleDeviceData as previewData } from "../src/catalog/probes/fixtures";
import { createPreviewController } from "../../../apps/gallery/app/draw";
import { elementAt, type RenderedElement } from "./rendered-elements";

export {
  addressedElements,
  elementAt,
  hasStepTarget,
  type AddressedElement,
  type RenderedElement,
} from "./rendered-elements";

export const config = createTamagui({
  tokens: createTokens(kitTokens),
  fonts: kitFonts,
  defaultFont: "humanist",
  themes: Object.fromEntries(
    Object.entries({
      light: kitThemes.kit_calm_light_moss,
      dark: kitThemes.kit_calm_dark_moss,
      ...kitThemes,
    }).map(([name, roles]) => [name, { ...roles, color: roles.text, background: roles.bg }]),
  ),
});

export type Theme = ThemeChoice;
export type RenderOptions = {
  thing?: string;
  lang?: string;
  component?: string;
  disableRootThemeClass?: boolean;
  resolvePhoto?: (reference: string) => string | undefined;
  deviceData?: DeviceData | undefined;
  previewSelection?: true;
};

export function exampleDeviceData(def: Definition, input: Record<string, unknown>, state: StateName) {
  const data = previewData(def.meta, input, state);
  return data && selectDeviceData(def.meta, data);
}

/** Use the same parsed example and state that gallery cells pass to the declared fixture. */
export function renderExample(
  id: ComponentName,
  input: unknown,
  state: StateName,
  theme: Theme,
  options: Omit<RenderOptions, "deviceData"> = {},
) {
  const def: Definition = components[id];
  const props = def.props.parse(input) as Record<string, unknown>;
  const deviceData = exampleDeviceData(def, props, state);
  const html = renderInstance(id, input, state, theme, {
    resolvePhoto: (reference) =>
      JSON.stringify(props).includes(JSON.stringify(reference)) ? reference : undefined,
    ...options,
    deviceData,
  });
  return { html, props, deviceData };
}

export function renderInstance(
  id: ComponentName,
  input: unknown,
  state: StateName,
  theme: Theme,
  options: string | RenderOptions = {},
): string {
  const settings = typeof options === "string" ? { thing: options } : options;
  const { thing, lang, component = "c1", disableRootThemeClass = false, resolvePhoto } = settings;
  const def: Definition = components[id];
  const View = renderers[id as keyof typeof renderers] as (props: object) => React.ReactNode;
  const parsed = def.props.parse(input) as Record<string, unknown>;
  const gated = Boolean(def.meta.deviceDataVisible);
  // Direct view tests have no host records unless supplied; gated previews opt into their fixture.
  const deviceData =
    "deviceData" in settings
      ? settings.deviceData
      : gated
        ? exampleDeviceData(def, parsed, state)
        : undefined;
  const screen = { id: "home", components: [{ ...(input as object), id: component, c: id, state }] };
  const defs = { [id]: def };
  const controller =
    settings.previewSelection && def.meta.selectionBinding && state === "filled"
      ? createPreviewController(def, parsed, screen.id, { state })
      : deviceData && !gated
        ? createScreenController({ screen, defs, deviceData, lang, interactive: false })
        : undefined;
  const frame = { config, defaultTheme: themeName(theme), disableRootThemeClass };
  const phone = { defs, renderers, screen, theme, lang, resolvePhoto, deviceData, interactive: false };
  const part = { screen: "home", component, rev: 1, state, ...(thing ? { thing } : {}) };
  try {
    return renderToStaticMarkup(
      <TamaguiProvider {...frame}>
        {gated ? (
          <PhoneScreen {...phone} />
        ) : (
          <KitProvider
            theme={theme}
            lang={lang}
            controller={controller}
            {...(resolvePhoto ? { resolvePhoto } : {})}
          >
            <PartScope {...part}>
              <View {...stampItemIds(def.meta, parsed)} />
            </PartScope>
          </KitProvider>
        )}
      </TamaguiProvider>,
    );
  } finally {
    controller?.dispose();
  }
}

export function styleAt(html: string, address: string | RenderedElement): string {
  const { attributes } = typeof address === "string" ? elementAt(html, address) : address;
  const inline = attributes.match(/style="([^"]*)"/)?.[1] ?? "";
  const classes = (attributes.match(/class="([^"]*)"/)?.[1] ?? "")
    .split(/\s+/)
    .filter((name) => /^[a-z0-9_-]+$/i.test(name));
  const css = config.getCSS();
  return [
    inline,
    ...classes.flatMap((name) =>
      Array.from(css.matchAll(new RegExp("\\." + name + "\\s*\\{([^}]*)\\}", "g")), (match) => match[1]),
    ),
  ].join(";");
}
