# Control transitions

`index.ts` exposes the pure value helpers used by `control-step.ts`.
`select.ts` validates addressed options; `field.ts` normalises and validates fields.
`value.ts` handles composer, counter, scale and timer values.
The supplied context writes only into the staged values, never the host store.
`controls.test.ts` preserves the original live-control assertions; helper tests are adjacent.
