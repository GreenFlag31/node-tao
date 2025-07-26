const DEFAULT_EXTENSION = 'html';
const DEFAULT_OPENING = '<%';
const DEFAULT_CLOSING = '%>';

const DEFAULT_EXEC = '';
const DEFAULT_INTERPOLATE = '=';
const DEFAULT_RAW = '~';

const TEMPLATE_VARNAME = 'it';
const HELPER_VARNAME = 'hp';

/**
 * Internal variable signal.
 */
const PRIVATE_ONLY = 'ɵɵ';

const TP_VARNAME_WITH_PREFIX = `${PRIVATE_ONLY}${TEMPLATE_VARNAME}`;
const HELPER_WITH_PREFIX = `${PRIVATE_ONLY}${HELPER_VARNAME}`;
const DYNAMICAL_TEMPLATE_PREFIX = '@';

const PLACEHOLDER_VAR_START = '"<injected-var-start>";';
const PLACEHOLDER_VAR_END = '"<injected-var-end>";';

const LITERAL_REGEX = /`(?:\\[\s\S]|\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})*}|(?!\${)[^\\`])*`/g;
const SINGLE_QUOTE_REGEX = /'(?:\\[\s\w"'\\`]|[^\n\r'\\])*?'/g;
const DOUBLE_QUOTE_REGEX = /"(?:\\[\s\w"'\\`]|[^\n\r"\\])*?"/g;

/**
 * A map of special HTML characters to their XML-escaped equivalents
 */
const ESC_MAP: { [key: string]: string } = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export {
  DEFAULT_EXTENSION,
  LITERAL_REGEX,
  SINGLE_QUOTE_REGEX,
  DOUBLE_QUOTE_REGEX,
  ESC_MAP,
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
  PLACEHOLDER_VAR_START,
  PLACEHOLDER_VAR_END,
};
