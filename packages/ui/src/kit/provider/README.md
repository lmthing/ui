# kit/provider

The host's single entry into the kit.

Built in step U2. Read plan 5.3 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `KitProvider.tsx` props: `theme`, `registry`, `parts`, `onLink`, `resolvePhoto`, `reduceMotion`, `interactive`, `interaction`, `agentMode`
- `context.ts` the context value
- `useKit.ts` hook
- `useKitStyle.ts` hook returning `KitStyle`
- `useWords.ts` hook returning the app `lang` and core words, or words from a pack lookup

Rules:
- `KitProvider` wraps children in the Tamagui `Theme` for the app and provides `KitStyle` from `kitStyleOf(preset)`.
- `onLink` is the only way a press leaves the kit. Never navigate here.
- Interface: plan 5.3. Defaults: `parts` is the noop registry, `interactive` false, `lang` is English.
