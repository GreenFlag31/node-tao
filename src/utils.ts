import { isTemplateDynamicallyDefined } from './checks';
import {
  ESC_MAP,
  HELPER_VARNAME,
  PLACEHOLDER_VAR_END,
  PLACEHOLDER_VAR_START,
  TEMPLATE_VARNAME,
  TP_VARNAME_WITH_PREFIX,
} from './const';
import {
  AstObject,
  ChildTemplateFunction,
  Data,
  DefinitiveOptions,
  ErrorData,
  ErrorType,
  FileResolution,
  HelperData,
  HelperFunction,
  Helpers,
  InjectedData,
  Parse,
  TagType,
  TemplateFunction,
  UserData,
  VariableData,
} from './interfaces';
import path from 'node:path';
import { Store } from './store';
import fs from 'fs';
import { fileIsUnique, findTemplateInMappedTemplates } from './templates-access';
import { log } from 'node:console';

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

/**
 * Extract injected template data (variables & helpers) to make them available through a json file for the vscode extension.
 */
function injectUserDataForVSCodeExtension(injectedData: InjectedData) {
  const { data, development, fullPath, helpers, helpersStore, templatePaths } = injectedData;

  if (!development) return;
  if (isTemplateDynamicallyDefined(fullPath)) return;

  const files = findTemplateInMappedTemplates(templatePaths, fullPath);
  if (!fileIsUnique(files)) return;

  const templateFilePath = files[0];
  const userDataFilePath = path.join(process.cwd(), '.vscode/tao-user-data.json');
  const userData = buildUserData(templateFilePath, data, helpers, helpersStore);

  try {
    fs.mkdirSync('.vscode', { recursive: true });
    const data = fs.readFileSync(userDataFilePath, 'utf8');
    const dataParsed: UserData[] = JSON.parse(data);

    const datas = getAllOtherUserDatas(templateFilePath, dataParsed);
    datas.push(userData);

    const allUserDataStringified = JSON.stringify(datas);
    fs.writeFileSync(userDataFilePath, allUserDataStringified);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      const userDataToArrayStringified = JSON.stringify([userData]);
      fs.writeFileSync(userDataFilePath, userDataToArrayStringified);
    }
  }
}

function getAllOtherUserDatas(fileName: string, userDatas: UserData[]) {
  return userDatas.filter((data) => data.template !== fileName);
}

function buildUserData(
  fileName: string,
  data: Data,
  helpers: Helpers,
  helpersStore: Store<HelperFunction>
) {
  const variables = Object.entries(data);
  const helpersName = Object.entries(helpers);
  const globalHelpersName = Object.entries(helpersStore.getAll());
  const allHelpers = [...helpersName, ...globalHelpersName];

  const variablesData: VariableData[] = [];
  for (const [key, value] of variables) {
    variablesData.push({
      name: key,
      type: typeof value,
    });
  }

  const helpersData: HelperData[] = [];
  for (const [key, fn] of allHelpers) {
    const source = getFunctionSignatureParams(fn);
    helpersData.push({
      name: key,
      params: source,
    });
  }

  const userData: UserData = {
    template: fileName,
    variables: variablesData,
    helpers: helpersData,
    lastUpdate: new Date().toISOString(),
  };

  return userData;
}

function getFunctionSignatureParams(fn: HelperFunction) {
  const fnToString = fn.toString();
  const allParamsRegex = /\([^\)]*\)/i;
  const matchingResult = fnToString.match(allParamsRegex);

  return matchingResult?.[0] || '';
}

function includeFn() {
  return `const include = (templatePath, data, helpers) => {
      data = {...${TEMPLATE_VARNAME}, ...data};
      helpers = {...${HELPER_VARNAME}, ...helpers};
      const rendered = this.renderChild(templatePath, data, helpers);
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

function replaceCarriageReturn(value: string) {
  return value.replace(/\r\n|\n|\r/g, '\\n');
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
      contentReplaced
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
  return ESC_MAP[input];
}

/**
 * Escape special regular expression characters inside a string
 * $& means the whole matched string
 */
function escapeRegExp(string: string) {
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
  getResolvedPath,
  escapeRegExp,
  getPathWithExtension,
  normalizeFilesPath,
  getFileName,
  valueIsAFunction,
  injectDataAndHelpersInTemplate,
  compileToFunction,
  compileChildToFunction,
  isAChildError,
  injectUserDataForVSCodeExtension,
  replaceCarriageReturn,
};
