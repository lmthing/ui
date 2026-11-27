import { useState } from "react";
import { createRoot } from "react-dom/client";
import { createTamagui, createTokens, TamaguiProvider } from "tamagui";
import { createRegistry, themeName, type ThemeChoice } from "@lmthing/ui/catalog";
import { PhoneScreen, kitFonts, kitThemes, kitTokens, publishBrowserAgent } from "@lmthing/ui/kit";

const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const scheme = kitThemes.kit_calm_light_moss;
const config = createTamagui({
  tokens: createTokens(kitTokens),
  fonts: kitFonts,
  defaultFont: "humanist",
  themes: { light: scheme, [themeName(theme)]: scheme },
});
const cast = { things: [], items: [] };
const registry = createRegistry();
const signup = registry.defaultLines("signup", "credentials", cast);
const verify = registry.defaultLines("verify", "code", cast);
const signin = registry.defaultLines("signin", "credentials", cast);
signup.components.splice(-1, 0, {
  c: "SignInOptions",
  id: "providers",
  divider: "or",
  items: [{ provider: "google", goto: "signin" }],
});
verify.components.find(({ c }) => c === "Field")!.length = 8;

function App() {
  const [screen, setScreen] = useState(signup);
  return (
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <PhoneScreen
        onReady={publishBrowserAgent}
        key={screen.id}
        {...{ screen, theme }}
        reduceMotion
        onLink={(goto) => {
          if (goto === "verify") setScreen(verify);
          if (goto === "signin") setScreen(signin);
        }}
      />
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
