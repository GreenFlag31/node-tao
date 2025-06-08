import { defaultConfig } from './default-config';
import {
  checkOpeningAndClosingTag,
  checkPrefixTemplateTags,
  getPathWithExtension,
  isTemplateDynamicallyDefined,
  getChildrenTemplatesName,
  templateIsOfTypeString,
  givenExtensionShouldNotStartWithADot,
} from './checks';
import { checkAccessPermission, getFilesFromDirectory } from './templates-access';
import fs from 'node:fs';

import { log } from 'node:console';
import {
  buildPrefixRegex,
  compileBody,
  escapeJSLiteral,
  getCurrentPrefixType,
  includeFn,
  initVariablesAndHelpers,
  getFullPath,
  escapeRegExp,
  getFileName,
  valueIsAFunction,
} from './utils';
import { TEMPLATE_VARNAME, TP_VARNAME_WITH_PREFIX } from './const';
import {
  AstObject,
  TagType,
  TemplateFunction,
  TemplateData,
  Data,
  Debug,
  Helpers,
  HelperFunction,
  Metrics,
  ErrorType,
  DefinitiveOptions,
  options,
  LoadedTemplateData,
  CompileExecuteData,
  ExecuteFunction,
} from './interfaces';
import assert from 'node:assert';
import { Store } from './store';
import { findOriginalLineNumberWithMessage, handleParseError, isAParseError } from './error-utils';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import {
  getUniqueChildren,
  includeChildren,
  includeMetrics,
  includeRenderTime,
  isAChildTemplate,
  resetParentTemplateAtEndOfExecution,
} from './metrics';
import { assignParse, assignTags } from './init';
import { checkForUnclosedPrefix, handleQuotes } from './parsing-helpers';

export class Tao {
  private config: DefinitiveOptions;
  private templatePaths: string[] = [];
  private prefixBuild = '';
  private compiledAST: AstObject[] = [];
  private compiledAnonymousFnContent = '';
  private debug: Debug = {
    fileContent: '',
    message: '',
    lineNumber: 1,
  };
  private parentTemplate = '';
  private childrenStore = new Store<string[]>();
  private errorHTML: undefined | string = undefined;

  /**
   * Stores dynamically defined templates.
   */
  public templatesStore = new Store<TemplateFunction>();
  /**
   * Stores cached templates.
   */
  public dynamictemplatesStore = new Store<string>();
  /**
   * Stores global helpers.
   */
  public helpersStore = new Store<HelperFunction>();

  constructor(customConfig: options = {}) {
    this.config = { ...defaultConfig, ...customConfig } as DefinitiveOptions;
    this.initializeConfig();
  }

  private initializeConfig() {
    const { views, extension, tags, parse } = this.config;
    this.config.tags = assignTags(tags);
    this.config.parse = assignParse(parse);
    this.config.extension = givenExtensionShouldNotStartWithADot(extension);

    checkOpeningAndClosingTag(this.config.tags);
    checkPrefixTemplateTags(this.config.parse);

    this.prefixBuild = buildPrefixRegex(parse);
    this.templatePaths = getFilesFromDirectory(views, extension);
  }

  /**
   * Get an array of absolute paths of the mapped files according to the view directory provided.
   */
  get mappedFiles() {
    return this.templatePaths.slice();
  }

  private createCompilationFunction(
    content: string,
    variablesOfData: string,
    variablesOfHelpers: string,
    filename: string
  ) {
    try {
      return new Function(
        TEMPLATE_VARNAME,
        'hp',
        'ɵɵstart',
        this.compile(content, variablesOfData, variablesOfHelpers, filename)
      ) as TemplateFunction;
    } catch (error: any) {
      const type: ErrorType = 'Compilation Error';
      error.type = error.type ?? type;
      throw error;
    }
  }

  private getMetrics(filename: string, isAChild: boolean) {
    const { metrics, cache } = this.config;
    const metricsData: Metrics = {
      metrics,
      files: this.mappedFiles,
      filename,
      cacheEnabled: cache,
      isAChild,
    };

    return metricsData;
  }

  private compile(
    content: string,
    variablesOfData: string,
    variablesOfHelpers: string,
    filename: string
  ) {
    const { metrics } = this.config;
    const compiledData: AstObject[] = this.parse(content);
    const globalHelpers = initVariablesAndHelpers(this.helpersStore.getAll());
    this.compiledAST = compiledData;

    const children = getChildrenTemplatesName(content, this.config.extension);
    const containsInclude = children.length > 0;

    const parentStored = this.childrenStore.get(this.parentTemplate) || [];
    const uniqueChildren = getUniqueChildren(parentStored, children);
    this.childrenStore.set(this.parentTemplate, uniqueChildren);

    const isAChild = isAChildTemplate(this.parentTemplate, filename);
    const metricsData = this.getMetrics(filename, isAChild);

    const result = `
    ${includeFn(containsInclude)}
    ${variablesOfData}
    ${variablesOfHelpers}
    ${globalHelpers}

    const ${TP_VARNAME_WITH_PREFIX} = {res: "", e: this.config.escapeFunction};
    
    ${compileBody(compiledData, this.config)}

    ${includeChildren(metrics, isAChild)}
    ${includeRenderTime(metrics, isAChild)}
    ${TP_VARNAME_WITH_PREFIX}.res += ${includeMetrics(metricsData)}


    return ${TP_VARNAME_WITH_PREFIX}.res;
  `;

    this.compiledAnonymousFnContent = result;
    return result;
  }

  private parse(expression: string): AstObject[] {
    const { parse, tags } = this.config;
    const { closing, opening } = tags;

    const compiledData: AstObject[] = [];
    let lastIndex = 0;

    const prefixes = [parse.exec, parse.interpolate, parse.raw].reduce(function (
      accumulator,
      prefix
    ) {
      if (accumulator && prefix) {
        return accumulator + '|' + escapeRegExp(prefix);
      } else if (prefix) {
        // accumulator is falsy
        return escapeRegExp(prefix);
      } else {
        // prefix and accumulator are both falsy
        return accumulator;
      }
    },
    '');

    assert(this.prefixBuild === prefixes, 'buildprefixregex not the same');

    const parseOpenReg = new RegExp(
      escapeRegExp(opening) + '\\s*(' + this.prefixBuild + ')?\\s*',
      'g'
    );

    const parseCloseReg = new RegExp('\'|"|`|\\/\\*|(\\s*' + escapeRegExp(closing) + ')', 'g');

    let openingResult: RegExpExecArray | null = null;

    while ((openingResult = parseOpenReg.exec(expression))) {
      const [originalOpen, openingPrefix = ''] = openingResult;
      let closeResult: RegExpExecArray | null = null;
      let templateData: TemplateData | undefined = undefined;

      const precedingExpression = expression.slice(lastIndex, openingResult.index);

      lastIndex = originalOpen.length + openingResult.index;
      const prefix = openingPrefix; // by default either ~, =, or empty

      compiledData.push(escapeJSLiteral(precedingExpression));

      parseCloseReg.lastIndex = lastIndex;

      while ((closeResult = parseCloseReg.exec(expression))) {
        const [originalClose, closePrefix] = closeResult;

        if (closePrefix) {
          const content = expression.slice(lastIndex, closeResult.index);

          lastIndex = parseCloseReg.lastIndex;
          parseOpenReg.lastIndex = lastIndex;

          const currentType: TagType = getCurrentPrefixType(prefix, parse);
          templateData = { type: currentType, content };
          break;
        }

        parseCloseReg.lastIndex = handleQuotes(
          expression,
          originalClose,
          closeResult.index,
          this.debug
        );
      }

      checkForUnclosedPrefix(
        templateData,
        expression,
        originalOpen,
        openingResult.index,
        this.debug
      );

      compiledData.push(templateData!);
    }

    const endOfTemplate = expression.slice(lastIndex);
    compiledData.push(escapeJSLiteral(endOfTemplate));

    return compiledData;
  }

  /**
   * Render a template with data and helpers.
   * @param template The path of your template to render. Always use "/" as separator.
   * @param data Provide data to inject.
   * @param helpers Provide helper functions to inject.
   */
  render(template: string, data: Data = {}, helpers: Helpers = {}): string {
    if (!templateIsOfTypeString(template)) return '';
    const { views, extension, fileResolution } = this.config;
    const ɵɵstart = performance.now();
    let filename = template;
    this.errorHTML = undefined;

    const pathWithExtension = getPathWithExtension(template, extension);
    if (!this.parentTemplate) this.parentTemplate = getFileName(pathWithExtension);

    if (isTemplateDynamicallyDefined(template)) {
      const cachedTemplate = this.handleCachedLoadedTemplate(template);

      if (cachedTemplate) {
        const executeData: ExecuteFunction = {
          templateFn: cachedTemplate,
          data,
          helpers,
          ɵɵstart,
          filename,
        };
        return this.executeFunction(executeData);
      }

      // preloaded with 'loadTemplate'
      const templateLoaded = this.dynamictemplatesStore.get(template);
      if (!templateLoaded) {
        console.error(`Failed to get programmaticaly defined template ${template} from cache`);
        return '';
      }

      const templateData: LoadedTemplateData = {
        template,
        templateLoaded,
        data,
        helpers,
        ɵɵstart,
        filename,
      };
      return this.handleLoadedTemplate(templateData);
    }

    if (this.templatePaths.length === 0) {
      console.error(`No template files found in ${views} with extension ${extension}`);
      return '';
    }

    const fullPath = getFullPath(views, pathWithExtension, fileResolution);
    filename = getFileName(fullPath);

    const fileFound = checkAccessPermission(this.templatePaths, fullPath);
    if (!fileFound) return '';

    const cachedTemplate = this.templatesStore.get(fileFound);
    if (cachedTemplate) {
      log(`${template} cache hit`);

      const executeData: ExecuteFunction = {
        templateFn: cachedTemplate,
        data,
        helpers,
        ɵɵstart,
        filename,
      };
      return this.executeFunction(executeData);
    }

    const compileData: CompileExecuteData = {
      filename,
      fullPath: fileFound,
      data,
      helpers,
      ɵɵstart,
    };

    return this.compileAndExecute(compileData);
  }

  private compileAndExecute(compileData: CompileExecuteData) {
    const { data, filename, fullPath, helpers, ɵɵstart } = compileData;

    try {
      const variablesOfData = initVariablesAndHelpers(data);
      const variablesOfHelpers = initVariablesAndHelpers(helpers);
      const templateFn = this.readFileAndCompile(
        fullPath,
        variablesOfData,
        variablesOfHelpers,
        filename
      );
      const immutableData = structuredClone(data);
      const html = templateFn.call(this, immutableData, helpers, ɵɵstart);

      this.parentTemplate = resetParentTemplateAtEndOfExecution(this.parentTemplate, filename);

      return this.errorHTML ?? html;
    } catch (error: any) {
      return this.manageError(error, filename);
    }
  }

  private manageError(error: any, filename: string) {
    this.templatesStore.remove(filename);
    error.filename = filename;
    const errorData = this.handleErrorMessage(error);
    // by default, no error should be returned
    console.error(new Error(errorData.message));
    this.errorHTML = this.initErrorTemplate(errorData);
    return this.errorHTML;
  }

  private executeFunction(executeData: ExecuteFunction) {
    const { data, filename, helpers, ɵɵstart, templateFn } = executeData;

    try {
      const immutableData = structuredClone(data);
      const html = templateFn.call(this, immutableData, helpers, ɵɵstart);
      this.parentTemplate = resetParentTemplateAtEndOfExecution(this.parentTemplate, filename);

      return html;
    } catch (error: any) {
      return this.manageError(error, filename);
    }
  }

  private handleErrorMessage(error: any) {
    error.type = error.type ?? 'Execution Error';
    const parsingError = isAParseError(error);
    if (parsingError) return handleParseError(error);

    const { filename } = error;

    const { fileContent, lineNumber, message } = this.debug;
    const errorData = {
      filename,
      fileContent: [fileContent],
      message,
      lineNumber,
      type: error.type,
    };

    const [finalMessage, fileContentPerLine, correctedLineNumber] =
      findOriginalLineNumberWithMessage(
        error,
        this.compiledAST,
        this.compiledAnonymousFnContent,
        this.debug.fileContent
      );

    errorData.message = finalMessage;
    errorData.fileContent = fileContentPerLine;
    errorData.lineNumber = correctedLineNumber;
    return errorData;
  }

  private initErrorTemplate(errorData: Data) {
    if (!this.config.debug) return '';

    const templatesPath = path.join(__dirname, 'public');
    const tao = new Tao({ views: templatesPath, cache: true, metrics: false });
    return tao.render('error', errorData);
  }

  private readFileAndCompile(
    resolvedPath: string,
    variablesOfData: string,
    variablesOfHelpers: string,
    filename: string
  ) {
    this.debug.fileContent = '';
    const content = this.readFile(resolvedPath);
    this.debug.fileContent = content;
    const templateFn = this.createCompilationFunction(
      content,
      variablesOfData,
      variablesOfHelpers,
      filename
    );

    if (this.config.cache && !this.config.metrics) {
      // Do not store when metrics is enabled
      // This will skew the results of children names
      // since template is not reevaluated
      this.templatesStore.set(filename, templateFn);
    }

    return templateFn;
  }

  private readFile(path: string) {
    try {
      const file = fs.readFileSync(path, 'utf8');
      return file;
    } catch (error: any) {
      const type: ErrorType = 'ReadFile Error';
      error.type = type;
      throw error;
    }
  }

  private handleCachedLoadedTemplate(template: string) {
    const cachedTemplate = this.templatesStore.get(template);

    if (!cachedTemplate) return undefined;

    log(`${template} cache hit`);
    return cachedTemplate;
  }

  private handleLoadedTemplate(templateData: LoadedTemplateData) {
    const { data, filename, helpers, ɵɵstart, template, templateLoaded } = templateData;

    try {
      const templateFn = this.compileLoadedTemplate(templateLoaded, data, helpers, filename);

      if (this.config.cache) {
        this.templatesStore.set(template, templateFn);
      }

      const immutableData = structuredClone(data);
      const html = templateFn.call(this, immutableData, helpers, ɵɵstart);
      this.parentTemplate = resetParentTemplateAtEndOfExecution(this.parentTemplate, filename);

      return html;
    } catch (error: any) {
      return this.manageError(error, filename);
    }
  }

  private compileLoadedTemplate(content: string, data: Data, helpers: Helpers, filename: string) {
    const variablesOfData = initVariablesAndHelpers(data);
    const variablesOfHelpers = initVariablesAndHelpers(helpers);
    const templateFn = this.createCompilationFunction(
      content,
      variablesOfData,
      variablesOfHelpers,
      filename
    );

    return templateFn;
  }

  /**
   * Define global helpers. Define once, use everywhere.
   * @param helpers An object of helpers.
   */
  defineHelpers(helpers: Helpers = {}) {
    for (const key in helpers) {
      if (!Object.prototype.hasOwnProperty.call(helpers, key)) continue;

      const fn = helpers[key];
      if (!valueIsAFunction(fn)) {
        throw new Error(`Provided helper ${key} is not a function`);
      }

      this.helpersStore.set(key, fn);
    }
  }

  /**
   * Load dynamically defined templates.
   * @param name The name of your template. Should start with a '@'.
   * @param template The template content.
   */
  loadTemplate(name: string, template: string) {
    if (!isTemplateDynamicallyDefined(name)) {
      throw new Error(`Dynamically loaded template ${name} should start with a '@'`);
    }

    this.dynamictemplatesStore.set(name, template);
  }
}
