import { createDataProxy, type PathNode } from "../../data.js";
import type { Renderer } from "../../renderer.js";

function pathToString(path: string[]) {
  return `$${path.map((p, i) => (i ? `['${p}']` : p)).join("")}`;
}

const bladeRenderer: Renderer = {
  getVar(path: string[]): string {
    return pathToString(path);
  },

  getVarPrint(path: string[]): string {
    return `{{ ${pathToString(path)} }}`;
  },

  getUnescapedVarPrint(path: string[]): string {
    return `{{!! ${pathToString(path)} !!}}`;
  },

  getIter(path: string[]) {
    const itemVar = "iter";
    const indexVar = "i";
    return [
      `@foreach(${this.getVar(path)} as $${indexVar} => $${itemVar})`,
      itemVar,
      indexVar,
      "@endforeach",
    ];
  },
};

export function createDataSource<T>(): PathNode<T> {
  return createDataProxy<T>(bladeRenderer);
}
