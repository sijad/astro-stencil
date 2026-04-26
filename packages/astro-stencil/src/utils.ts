const htmlStringSymbol = Symbol.for("astro:html-string");

export class HTMLString extends String {
  [htmlStringSymbol] = true;
}

export const markHTMLString = (value: string) => {
  return new HTMLString(value) as unknown as string;
};
