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
import { checkAccessPermission, fileIsUnique, getFilesFromDirectory } from './templates-access';
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
  ErrorData,
} from './interfaces';
import { Store } from './store';
import { findOriginalLineNumberWithMessage, handleNonUniqueFile } from './error-utils';
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
    lineNumber: null,
  };
  private parentTemplate = '';
  private childrenStore = new Store<string[]>();
  private errorHTML: undefined | string = undefined;

  /**
   * Stores cached templates.
   */
  public templatesStore = new Store<TemplateFunction>();
  /**
   * Stores dynamically defined templates.
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
    this.compiledAST = this.parse(content);
    const globalHelpers = initVariablesAndHelpers(this.helpersStore.getAll());

    const children = getChildrenTemplatesName(content, this.config.extension);
    const containsInclude = children.length > 0;

    const previousChildren = this.childrenStore.get(this.parentTemplate) || [];
    const uniqueChildren = getUniqueChildren(previousChildren, children, filename);
    this.childrenStore.set(this.parentTemplate, uniqueChildren);

    const isAChild = isAChildTemplate(this.parentTemplate, filename);
    const metricsData = this.getMetrics(filename, isAChild);

    const result = `
    ${includeFn(containsInclude)}
    ${variablesOfData}
    ${variablesOfHelpers}
    ${globalHelpers}

    const ${TP_VARNAME_WITH_PREFIX} = {res: "", e: this.config.escapeFunction};
    
    ${compileBody(this.compiledAST, this.config)}

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

    let openingResult: RegExpExecArray | null = null;
    const compiledData: AstObject[] = [];
    let lastIndex = 0;

    const parseOpenReg = new RegExp(
      escapeRegExp(opening) + '\\s*(' + this.prefixBuild + ')?\\s*',
      'g'
    );

    const parseCloseReg = new RegExp('\'|"|`|(\\s*' + escapeRegExp(closing) + ')', 'g');

    while ((openingResult = parseOpenReg.exec(expression))) {
      // openingPrefix by default either ~, =, or empty
      const [originalOpen, openingPrefix = ''] = openingResult;
      let closeResult: RegExpExecArray | null = null;
      let templateData: TemplateData | undefined = undefined;

      const precedingExpression = expression.slice(lastIndex, openingResult.index);
      lastIndex = originalOpen.length + openingResult.index;

      const escapedExpression = escapeJSLiteral(precedingExpression);
      compiledData.push(escapedExpression);
      parseCloseReg.lastIndex = lastIndex;

      while ((closeResult = parseCloseReg.exec(expression))) {
        const [originalClose, closePrefix] = closeResult;

        if (closePrefix) {
          const content = expression.slice(lastIndex, closeResult.index);

          lastIndex = parseCloseReg.lastIndex;
          parseOpenReg.lastIndex = lastIndex;

          const currentType = getCurrentPrefixType(openingPrefix, parse);
          templateData = { type: currentType, content };
          compiledData.push(templateData);
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
    }

    const endOfTemplate = expression.slice(lastIndex);
    const escapedEndOfTemplate = escapeJSLiteral(endOfTemplate);
    compiledData.push(escapedEndOfTemplate);

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
        console.error(
          new Error(`Failed to get programmaticaly defined template ${template} from cache`)
        );
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
      console.error(new Error(`No template files found in ${views} with extension ${extension}`));
      return '';
    }

    const fullPath = getFullPath(views, pathWithExtension, fileResolution);
    filename = getFileName(fullPath);

    const files = checkAccessPermission(this.templatePaths, fullPath);
    if (!fileIsUnique(files)) {
      const error = handleNonUniqueFile(files, filename);
      return this.manageError(error, filename);
    }

    const file = files[0];
    const cachedTemplate = this.templatesStore.get(file);
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

    const compileData: CompileExecuteData = {
      filename,
      fullPath: file,
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

      this.parentTemplate = resetParentTemplateAtEndOfExecution(
        this.parentTemplate,
        filename,
        this.childrenStore
      );

      return this.errorHTML ?? html;
    } catch (error: any) {
      return this.manageError(error, filename);
    }
  }

  /**
   * By default, no error should be returned
   */
  private manageError(error: any, filename: string) {
    this.templatesStore.remove(filename);
    error.filename = filename;
    const errorData = this.handleErrorMessage(error);
    console.error(new Error(`${errorData.message} in ${filename}`));
    this.errorHTML = this.initErrorTemplate(errorData);

    return this.errorHTML;
  }

  private executeFunction(executeData: ExecuteFunction) {
    const { data, filename, helpers, ɵɵstart, templateFn } = executeData;

    try {
      const immutableData = structuredClone(data);
      const html = templateFn.call(this, immutableData, helpers, ɵɵstart);
      this.parentTemplate = resetParentTemplateAtEndOfExecution(
        this.parentTemplate,
        filename,
        this.childrenStore
      );

      return html;
    } catch (error: any) {
      return this.manageError(error, filename);
    }
  }

  /**
   * Execution error is the last possible error.
   */
  private handleErrorMessage(error: ErrorData) {
    error.type = error.type ?? 'Execution Error';
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

    const templatesPath = path.join(__dirname, 'error');
    const tao = new Tao({ views: templatesPath });
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

  /**
   * Sync version is preferable, since HTML file are normally small (<300 Ko)
   * and should be cached
   */
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
      this.parentTemplate = resetParentTemplateAtEndOfExecution(
        this.parentTemplate,
        filename,
        this.childrenStore
      );

      return this.errorHTML ?? html;
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
    const duplicate = this.dynamictemplatesStore.get(name);
    if (!isTemplateDynamicallyDefined(name)) {
      throw new Error(`Dynamically loaded template ${name} should start with a '@'`);
    }

    if (duplicate) {
      console.warn(`Duplicate template name ${name} provided. Template content have been erased.`);
    }

    this.dynamictemplatesStore.set(name, template);
  }
}
