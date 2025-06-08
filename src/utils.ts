import { isTemplateDynamicallyDefined } from './checks';
import { escMap, HELPER_VARNAME, TEMPLATE_VARNAME, TP_VARNAME_WITH_PREFIX } from './const';
import {
  AstObject,
  Data,
  DefinitiveOptions,
  FileResolution,
  Helpers,
  Parse,
  TagType,
} from './interfaces';
import path from 'node:path';

function initVariablesAndHelpers(dataOrHelpers: Data | Helpers) {
  const dataEntries = Object.entries(dataOrHelpers);
  let variables = '';

  for (const [key, value] of dataEntries) {
    variables += `const ${key} = ${getValueType(value)};`;
  }

  return variables;
}

function getValueType(value: any) {
  if (valueIsAFunction(value)) return value;

  return JSON.stringify(value);
}

function valueIsAFunction(value: Function) {
  return typeof value === 'function';
}

function includeFn(isInclude: boolean) {
  if (!isInclude) return '';

  return `const include = (templatePath, data, helpers) => {
    data = {...${TEMPLATE_VARNAME}, ...data};
    helpers = {...${HELPER_VARNAME}, ...helpers};
    return this.render(templatePath, data, helpers);
  }`;
}

function escapeJSLiteral(value: string) {
  // example: I'm using \ today → I\'m using \\ today
  return value.replace(/\\|'/g, '\\$&').replace(/\r\n|\n|\r/g, '\\n');
}

function getCurrentPrefixType(prefix: string, parse: DefinitiveOptions['parse']) {
  const parseOptions: Record<string, TagType> = {
    [parse.exec]: 'execute',
    [parse.raw]: 'raw',
    [parse.interpolate]: 'interpolate',
  };

  // escaping by default if null | undefined
  return parseOptions[prefix] ?? parse.interpolate;
}

function compileBody(templateValues: AstObject[], config: DefinitiveOptions) {
  let result = '';

  for (const value of templateValues) {
    if (typeof value === 'string') {
      // HTML content
      result += `${TP_VARNAME_WITH_PREFIX}.res+='${value}';\n`;
      continue;
    }

    const { type, content = '' } = value;
    result += compileContent(type, content, config);
  }

  return result;
}

function compileContent(type: TagType, content: string, config: DefinitiveOptions) {
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

function getPathWithExtension(filePath: string, extension: string) {
  if (isTemplateDynamicallyDefined(filePath)) return filePath;

  const pathContainsExtension = path.extname(filePath);
  if (pathContainsExtension) return filePath;

  return `${filePath}.${extension}`;
}

/**
 * If path resolution is set to "flexible", do not return the full path.
 */
function getFullPath(views: string, pathWithExtension: string, fileResolution: FileResolution) {
  if (fileResolution === 'flexible') return pathWithExtension;

  const isAbsolutePath = path.isAbsolute(pathWithExtension);
  if (isAbsolutePath) return pathWithExtension;

  const fullPath = path.join(views, pathWithExtension);
  return normalizeFilesPath(fullPath);
}

/**
 * Normalize file path on windows.
 */
function normalizeFilesPath(file: string) {
  return file.replace(/\\/g, '/');
}

function getFileName(filename: string) {
  return filename.split('/').at(-1)!;
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
 * Escape special regular expression characters inside a string
 * MDN
 */
function escapeRegExp(string: string) {
  // $& means the whole matched string
  return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
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
  escapeJSLiteral,
  getCurrentPrefixType,
  compileContent,
  buildPrefixRegex,
  compileBody,
  includeFn,
  initVariablesAndHelpers,
  getFullPath,
  escapeRegExp,
  getPathWithExtension,
  normalizeFilesPath,
  getFileName,
  valueIsAFunction,
};
