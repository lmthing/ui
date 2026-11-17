# kit/base

The six bases that carry every visual decision. Views compose them and never style from scratch.

Built in step U2. Read plan 5.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `KitText.tsx` (`role`, `tone`, `maxLines`, `align`) `KitRow.tsx` (`density`, `pressable`) `KitCard.tsx` (`style`, `tone`)
- `KitIcon.tsx` (`name`, `size`, `tone`) `KitPhoto.tsx` (`ref`, `ratio`, `radius`) `KitAction.tsx` (`kind`)
- `style.ts` `shifted()` and `surfaceOf()`, `helpers/`, `index.ts`

Rules:
- Each is a Tamagui `styled` component. Fixed choices are variants. Preset-dependent bits read `useKitStyle()`.
- Every value is a `$token` or a colour role. A preset-specific look needs a new `KitStyle` field, never `if (preset === ...)`.
- Model text renders only inside `KitText`, as plain text.
- Anything touchable goes through the dispatcher: no own `onPress` or `onChange` outside the bases.
- Example and the per-component theming table: plan 5.4 and 5.4a.
