# kit/base

The public building blocks for component views.
Layers, imported only through each folder's `index.ts`:
- `text/`: text, icons, content geometry and shared surface choices; no base dependencies.
- `helpers/`: empty, loading, checks and trails; uses text.
- `surface/`: frames, rows, tiles, grids, strips and overlays; uses text.
- `input/`: controls, choices, scales and actions; uses text.
- `data/`: charts, progress and ranks; uses text.
- `time/`: days, weeks, hours and time labels; uses text.
- `media/`: photos, playback, camera, maps, bubbles, stacks and tabs; uses text and input.
- `composition/`: field controls, list treatments and sheets; composes lower layers.

`index.ts` re-exports every layer's public bases. No lower layer imports composition.
Use catalog tokens, colour roles and `useKitStyle()`, never preset names or raw presentation values.
Model text renders only in `KitText`; interactive bases use the shared dispatcher.

Alongside `pnpm look`, capture real interactions from the shared calm/light/390 Motion Lab:
`pnpm build:entries && pnpm kit:themes && UI_MOTION_EVIDENCE=1 pnpm --filter @lmthing/ui exec tsx scripts/build/check.ts --browser test/designer-motion.browser.test.ts`.
Find normal and reduced-motion PNG sheets and input-relative focus traces in `packages/ui/shots/p5-designer-motion/`.
