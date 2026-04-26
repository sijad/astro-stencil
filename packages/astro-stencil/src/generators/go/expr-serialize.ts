import { ASTNode } from "../../expr.js";

export function serialize(node: ASTNode): string {
  switch (node.type) {
    case "literal":
      return JSON.stringify(node.value);

    case "identifier":
      return node.name;

    case "unary": {
      const value = serialize(node.argument);
      switch (node.op) {
        case "not":
          return `(not ${value})`;
      }
      break;
    }

    case "binary": {
      const { op } = node;

      const left = serialize(node.left);
      const right = serialize(node.right);

      switch (op) {
        case "and":
          return `(and ${left} ${right})`;
        case "or":
          return `(or ${left} ${right})`;
        case "eq":
          return `(eq ${left} ${right})`;
        case "neq":
          return `(ne ${left} ${right})`;
        case "lt":
          return `(lt ${left} ${right})`;
        case "lte":
          return `(le ${left} ${right})`;
        case "gt":
          return `(gt ${left} ${right})`;
        case "gte":
          return `(ge ${left} ${right})`;
      }
    }
  }
}
