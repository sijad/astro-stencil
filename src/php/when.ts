import { markHTMLString } from "../utils";
import {
  expr,
  Expression,
  when as exprWhen,
  hasLowerPrecedence,
  type ASTNode,
} from "../expr";

export function serialize(node: ASTNode): string {
  switch (node.type) {
    case "literal":
      return JSON.stringify(node.value);

    case "identifier":
      return `${node.name}`;

    case "unary": {
      let value = serialize(node.argument);
      if (hasLowerPrecedence(node.op, node.argument)) {
        value = `(${value})`;
      }
      switch (node.op) {
        case "not":
          return `!${value}`;
      }
      break;
    }

    case "binary": {
      const { op } = node;

      let left = serialize(node.left);
      let right = serialize(node.right);

      if (hasLowerPrecedence(op, node.left)) {
        left = `(${left})`;
      }

      if (hasLowerPrecedence(op, node.right)) {
        right = `(${right})`;
      }

      switch (op) {
        case "and":
          return `${left} && ${right}`;
        case "or":
          return `${left} || ${right}`;
        case "eq":
          return `${left} === ${right}`;
        case "neq":
          return `${left} !== ${right}`;
        case "lt":
          return `${left} < ${right}`;
        case "lte":
          return `${left} <= ${right}`;
        case "gt":
          return `${left} > ${right}`;
        case "gte":
          return `${left} >= ${right}`;
      }
    }
  }
}

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
