import { isTemplateDynamicallyDefined } from './validations';
import {
  ESC_MAP,
  HELPER_VARNAME,
  PLACEHOLDER_VAR_END,
  PLACEHOLDER_VAR_START,
  TEMPLATE_VARNAME,
  TP_VARNAME_WITH_PREFIX,
} from './const';
import {
  ChildTemplateFunction,
  Data,
  DataOrHelper,
  DefinitiveOptions,
  ErrorData,
  ErrorType,
  FileResolution,
  HelperFunction,
  Helpers,
  TagType,
  TemplateData,
  TemplateFunction,
} from './interfaces';
import path from 'node:path';
import { Store } from './store';
import { logger } from './error-utils';

const VALID_IDENTIFIER = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

function initVariablesAndHelpers(dataOrHelpers: DataOrHelper) {
  const dataEntries = Object.entries(dataOrHelpers);
  let variables = '';

  for (const [key, value] of dataEntries) {
    if (!VALID_IDENTIFIER.test(key)) {
      throw new Error(`Invalid data key: "${key}". Keys must be valid JavaScript identifiers.`);
    }

    let valueStr: string;
    try {
      valueStr = `${getValueType(value)}`;
    } catch {
      logger('warn', `Value for key "${key}" is not serializable. Fallback to null.`);
      valueStr = 'null';
    }

    variables += `const ${key} = ${valueStr};`;
  }

  return variables;
}

function getValueType(value: any) {
  if (valueIsAFunction(value)) return value;
  if (valueIsASymbol(value)) return value;
  if (valueIsABigint(value)) return value;
  if (valueIsNaN(value)) return value;
  if (valueIsInfinity(value)) return value;
  const objectTransformed = valueIsAnObject(value);
  if (objectTransformed) return objectTransformed;

  return JSON.stringify(value);
}

function valueIsAnObject(value: any) {
  if (typeof value !== 'object') return false;

  return (
    JSON.stringify(value, (_key, val) => {
      if (typeof val !== 'number') return val;

      // avoid stringify replacement NaN / Infinity with "null"
      if (isNaN(val) || !isFinite(val)) return val.toString();
      return val;
    })
      // string should be converted with real value
      .replace(/"NaN"/g, 'NaN')
      .replace(/"Infinity"/g, 'Infinity')
      .replace(/"-Infinity"/g, '-Infinity')
  );
}

function valueIsNaN(value: any) {
  if (typeof value !== 'number') return false;

  return isNaN(value);
}

function valueIsInfinity(value: any) {
  if (typeof value !== 'number') return false;

  return Math.abs(value) === Infinity;
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
  return `const include = (templatePath, dataOrHelpers) => {
      const data = {...${TEMPLATE_VARNAME}, ...dataOrHelpers};
      const rendered = this.renderChild(templatePath, data);
      if (rendered.isAChildError) throw rendered;
      return rendered;
  }`;
}

function isAChildError(error: any): error is ErrorData {
  return error.isAChildError;
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

  return parseOptions[prefix] ?? null;
}

function compileBody(templateValues: TemplateData[], config: DefinitiveOptions) {
  let result = '';

  for (const { type, value } of templateValues) {
    if (type === null) {
      if (!value.trim()) continue; // otherwise this can break switch/case

      // HTML content
      result += `${TP_VARNAME_WITH_PREFIX}.res+='${value}';\n`;
      continue;
    }

    result += compileContent(type, value, config);
  }

  return result;
}

function compileContent(type: any, value: string, config: DefinitiveOptions) {
  if (type === 'raw') {
    return `${TP_VARNAME_WITH_PREFIX}.res+=${value}\n`;
  }

  if (type === 'execute') {
    return `${value}\n`;
  }

  // interpolate
  if (config.autoEscape) {
    value = `${TP_VARNAME_WITH_PREFIX}.e(${value})`;
  }

  return `${TP_VARNAME_WITH_PREFIX}.res+=${value};\n`;
}

/**
 * Inject data and helpers at every template execution.
 * Always keep placeholders.
 */
function injectDataAndHelpersInTemplate(
  dataOrHelpers: DataOrHelper,
  helpersStore: Store<HelperFunction>,
  executableContent: string,
) {
  let newVariables = PLACEHOLDER_VAR_START;
  newVariables += initVariablesAndHelpers(dataOrHelpers);
  newVariables += initVariablesAndHelpers(helpersStore.getAll());
  newVariables += PLACEHOLDER_VAR_END;

  const startIndex = executableContent.indexOf(PLACEHOLDER_VAR_START);
  const endIndex = executableContent.indexOf(PLACEHOLDER_VAR_END);

  const oldVariables = executableContent.substring(
    startIndex,
    endIndex + PLACEHOLDER_VAR_END.length,
  );
  const contentReplaced = executableContent.replace(oldVariables, newVariables);

  return contentReplaced;
}

function compileChildToFunction(contentReplaced: string) {
  try {
    return new Function(TEMPLATE_VARNAME, HELPER_VARNAME, contentReplaced) as ChildTemplateFunction;
  } catch (error: any) {
    const type: ErrorType = 'Compilation Error';
    error.type = type;
    throw error;
  }
}

function compileToFunction(contentReplaced: string) {
  try {
    return new Function(
      TEMPLATE_VARNAME,
      HELPER_VARNAME,
      'ɵɵstart',
      'ɵɵcacheHit',
      contentReplaced,
    ) as TemplateFunction;
  } catch (error: any) {
    const type: ErrorType = 'Compilation Error';
    error.type = type;
    throw error;
  }
}

function getPathWithExtension(filePath: string, extension: string) {
  if (isTemplateDynamicallyDefined(filePath)) return filePath;

  const normalizedFilePath = normalizeFilesPath(filePath);
  const pathWithoutExtension = normalizedFilePath.replace(`.${extension}`, '');

  return `${pathWithoutExtension}.${extension}`;
}

function cloneData(dataOrHelpers: DataOrHelper) {
  const data: Data = {};
  const helpers: Helpers = {};

  for (const [key, value] of Object.entries(dataOrHelpers)) {
    const isAFunction = valueIsAFunction(value);

    if (isAFunction) {
      helpers[key] = value;
      continue;
    }

    data[key] = value;
  }

  return { data: structuredClone(data), helpers };
}

/**
 * If path resolution is set to "flexible", do not return the full path, it's usefull for providing only unique end path.
 */
function getResolvedPath(views: string, pathWithExtension: string, fileResolution: FileResolution) {
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

function replaceChar(input: string): string {
  return ESC_MAP[input];
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
  compileBody,
  includeFn,
  initVariablesAndHelpers,
  getResolvedPath,
  getPathWithExtension,
  normalizeFilesPath,
  getFileName,
  valueIsAFunction,
  injectDataAndHelpersInTemplate,
  compileToFunction,
  compileChildToFunction,
  isAChildError,
  cloneData,
};
