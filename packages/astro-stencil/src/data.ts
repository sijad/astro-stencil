import type { Renderer } from "./renderer";
import { markHTMLString } from "./utils";

const PROXY_MARKER = Symbol("PathNodeProxy");

type Primitive = string | number | boolean | undefined;

export interface PathTerminal {
  toString(): string;
  raw(): string;
}

export function isPathNodeProxy<T>(value: unknown): value is PathNode<T> {
  return !!value?.[PROXY_MARKER];
}

declare const pathArray: unique symbol;
export type PathArray<T> = PathNode<T> & {
  readonly [pathArray]: never;
  map(callBack: (item: PathNode<T>, i: PathTerminal) => string): string;
};

export type InternalPath<T> = PathNode<T> & {
  iteration(): [string, PathNode<T>, PathTerminal, string];
};

export type PathNode<T> = T extends Primitive
  ? PathTerminal
  : T extends readonly (infer U)[]
    ? PathArray<U>
    : T extends object
      ? PathObject<T>
      : PathTerminal;

type PathObject<T> = {
  [K in keyof T]: PathNode<T[K]>;
};

export function createDataProxy<T>(renderer: Renderer): PathNode<T> {
  function createProxy<T>(path: string[]): PathNode<T> {
    return new Proxy(
      {},
      {
        get(_, prop: string | symbol) {
          if (prop === PROXY_MARKER) {
            return true;
          }

          if (
            prop === Symbol.toPrimitive ||
            prop === "toString" ||
            prop === "valueOf"
          ) {
            return () => renderer.getVarPrint(path);
          }

          if (prop === "raw") {
            return () => renderer.getVar(path);
          }

          if (prop === "iteration") {
            return () => {
              const [start, varName, indexVar, end] = renderer.getIter(path);
              return [
                start,
                createProxy(varName ? [varName] : []),
                createProxy(indexVar ? [indexVar] : []),
                end,
              ];
            };
          }

          // todo check if it's an array
          if (prop === "map") {
            return (
              callBack: (item: PathNode<T>, i: PathTerminal) => string,
            ) => {
              const [start, varName, indexVar, end] = renderer.getIter(path);
              const render = callBack(
                createProxy(varName ? [varName] : []),
                createProxy(indexVar ? [indexVar] : []),
              );

              return [
                markHTMLString(start.trim()),
                render,
                markHTMLString(end.trim()),
              ];
            };
          }

          if (typeof prop === "symbol") {
            return undefined;
          }

          return createProxy([...path, prop.toString()]);
        },
      },
    ) as PathNode<T>;
  }

  return createProxy<T>([]);
}

export function getIteration<T>(
  path: PathArray<T>,
): [string, PathNode<T>, PathTerminal, string] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (path as any as InternalPath<T>).iteration();
}
