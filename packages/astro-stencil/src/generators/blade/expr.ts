import { markHTMLString } from "../../utils.js";
import { expr } from "../../expr.js";
import { serialize } from "../php/expr-serialize.js";

export function when(...args: Parameters<typeof expr>) {
  const { node } = expr(...args);

  return (onTrue: unknown, onFalse?: unknown) => {
    return [
      markHTMLString(`@if (${serialize(node)})\n`),
      onTrue,
      ...(onFalse ? [markHTMLString(`\n@else\n`), onFalse] : []),
      markHTMLString(`\n@endif\n`),
    ];
  };
}
