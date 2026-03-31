import type { Renderer } from "./types";

function pathToString(path: string[]) {
  return `${path.map((p) => (p.startsWith("$") ? p : `.${p}`)).join("")}`;
}

const goRenderer: Renderer = {
  getVar(path: string[]) {
    return pathToString(path);
  },

  getVarPrint(path: string[]) {
    return `{{${pathToString(path)}}}`;
  },

  getIter(path: string[]) {
    return [`{{range $i, $_ := ${this.getVar(path)}}}`, "", "$i", "{{end}}"];
  },
};

export default goRenderer;
