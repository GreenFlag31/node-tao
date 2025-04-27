const DEFAULT_EXTENSION = ".eta";

const templateLitReg = /`(?:\\[\s\S]|\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})*}|(?!\${)[^\\`])*`/g;
const singleQuoteReg = /'(?:\\[\s\w"'\\`]|[^\n\r'\\])*?'/g;
const doubleQuoteReg = /"(?:\\[\s\w"'\\`]|[^\n\r"\\])*?"/g;

/**
 * A map of special HTML characters to their XML-escaped equivalents
 */
const escMap: { [key: string]: string } = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const AsyncFunction = async function () {}.constructor;

export { DEFAULT_EXTENSION, templateLitReg, singleQuoteReg, doubleQuoteReg, escMap, AsyncFunction };
