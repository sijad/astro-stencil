export interface Renderer {
  getVar(path: string[]): string;
  getUnescapedVarPrint(path: string[]): string;
  getVarPrint(path: string[]): string;
  getIter(path: string[]): [string, string, string, string];
}
