# List slice dependencies

All versions are exact in manifests and `pnpm-lock.yaml`. Node 26, pnpm 12.16.1.

| Dependency | Why, alternative considered |
| --- | --- |
| zod 4.6.7 | Shared runtime schemas and inferred types; hand validators would drift. |
| react/react-dom 19.3.1 | Kit views and gallery mount; required by the design. |
| react-native-web 0.21.4 | Native-style host on web; DOM-only views would not prove the kit path. |
| tamagui/@tamagui/core 1.144.4 | Matched stable design primitives; latest majors lack matching Lucide. |
| @tamagui/lucide-icons 1.144.4 | Curated icons, matching Tamagui; no custom icon artwork. |
| react-native-svg 15.15.3 | Lucide's web SVG renderer; no native runtime in this slice. |
| vite 8.3.8 | Minimal web gallery as requested; Expo deferred. |
| typescript 5.9.3 | Strict types, stable compiler; preview major deferred. |
| vitest 5.1.0 | Schema, type, token, address and kit tests; Jest deferred. |
| tsx 4.23.15 | Run small TypeScript generators; no separate tooling build. |
| esbuild 0.28.2 | Tree-shaken catalog with import stubs; tsup wrapper unnecessary here. |
| @types/node 26.6.6 | Generator APIs; matches Node major. |
| @types/react/@types/react-dom 19.3.0 | React types; matches runtime major. |
| @types/react-native-web 0.19.3 | Part ref types; RN types would pull the native runtime. |
