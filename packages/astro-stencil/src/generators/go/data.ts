import { createDataProxy, PathNode } from "../../data.js";
import { Renderer } from "../../renderer.js";

function pathToString(path: string[]) {
  return `${path.map((p) => (p.startsWith("$") ? p : `.${p}`)).join("")}`;
}

const renderer: Renderer = {
  getVar(path: string[]) {
    return pathToString(path);
  },

  getVarPrint(path: string[]) {
    return `{{${pathToString(path)}}}`;
  },

  getUnescapedVarPrint(path: string[]) {
    return `{{${pathToString(path)} | safeHTML}}`;
  },

  getIter(path: string[]) {
    return [`{{range $i, $_ := ${this.getVar(path)}}}`, "", "$i", "{{end}}"];
  },
};

export function createDataSource<T>(): PathNode<T> {
  return createDataProxy<T>(renderer);
}
