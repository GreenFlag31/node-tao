const DEFAULT_EXTENSION = 'html';
const DEFAULT_OPENING = '<%';
const DEFAULT_CLOSING = '%>';
const DEFAULT_EXEC = '';
const DEFAULT_INTERPOLATE = '=';
const DEFAULT_RAW = '~';

const TEMPLATE_VARNAME = 'it';
const HELPER_VARNAME = 'hp';

const TP_VARNAME_WITH_PREFIX = `__${TEMPLATE_VARNAME}`;
const HELPER_WITH_PREFIX = `__${HELPER_VARNAME}`;
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

export {
  DEFAULT_EXTENSION,
  templateLitReg,
  singleQuoteReg,
  doubleQuoteReg,
  escMap,
  TEMPLATE_VARNAME,
  DYNAMICAL_TEMPLATE_PREFIX,
  TP_VARNAME_WITH_PREFIX,
  HELPER_WITH_PREFIX,
  HELPER_VARNAME,
  DEFAULT_CLOSING,
  DEFAULT_OPENING,
  DEFAULT_EXEC,
  DEFAULT_INTERPOLATE,
  DEFAULT_RAW,
};
