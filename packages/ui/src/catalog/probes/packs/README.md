# probes/packs

Director pack-selection prompts and scoring.
Other folders import through `index.ts`. Prompt text and recorded data stay unchanged.
`runPackProbes` explicitly requests `includeDrafts: true` for the full Director pack index.
Its fixture test checks that live indexes omit unready packs while probe prompts keep them.
