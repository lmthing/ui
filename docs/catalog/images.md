# Generated images

Writers send a meaning-only slot in an accepted `photo` field: for example,
`{ "kind": "plant", "subject": "potted bird’s nest fern" }`. The subject is one short noun phrase
(2–80 characters), not style, camera direction, a URL, a prompt, or an asset identifier. Keep
existing `lib:` or `local:` references where supplied. Don't generate a substitute for a user's
photo, inspection evidence, uploaded document, or proof of an event.

| Component or field | Generated kinds |
| --- | --- |
| Photo | Content kinds, plus `cover` |
| Gallery, each `photos[].photo` | `product`, `dish`, `plant`, `pet`, `place`, `room`, `item`, `media_cover`, `poster` |
| Hero, with `media: "cover"` | `hero`, `cover`, `onboarding` |
| Card, thumbnail or cover | The Gallery kinds, plus `cover` |
| Profile | `avatar` (fictional and illustrated), `pet`, `plant` |
| Empty | `empty_state` with `kind: "none"`; `error` with `kind: "error"` or `"offline"` |
| Success, screen only | `success` |
| PassCard | `badge` (decoration only, not a mark from an issuer or a credential) |
| Steps, full detail | `step_illustration` |
| Pack media | The field schema limits kinds to its domain, e.g. `dish` for MealPlan or `media_cover` for Playlist |

`app_icon` and `pattern` are app-level slots rather than Writer component fields. The gallery
uses `app_icon` in the sample app masthead.

The Director chooses one `artStyle` per app. If no style was saved, use `natural_photo`.
`buildImagePrompt(slot, theme)` fills the kind's Markdown template with that choice and with
the preset, accent, mode, density and crop. UI motion is not part of the prompt or image cache
identity. Avatars remain illustrated even in either photo style. Use `imageRejectIf(kind)` for
the kind-specific vision checklist, in addition to requiring the prompt's subject and style.

`PhoneScreen.resolveImage(address, slot)` is host-owned. Return a URI only for the current slot
and theme at that part address. No URI means the kit draws a tinted placeholder at the final
size. On successful decode, the image fades in without changing the crop; under reduced
motion it appears as a cut. A missing or failed asset does not hide the content around it.

## Reproduce the bake-off

Build entries first (`pnpm build:entries`), then run
`pnpm --filter @lmthing/ui exec tsx scripts/images/bakeoff.ts --plan` from the workspace root
to preview the matrix and estimated ceiling without Azure calls. For a live run, load
`LMTHINGAPP_ENDPOINT` and `LMTHINGAPP_API_KEY` from `~/.config/lmthing/llm.env` without echoing
them and run the same command without `--plan` through the shared eval slot.

The three model/quality combinations see the same 60 kind/style/subject combinations:
20 kinds in Natural photo, Soft 3D and Risograph, with one matched subject per kind from Ledge,
Trot, a café or a gym. The same Ledge app has six images per style across all eight styles.
Raw JPEGs, the matrix, measured seconds and token counts, and contact sheets live under
`packages/ui/shots/images/`. Use `--sheets` to rebuild sheets from recorded results without
a model call. Add `--samples` to export resized gallery JPEGs and their provenance manifest
to `apps/gallery/public/art-styles/`. Open **Art styles** from the gallery index to compare
the same app without changing its copy, layout or interface palette.

## Recommended routing

Treat these as starting routes, not as acceptance rules. Check the subject, style and the
kind-specific reject list before publishing. A pattern also needs a repeated-tile seam
check: even a convincingly repeated single tile can have visible seams.

| Start with | Kinds | Observed output tokens |
| --- | --- | ---: |
| `gpt-image-2` low | `app_icon`, `hero`, `onboarding`, `room`, `step_illustration` | 107 wide / 173 square |
| `gpt-image-1-mini` medium | `cover`, `pattern`, `empty_state`, `success`, `plant`, `place`, `media_cover`, `poster`, `avatar` | 1568 wide / 1056 square |
| `gpt-image-1-mini` low | `badge`, `error`, `product`, `dish`, `pet`, `item` | 400 wide / 272 square |

Image 2 keeps the lead motif clear and more often gives a room or task a readable
overall structure. Mini low is enough to start for one simple subject; the medium
samples preserve more structure in covers and scene detail in places. Mini medium
is not a blanket upgrade, and the pattern route is conditional on seam validation.

At the measured sizes, an icon, hero, three moments (`empty_state`, `success`, `error`),
and one of each of the ten content kinds cost an estimated **$0.09** at the
[Azure public token rates](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/),
before vision checks, regeneration, taxes or region-specific pricing.
