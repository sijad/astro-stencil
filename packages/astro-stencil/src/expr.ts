import { isPathNodeProxy } from "./data";

export type Operator =
  | "eq"
  | "neq"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "and"
  | "or";

export type UnaryOperator = "not";

export interface LiteralNode {
  readonly type: "literal";
  readonly value: string | number | boolean;
}

export interface IdentifierNode {
  readonly type: "identifier";
  readonly name: string;
}

export interface UnaryExpressionNode {
  readonly type: "unary";
  readonly op: UnaryOperator;
  readonly argument: ASTNode;
}

export interface BinaryExpressionNode {
  readonly type: "binary";
  readonly op: Operator;
  readonly left: ASTNode;
  readonly right: ASTNode;
}

export type ASTNode =
  | LiteralNode
  | IdentifierNode
  | UnaryExpressionNode
  | BinaryExpressionNode;

function literal(value: string | number | boolean | null): LiteralNode {
  return { type: "literal", value };
}

function identifier(name: string): IdentifierNode {
  return { type: "identifier", name };
}

function binary(
  op: Operator,
  left: ASTNode,
  right: ASTNode,
): BinaryExpressionNode {
  return { type: "binary", op, left, right };
}

function unary(op: UnaryOperator, argument: ASTNode): UnaryExpressionNode {
  return { type: "unary", op, argument };
}

function wrapValue(value: unknown): ASTNode {
  if (value instanceof Expression) {
    return value.node;
  }

  if (isPathNodeProxy(value)) {
    return identifier(value.raw());
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return literal(value);
  }

  return literal(null);
}

export class Expression {
  readonly node: ASTNode;

  constructor(node: ASTNode) {
    this.node = node;
  }

  eq(value: unknown) {
    return this._binary("eq", value);
  }
  neq(value: unknown) {
    return this._binary("neq", value);
  }
  lt(value: unknown) {
    return this._binary("lt", value);
  }
  lte(value: unknown) {
    return this._binary("lte", value);
  }
  gt(value: unknown) {
    return this._binary("gt", value);
  }
  gte(value: unknown) {
    return this._binary("gte", value);
  }

  and(value: unknown) {
    return this._binary("and", value);
  }
  or(value: unknown) {
    return this._binary("or", value);
  }

  not(): Expression {
    return new Expression(unary("not", this.node));
  }

  private _binary(operator: Operator, value: unknown): Expression {
    let rightNode: ASTNode;

    if (value instanceof Expression) {
      rightNode = value.node;
    } else if (typeof value === "function") {
      const built = value(expr);
      if (!(built instanceof Expression)) {
        throw new Error("Grouping function must return Expression");
      }
      rightNode = built.node;
    } else {
      rightNode = wrapValue(value);
    }

    return new Expression(binary(operator, this.node, rightNode));
  }
}

export function expr(value: unknown): Expression {
  return new Expression(wrapValue(value));
}

expr.not = function not(value: unknown): Expression {
  return new Expression(
    unary("not", value instanceof Expression ? value.node : expr(value).node),
  );
};

export function when(builder: (e: typeof expr) => Expression) {
  const root = builder(expr);

  if (!(root instanceof Expression)) {
    throw new Error("when() callback must return Expression");
  }

  const ast = root.node;

  return {
    ast,
  };
}

export function hasLowerPrecedence(
  parentOp: Operator | UnaryOperator,
  child: ASTNode,
): boolean {
  const PRECEDENCE: Record<Operator | UnaryOperator, number> = {
    or: 1,
    and: 2,
    eq: 3,
    neq: 3,
    lt: 4,
    lte: 4,
    gt: 4,
    gte: 4,
    not: 5,
  };

  if (child.type !== "binary" && child.type !== "unary") return false;

  const parentPrec = PRECEDENCE[parentOp];
  const childPrec =
    child.type === "binary" ? PRECEDENCE[child.op] : PRECEDENCE[child.op];

  return childPrec < parentPrec;
}
