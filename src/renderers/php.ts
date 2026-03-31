import type { Renderer } from "./types";

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

export default phpRenderer;
