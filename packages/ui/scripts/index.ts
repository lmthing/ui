import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
export const webResolve = {
  alias: [
    { find: /^react-native$/, replacement: require.resolve("react-native-web/dist/index.js") },
    {
      find: /^react-native-svg$/,
      replacement: require.resolve("react-native-svg/lib/module/ReactNativeSVG.web.js"),
    },
    {
      find: "@react-native/assets-registry/registry",
      replacement: require.resolve("react-native-web/dist/modules/AssetRegistry"),
    },
  ],
  conditions: ["source", "browser", "module", "development|production"],
  extensions: [".web.js", ".web.ts", ".web.tsx", ".mjs", ".js", ".ts", ".tsx", ".json"],
};

export { probeModels, type ProbeModel } from "./llm.config";
export { keyOf, readBook, replayCall, writeBook } from "./recordings";
export { azure } from "./azure";
export { chromePaths, launchChrome } from "./launch-chrome";
