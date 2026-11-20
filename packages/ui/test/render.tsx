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
  const html = renderInstance(id, input, state, theme, { ...options, deviceData });
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
    deviceData && !gated
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

/** Inspect rendered markup without depending on React element trees or mocked kit hooks. */
export type RenderedElement = { tag: string; attributes: string; children: RenderedElement[] };
export type AddressedElement = Omit<RenderedElement, "children"> & {
  text: string[];
  children: AddressedElement[];
};

export function addressedElements(html: string): Map<string, AddressedElement> {
  const stack: AddressedElement[] = [];
  const addresses = new Map<string, AddressedElement>();
  const voids = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]);
  for (const match of html.matchAll(/<!--[\s\S]*?-->|<\/?([a-z][a-z0-9-]*)\b[^>]*>|([^<]+)/gi)) {
    if (match[2]) stack.at(-1)?.text.push(match[2]);
    if (!match[1]) continue;
    const attributes = match[0],
      tag = match[1].toLowerCase();
    if (attributes.startsWith("</")) {
      stack.pop();
      continue;
    }
    const node: AddressedElement = { tag, attributes, children: [], text: [] };
    stack.at(-1)?.children.push(node);
    const address = attributes.match(/\bdata-testid="([^"]+)"/)?.[1];
    if (address) addresses.set(address, node);
    if (!voids.has(tag) && !attributes.endsWith("/>")) stack.push(node);
  }
  return addresses;
}

export function elementAt(html: string, address: string): RenderedElement {
  const found = addressedElements(html).get(address);
  if (!found) throw new Error(`No rendered part at ${address}`);
  return found;
}
/** A shared-address stepper has one accessible button per direction within its addressed group. */
export function hasStepTarget(group: RenderedElement, action: string): boolean {
  if (!["increment", "decrement"].includes(action) || !/\brole="group"/.test(group.attributes)) return false;
  return group.children.some(
    ({ attributes }) =>
      /\brole="button"/.test(attributes) &&
      /\baria-label="[^"]+"/.test(attributes) &&
      !/\bdata-testid=/.test(attributes) &&
      attributes.includes(`data-step-action="${action}"`),
  );
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
