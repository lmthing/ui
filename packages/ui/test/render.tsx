// Server-render one component instance in a theme and state, the way a host does.
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider, createTamagui, createTokens } from "tamagui";
import {
  components,
  stampItemIds,
  themeName,
  type ComponentName,
  type StateName,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { KitProvider, PartScope, kitFonts, kitThemes, kitTokens, renderers } from "@lmthing/ui/kit";

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
};

export function renderInstance(
  id: ComponentName,
  input: unknown,
  state: StateName,
  theme: Theme,
  options: string | RenderOptions = {},
): string {
  const {
    thing,
    lang,
    component = "c1",
    disableRootThemeClass = false,
    resolvePhoto,
  } = typeof options === "string" ? { thing: options } : options;
  const def = components[id];
  const View = renderers[id as keyof typeof renderers] as (props: object) => React.ReactNode;
  const props = stampItemIds(def.meta, def.props.parse(input) as Record<string, unknown>);
  return renderToStaticMarkup(
    <TamaguiProvider
      config={config}
      defaultTheme={themeName(theme)}
      disableRootThemeClass={disableRootThemeClass}
    >
      <KitProvider theme={theme} lang={lang} {...(resolvePhoto ? { resolvePhoto } : {})}>
        <PartScope screen="home" component={component} rev={1} state={state} {...(thing ? { thing } : {})}>
          <View {...props} />
        </PartScope>
      </KitProvider>
    </TamaguiProvider>,
  );
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
