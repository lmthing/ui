# test

Shared fixtures and the conformance test.

Built in step U1 (fixtures), U2 (conformance). Read plan 8 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `conformance.test.tsx` for every `ready` component file: a view exists, both examples render in every declared state, every declared part and item part registers with the memory registry
- `setup.ts`, `recordings/` model replies for the probes (keyed by model id, prompt and probe hash)
- `fixtures/` casts (empty and full) and screens used by `catalog:check` and tests

Rules:
- Fixtures are data. Fallbacks must validate with the empty and the full cast.
- Pure code has a `name.test.ts` beside it in `src/`. This folder is only for shared fixtures and cross-cutting tests.
- Kit tests use Jest with `jest-expo` and React Native Testing Library. Catalog tests use Vitest.
- Tests that render use `config` and `renderInstance` from `render.tsx`; never call `createTamagui` in a test.
