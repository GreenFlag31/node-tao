import type { DefinitiveConfig } from './config copy';
import type { EtaConfig as OriginalConfig } from './config';
import { escMap, TEMPLATE_VARNAME, TP_VARNAME_WITH_PREFIX } from './const';
import { AstObject, Parse, TagType } from './interfaces';
import { escapeRegExp } from './parse copy';

function buildLayoutFunction(isLayout: boolean) {
  if (!isLayout) return '';

  return `function layout(path, data, cache) {
    ${TP_VARNAME_WITH_PREFIX}.layoutPath = path;
    ${TP_VARNAME_WITH_PREFIX}.layoutData = data;
    ${TP_VARNAME_WITH_PREFIX}.layoutCache = cache;
  }`;
}

function includeLayoutContent(isLayout: boolean, isAsync: boolean) {
  if (!isLayout) return '';
  const include = isAsync ? 'await includeAsync' : 'include';

  return `if (${TP_VARNAME_WITH_PREFIX}.layoutPath) {
    ${TP_VARNAME_WITH_PREFIX}.res = ${include}(${TP_VARNAME_WITH_PREFIX}.layoutPath, {...${TEMPLATE_VARNAME}, body: ${TP_VARNAME_WITH_PREFIX}.res, ...${TP_VARNAME_WITH_PREFIX}.layoutData},
    ${TP_VARNAME_WITH_PREFIX}.layoutCache);
  }`;
}

function includeFn(isInclude: boolean, isLayout: boolean) {
  if (!isInclude && !isLayout) return '';

  return `const include = (templatePath, data, cache) => this.render(templatePath, data, cache);`;
}

function includeAsyncFn(isIncludeAsync: boolean, isLayout: boolean) {
  if (!isIncludeAsync && !isLayout) return '';

  return `const includeAsync = (templatePath, data, cache) => this.renderAsync(templatePath, data, cache);`;
}

function convertToCR(value: string) {
  return value.replace(/\\|'/g, '\\$&').replace(/\r\n|\n|\r/g, '\\n');
}

function getCurrentPrefixType(prefix: string, parse: DefinitiveConfig['parse']): TagType {
  const parseOptions: Record<string, TagType> = {
    [parse.exec]: 'execute',
    [parse.raw]: 'raw',
    [parse.interpolate]: 'interpolate',
  };

  return parseOptions[prefix] ?? '';
}

function compileBody(templateValues: AstObject[], config: DefinitiveConfig) {
  let result = '';

  for (const value of templateValues) {
    if (typeof value === 'string') {
      // HTML content
      result += `__${TEMPLATE_VARNAME}.res+='${value}';\n`;
      continue;
    }

    const { type, content = '' } = value;
    result += compileContent(type, content, config);
  }

  return result;
}

function compileContent(type: TagType, content: string, config: DefinitiveConfig) {
  const { autoEscape, autoFilter } = config;

  if (type === 'raw') {
    if (autoFilter) {
      content = `${TP_VARNAME_WITH_PREFIX}.f(${content});`;
    }

    return `${TP_VARNAME_WITH_PREFIX}.res+=${content};\n`;
  }

  if (type === 'interpolate') {
    if (autoFilter) {
      content = `${TP_VARNAME_WITH_PREFIX}.f(${content})`;
    }

    if (autoEscape) {
      content = `${TP_VARNAME_WITH_PREFIX}.e(${content})`;
    }

    return `${TP_VARNAME_WITH_PREFIX}.res+=${content};\n`;
  }

  if (type === 'execute') {
    return `${content}\n`;
  }
}

function buildPrefixRegex(parseOptions: Parse) {
  const options: string[] = [];

  for (const prefix of Object.values(parseOptions)) {
    if (!prefix) continue;

    const prefixEscaped = escapeRegExp(prefix);
    options.push(prefixEscaped);
  }

  return options.join('|');
}

/**
 * Takes a string within a template and trims it, based on the preceding tag's whitespace control and `config.autoTrim`
 */
function trimWS(
  str: string,
  config: OriginalConfig,
  wsLeft: string | false,
  wsRight?: string | false
): string {
  let leftTrim;
  let rightTrim;

  if (Array.isArray(config.autoTrim)) {
    // Slightly confusing,
    // but _}} will trim the left side of the following string
    leftTrim = config.autoTrim[1];
    rightTrim = config.autoTrim[0];
  } else {
    leftTrim = rightTrim = config.autoTrim;
  }

  if (wsLeft || wsLeft === false) {
    leftTrim = wsLeft;
  }

  if (wsRight || wsRight === false) {
    rightTrim = wsRight;
  }

  if (!rightTrim && !leftTrim) {
    return str;
  }

  if (leftTrim === 'slurp' && rightTrim === 'slurp') {
    return str.trim();
  }

  if (leftTrim === '_' || leftTrim === 'slurp') {
    // full slurp
    str = str.trimStart();
  } else if (leftTrim === '-' || leftTrim === 'nl') {
    // nl trim
    str = str.replace(/^(?:\r\n|\n|\r)/, '');
  }

  if (rightTrim === '_' || rightTrim === 'slurp') {
    // full slurp
    str = str.trimEnd();
  } else if (rightTrim === '-' || rightTrim === 'nl') {
    // nl trim
    str = str.replace(/(?:\r\n|\n|\r)$/, '');
  }

  return str;
}

function replaceChar(input: string): string {
  return escMap[input];
}

/**
 * XML-escapes an input value after converting it to a string
 * @param value - Input value (usually a string)
 * @returns XML-escaped string
 */
function XMLEscape(input: unknown): string {
  const newStr = String(input);
  if (/[&<>"']/.test(newStr)) {
    return newStr.replace(/[&<>"']/g, replaceChar);
  }

  return newStr;
}

export {
  trimWS,
  XMLEscape,
  convertToCR,
  getCurrentPrefixType,
  compileContent,
  buildPrefixRegex,
  buildLayoutFunction,
  compileBody,
  includeLayoutContent,
  includeFn,
  includeAsyncFn,
};
