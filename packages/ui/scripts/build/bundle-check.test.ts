import { expect, it } from "vitest";
import { hasCatalogLeak } from "./bundle-check";

it("allows the social purpose's plain English react without dependency evidence", () => {
  const purpose =
    "A small community in one app: a club, a class, a neighbourhood, friends with a shared hobby. People post, react, comment, vote, join challenges and events, and invite others. Everything here needs other people, so the pack is tier people throughout.";
  expect(hasCatalogLeak(`export const pack = { purpose: ${JSON.stringify(purpose)} };`)).toBe(false);
});

it.each([
  'import React from "react";',
  'import { jsx } from "react/jsx-runtime";',
  'import "react-native";',
  'export { createPortal } from "react-dom";',
  'export * from "tamagui";',
  'import { Stack } from "@tamagui/core";',
  'const native = require("react-native");',
  "const native = require(`react-native-web`);",
  'function load() { return require ( "react" ); }',
  'const native = __require("react-native");',
  'const kit = import("@tamagui/core");',
])("rejects a forbidden module reference: %s", (source) => {
  expect(hasCatalogLeak(source)).toBe(true);
});

it.each([
  'const prompt = \'import React from "react"; require("tamagui")\';',
  '// import "react-native";\nconst prompt = "React and Tamagui";',
  'const prompt = `People react to posts`; // require("react")',
  'import { z } from "zod";',
  'import { chart } from "reactive-charts";',
])("allows text, comments and unrelated modules: %s", (source) => {
  expect(hasCatalogLeak(source)).toBe(false);
});

it.each([
  "node_modules/react/index.js",
  "/workspace/node_modules/react-dom/client.js",
  "node_modules/react-native/index.js",
  "node_modules/react-native-web/dist/index.js",
  "node_modules/tamagui/dist/index.js",
  "node_modules/@tamagui/core/dist/index.js",
  "/workspace/node_modules/.pnpm/react@19/node_modules/react/index.js",
  "C:\\workspace\\node_modules\\@tamagui\\core\\index.js",
])("rejects a bundled dependency path: %s", (file) => {
  expect(hasCatalogLeak("export const prompt = 'People react';", [file])).toBe(true);
});

it("allows nondependency paths and unrelated package names", () => {
  expect(
    hasCatalogLeak("export const prompt = 'People react';", [
      "/workspace/react/src/catalog.ts",
      "node_modules/reactive-charts/index.js",
      "node_modules/zod/index.js",
    ]),
  ).toBe(false);
});
