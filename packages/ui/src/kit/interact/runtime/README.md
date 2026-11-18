# Controller runtime

`index.ts` exposes controller wiring helpers.
`context.ts` owns screen inputs, initial values and mounted/controller state.
`dispatch.ts` stages batches through the action table, then commits and runs effects.
Confirmable actions stage no values or host I/O until accepted and revalidated.
`clock.ts` owns timer scheduling; `media.ts` owns host sessions and async callbacks.
`access.ts` supplies human presses, agent readings and part registration.
