export class HTMLString extends String {
  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  get [Symbol.toStringTag]() {
    return "HTMLString";
  }
}

export const markHTMLString = (value: string) => {
  return new HTMLString(value) as unknown as string;
};
