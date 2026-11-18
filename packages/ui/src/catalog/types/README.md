# catalog/types

Component-level types. Hosts re-export them so the kit never depends on a host's protocol.

Built in step U1. Read plan 4.1 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):

- `component.ts` `StateName`, `ComponentId`, `Component`, `PropsOf`
- `screen.ts` `ScreenLike`
- `cast.ts` `CastLike`
- `tier.ts` `Tier` (`phone` | `ok` | `people` | `service`)
- `issue.ts` `Issue`
- `action.ts` `ActionName`, `ScreenAction`, `ActionSpec`

Rules:

- Types only. Copy them from plan 4.1.
- `ScreenLike` and `CastLike` are the minimum a screen or fallback needs. Do not add host fields.
