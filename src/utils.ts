import { escMap, HELPER_VARNAME, TEMPLATE_VARNAME, TP_VARNAME_WITH_PREFIX } from './const';
import {
  AstObject,
  Data,
  DefinitiveConfig,
  FileResolution,
  Helpers,
  Parse,
  TagType,
} from './interfaces';
import { escapeRegExp } from './parse copy';
import path from 'node:path';

function initVariablesAndHelpers(dataOrHelpers: Data | Helpers) {
  const dataEntries = Object.entries(dataOrHelpers);

  let variables = '';
  for (const [key, value] of dataEntries) {
    variables += `const ${key} = ${getValueType(value)};`;
  }

  // log(variables);
  return variables;
}

function getValueType(value: any) {
  const valueIsAFunction = typeof value === 'function';
  if (valueIsAFunction) return value;

  return JSON.stringify(value);
}

function includeFn(isInclude: boolean) {
  if (!isInclude) return '';

  return `const include = (templatePath, data = ${TEMPLATE_VARNAME}, helpers = ${HELPER_VARNAME}) => this.render(templatePath, data, helpers);`;
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

  // escaping if not found
  return parseOptions[prefix] ?? '=';
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
  const { autoEscape } = config;
  const prefix = TP_VARNAME_WITH_PREFIX;

  if (type === 'raw') {
    return `${prefix}.res+=${content};\n`;
  }

  if (type === 'interpolate') {
    if (autoEscape) {
      content = `${prefix}.e(${content})`;
    }

    return `${prefix}.res+=${content};\n`;
  }

  if (type === 'execute') {
    return `${content}\n`;
  }
}

function getFullPath(views: string, tpPathWithExtension: string, fileResolution: FileResolution) {
  if (fileResolution === 'flexible') return tpPathWithExtension;

  const isAbsolutePath = path.isAbsolute(tpPathWithExtension);
  if (isAbsolutePath) return tpPathWithExtension;

  return path.join(views, tpPathWithExtension);
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
  XMLEscape,
  convertToCR,
  getCurrentPrefixType,
  compileContent,
  buildPrefixRegex,
  compileBody,
  includeFn,
  initVariablesAndHelpers,
  getFullPath,
};
