import { markHTMLString } from "../../utils";
import { type expr, type Expression, when as exprWhen } from "../../expr";
import { serialize } from "./expr-serialize";

export function when(builder: (e: typeof expr) => Expression) {
  const { ast } = exprWhen(builder);

  return (onTrue: unknown, onFalse?: unknown) => {
    return [
      markHTMLString(`<?php if(${serialize(ast)}): ?>`),
      onTrue,
      ...(onFalse ? [markHTMLString(`<?php else: ?>`), onFalse] : []),
      markHTMLString(`<?php endif; ?>`),
    ];
  };
}
