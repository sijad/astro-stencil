import { isPathNodeProxy } from "./data.js";

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

function literal(value: string | number | boolean): LiteralNode {
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

  throw new Error(`Unsupported type ${value}`);
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

type Token =
  | { type: "literal"; value: boolean | number | string }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: string }
  | { type: "paren"; value: "(" | ")" };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i]!;

    // whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // parentheses
    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      i++;
      continue;
    }

    const two = input.slice(i, i + 2);

    if (
      two === "==" ||
      two === "!=" ||
      two === "&&" ||
      two === "||" ||
      two === "<=" ||
      two === ">="
    ) {
      tokens.push({ type: "operator", value: two });
      i += 2;
      continue;
    }

    if (char === ">" || char === "<" || char === "!") {
      tokens.push({ type: "operator", value: char });
      i++;
      continue;
    }

    // string literal
    if (char === '"' || char === "'") {
      const quote = char;
      i++;
      let str = "";

      while (i < input.length) {
        const current = input[i];

        // handle escape
        if (current === "\\") {
          i++;
          if (i >= input.length) {
            throw new Error("Unterminated escape sequence");
          }

          const escaped = input[i];

          switch (escaped) {
            case "n":
              str += "\n";
              break;
            case "t":
              str += "\t";
              break;
            case "r":
              str += "\r";
              break;
            case "\\":
              str += "\\";
              break;
            case '"':
              str += '"';
              break;
            case "'":
              str += "'";
              break;
            default:
              // keep unknown escape as-is (JS behavior-like)
              str += escaped;
          }

          i++;
          continue;
        }

        // closing quote
        if (current === quote) {
          i++;
          tokens.push({ type: "literal", value: str });
          break;
        }

        str += current;
        i++;
      }

      if (i > input.length) {
        throw new Error("Unterminated string literal");
      }

      continue;
    }

    // number literal
    if (/\d/.test(char)) {
      let num = "";
      while (i < input.length && /[\d.]/.test(input[i]!)) {
        num += input[i++];
      }
      tokens.push({ type: "literal", value: Number(num) });
      continue;
    }

    // identifier / boolean
    if (/[a-zA-Z_]/.test(char)) {
      let word = "";
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i]!)) {
        word += input[i++];
      }

      if (word === "true" || word === "false") {
        tokens.push({
          type: "literal",
          value: word === "true",
        });
      } else {
        tokens.push({
          type: "identifier",
          value: word,
        });
      }
      continue;
    }

    throw new Error("Unexpected character: " + char);
  }

  return tokens;
}

function exprParser(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Expression {
  let input = "";
  for (let i = 0; i < strings.length; i++) {
    input += strings[i];
    if (i < values.length) {
      const val = values[i];
      if (typeof val === "string") {
        input += JSON.stringify(val);
      } else if (typeof val === "number") {
        input += val;
      } else if (typeof val === "boolean") {
        input += val ? "true" : "false";
      } else if (isPathNodeProxy(val)) {
        input += `__VAL_${i}`;
      } else {
        throw new Error("unsupported value");
      }
    }
  }

  const tokens = tokenize(input);
  let position = 0;

  function peek() {
    return tokens[position]!;
  }

  function consume() {
    return tokens[position++]!;
  }

  // --- Parsing functions ---
  function parseExpression(): ASTNode {
    return parseOr();
  }

  function parseOr(): ASTNode {
    let left = parseAnd();
    while (peek()?.type === "operator" && peek()?.value === "||") {
      consume();
      const right = parseAnd();
      left = { type: "binary", op: "or", left, right };
    }
    return left;
  }

  function parseAnd(): ASTNode {
    let left = parseCompare();
    while (peek()?.type === "operator" && peek()?.value === "&&") {
      consume();
      const right = parseCompare();
      left = { type: "binary", op: "and", left, right };
    }
    return left;
  }

  function parseCompare(): ASTNode {
    let left = parseUnary();
    while (
      peek()?.type === "operator" &&
      ["==", "!=", ">", "<", "<=", ">="].includes(peek().value as string)
    ) {
      const op = consume().value as string;
      const map = {
        "==": "eq",
        "!=": "neq",
        "<": "lt",
        "<=": "lte",
        ">": "gt",
        ">=": "gte",
      } as const;
      const right = parseUnary();
      left = { type: "binary", op: map[op as keyof typeof map], left, right };
    }
    return left;
  }

  function parseUnary(): ASTNode {
    if (peek()?.type === "operator" && peek()?.value === "!") {
      consume();
      const argument = parseUnary();
      return { type: "unary", op: "not", argument };
    }
    return parsePrimary();
  }

  function parsePrimary(): ASTNode {
    const token = peek();
    if (!token) throw new Error("Unexpected end of input");

    if (token.type === "paren" && token.value === "(") {
      consume();
      const expr = parseExpression();
      if (peek()?.type !== "paren" || peek()?.value !== ")") {
        throw new Error("Missing closing parenthesis");
      }
      consume();
      return expr;
    }

    if (token.type === "literal") {
      consume();
      return { type: "literal", value: token.value };
    }

    if (token.type === "identifier") {
      consume();
      const v = values[parseInt(token.value.slice(6))];

      if (!isPathNodeProxy(v)) {
        throw new Error("identifier detection failed");
      }

      return {
        type: "identifier",
        name: v.raw(),
      };
    }

    throw new Error("Unexpected token");
  }

  const ast = parseExpression();
  if (position < tokens.length) {
    throw new Error("Unexpected token at end");
  }

  return new Expression(ast);
}

expr.not = function not(value: unknown): Expression {
  return new Expression(
    unary(
      "not",
      value instanceof Expression
        ? value.node
        : new Expression(wrapValue(value)).node,
    ),
  );
};

export function expr(value: unknown): Expression;
export function expr(value: (e: typeof expr) => Expression): Expression;
export function expr(
  first: ((e: typeof expr) => Expression) | TemplateStringsArray,
  ...rest: unknown[]
): Expression;
export function expr(
  first: unknown | TemplateStringsArray,
  ...rest: unknown[]
): Expression {
  if (Array.isArray(first) && "raw" in first) {
    return exprParser(first as TemplateStringsArray, ...rest);
  }

  if (typeof first === "function") {
    const e = first(expr);

    if (!(e instanceof Expression)) {
      throw new Error("when() callback must return Expression");
    }

    return e;
  }

  return new Expression(wrapValue(first));
}
