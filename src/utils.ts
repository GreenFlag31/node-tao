import { isTemplateDynamicallyDefined } from './checks';
import {
  escMap,
  HELPER_VARNAME,
  PLACEHOLDER_VAR_END,
  PLACEHOLDER_VAR_START,
  TEMPLATE_VARNAME,
  TP_VARNAME_WITH_PREFIX,
} from './const';
import {
  AstObject,
  Data,
  DefinitiveOptions,
  FileResolution,
  HelperFunction,
  Helpers,
  Parse,
  TagType,
  TemplateFunction,
} from './interfaces';
import path from 'node:path';
import { Store } from './store';

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
  if (valueIsASymbol(value)) return value;
  if (valueIsABigint(value)) return value;
  if (valueIsNaN(value)) return value;
  if (valueIsInfinity(value)) return value;

  return JSON.stringify(value);
}

function valueIsNaN(value: any) {
  if (typeof value !== 'number') return false;

  return isNaN(value);
}

function valueIsInfinity(value: any) {
  if (typeof value !== 'number') return false;
  const plusOrMinus = Math.abs(value);

  return plusOrMinus === Infinity;
}

function valueIsASymbol(value: Function) {
  return typeof value === 'symbol';
}

function valueIsABigint(value: Function) {
  return typeof value === 'bigint';
}

function valueIsAFunction(value: Function) {
  return typeof value === 'function';
}

function includeFn() {
  return `const include = (templatePath, data, helpers) => {
    data = {...${TEMPLATE_VARNAME}, ...data};
    helpers = {...${HELPER_VARNAME}, ...helpers};
    return this.render(templatePath, data, helpers);
  }`;
}
/**
 * Example: I'm using \ today → I\'m using \\ today
 */
function escapeJSLiteral(value: string) {
  return value.replace(/\\|'/g, '\\$&').replace(/\r\n|\n|\r/g, '\\n');
}

function getCurrentPrefixType(prefix: string, parse: DefinitiveOptions['parse']) {
  const parseOptions: Record<string, TagType> = {
    [parse.exec]: 'execute',
    [parse.raw]: 'raw',
    [parse.interpolate]: 'interpolate',
  };

  // escaping by default
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
    return `${prefix}.res+=${content}\n`;
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
 * Inject data and helpers at every template execution.
 * Always keep placeholders.
 */
function injectDataAndHelpersInTemplate(
  data: Data,
  helpers: Helpers,
  helpersStore: Store<HelperFunction>,
  executableContent: string
) {
  let newVariables = PLACEHOLDER_VAR_START;
  newVariables += initVariablesAndHelpers(data);
  newVariables += initVariablesAndHelpers(helpers);
  newVariables += initVariablesAndHelpers(helpersStore.getAll());
  newVariables += PLACEHOLDER_VAR_END;

  const startIndex = executableContent.indexOf(PLACEHOLDER_VAR_START);
  const endIndex = executableContent.indexOf(PLACEHOLDER_VAR_END);

  const oldVariables = executableContent.substring(
    startIndex,
    endIndex + PLACEHOLDER_VAR_END.length
  );
  const contentReplaced = executableContent.replace(oldVariables, newVariables);

  return contentReplaced;
}

function compileToFunction(contentReplaced: string) {
  return new Function(
    TEMPLATE_VARNAME,
    'hp',
    'ɵɵstart',
    'ɵɵcacheHit',
    contentReplaced
  ) as TemplateFunction;
}

/**
 * If path resolution is set to "flexible", do not return the full path, it's usefull for providing only unique end path.
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
 * XML-escapes an input value after converting it to a string.
 * Defaulted to empty string to not render "null" or "undefined" in the template.
 * @param value - Input value
 * @returns XML-escaped string
 */
function XMLEscape(input: unknown): string {
  const defaultedToEmptyString = input ?? '';
  const newStr = String(defaultedToEmptyString);

  return newStr.replace(/[&<>"']/g, replaceChar);
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
  injectDataAndHelpersInTemplate,
  compileToFunction,
};
