import type { PartRegistry } from "./types";

export const noopParts: PartRegistry = { register() {}, unregister() {} };
