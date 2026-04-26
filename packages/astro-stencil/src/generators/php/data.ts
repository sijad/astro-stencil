import { createDataProxy, type PathNode } from "../../data";
import type { Renderer } from "../../renderer";

function pathToString(path: string[]) {
  return `$${path.map((p, i) => (i ? `['${p}']` : p)).join("")}`;
}

const phpRenderer: Renderer = {
  getVar(path: string[]): string {
    return pathToString(path);
  },

  getVarPrint(path: string[]): string {
    return `<?php echo ${pathToString(path)}; ?>`;
  },

  getIter(path: string[]) {
    const itemVar = "iter";
    const indexVar = "i";
    return [
      `<?php foreach(${this.getVar(path)} as $${indexVar} => $${itemVar}): ?>`,
      itemVar,
      indexVar,
      "<?php endforeach; ?>",
    ];
  },
};

export function createDataSource<T>(): PathNode<T> {
  return createDataProxy<T>(phpRenderer);
}
