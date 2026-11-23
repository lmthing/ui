import { components as core } from "./core";
import { components as domains } from "./packs";
import { components as surfaces } from "./surfaces";

export const components: typeof core & typeof domains & typeof surfaces = {
  ...core,
  ...domains,
  ...surfaces,
};
