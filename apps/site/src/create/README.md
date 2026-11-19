# src/create

The "Create" demo: JSON lines stream in and a live phone assembles component by component.
`sources.ts` reads only real data (live packs' `example.jsonl` and replies recorded from named models),
`useStream.ts` paces the lines, `CreateDemo.tsx` draws the code pane and the phone.
