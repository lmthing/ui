// Server-render one component instance in a theme and state, the way a host does.
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider, createTamagui, createTokens } from "tamagui";
import {
  components,
  stampItemIds,
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

export function renderInstance(
  id: ComponentName,
  input: unknown,
  state: StateName,
  theme: Theme,
  thing?: string,
): string {
  const def = components[id];
  const View = renderers[id as keyof typeof renderers] as (props: object) => React.ReactNode;
  const props = stampItemIds(def.meta, def.props.parse(input) as Record<string, unknown>);
  return renderToStaticMarkup(
    <TamaguiProvider config={config}>
      <KitProvider theme={theme}>
        <PartScope screen="home" component="c1" rev={1} state={state} {...(thing ? { thing } : {})}>
          <View {...props} />
        </PartScope>
      </KitProvider>
    </TamaguiProvider>,
  );
}
