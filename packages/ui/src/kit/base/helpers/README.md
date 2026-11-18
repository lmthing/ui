# kit/base/helpers

Shared empty, loading, check and trail bases, exported through `index.ts`.
Depends only on the text base layer; other kit folders use their doors.

Files: `KitEmpty.tsx`, `KitSkeleton.tsx`, `KitTrail.tsx`, `KitCheck.tsx`, and `index.ts`.
Small skeleton shape components keep the public skeleton props unchanged.

Use catalog tokens and colour roles. Text comes from props or shared copy.
Interactive helpers use the screen controller, never an independent dispatcher.
