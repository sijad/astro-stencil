import { isPathNodeProxy } from "./data";
import { Expression, type ASTNode, type Operator } from "./expr";

type Token =
  | { type: "literal"; value: boolean | number | string }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: string }
  | { type: "paren"; value: "(" | ")" };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

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
      while (i < input.length && /[\d.]/.test(input[i])) {
        num += input[i++];
      }
      tokens.push({ type: "literal", value: Number(num) });
      continue;
    }

    // identifier / boolean
    if (/[a-zA-Z_]/.test(char)) {
      let word = "";
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
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

export function exprParser(
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
    return tokens[position];
  }

  function consume() {
    return tokens[position++];
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
      };
      const right = parseUnary();
      left = { type: "binary", op: map[op], left, right };
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
