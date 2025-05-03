const DEFAULT_EXTENSION = '.eta';
const TEMPLATE_VARNAME = 'nte';
const TP_VARNAME_ANONYMOUS_FN = `__${TEMPLATE_VARNAME}`;
const DYNAMICAL_TEMPLATE_PREFIX = '@';

const templateLitReg = /`(?:\\[\s\S]|\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})*}|(?!\${)[^\\`])*`/g;
const singleQuoteReg = /'(?:\\[\s\w"'\\`]|[^\n\r'\\])*?'/g;
const doubleQuoteReg = /"(?:\\[\s\w"'\\`]|[^\n\r"\\])*?"/g;

/**
 * A map of special HTML characters to their XML-escaped equivalents
 */
const escMap: { [key: string]: string } = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const AsyncFunction = async function () {}.constructor;

export {
  DEFAULT_EXTENSION,
  templateLitReg,
  singleQuoteReg,
  doubleQuoteReg,
  escMap,
  AsyncFunction,
  TEMPLATE_VARNAME,
  DYNAMICAL_TEMPLATE_PREFIX,
  TP_VARNAME_ANONYMOUS_FN,
};
