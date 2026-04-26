import { ASTNode, hasLowerPrecedence } from "../../expr.js";

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
