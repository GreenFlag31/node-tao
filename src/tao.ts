import { defaultConfig } from './default-config';
import {
  checkOpeningAndClosingTag,
  checkPrefixTemplateTags,
  getPathWithExtension,
  isTemplateDynamicallyDefined,
  templateIsOfTypeString,
  trimDotFromExtension,
} from './checks';
import { checkAccessPermission, fileIsUnique, getFilesFromDirectory } from './templates-access';
import fs from 'node:fs';
import {
  buildPrefixRegex,
  compileBody,
  escapeJSLiteral,
  getCurrentPrefixType,
  includeFn,
  getFullPath,
  escapeRegExp,
  getFileName,
  valueIsAFunction,
  normalizeFilesPath,
  injectDataAndHelpersInTemplate,
  compileToFunction,
} from './utils';
import { PLACEHOLDER_VAR_END, PLACEHOLDER_VAR_START, TP_VARNAME_WITH_PREFIX } from './const';
import {
  AstObject,
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
  includeChildren,
  includeMetrics,
  includeRenderTime,
  isAChildTemplate,
  resetChildAndParentAtEndOfExecution,
  updateChildrenStore,
  updateChildrenStoreInCachedTemplate,
} from './metrics';
import { assignParse, assignTags } from './init';
import { checkForUnclosedPrefix, handleQuotes } from './parsing-helpers';
import { log } from 'node:console';

export class Tao {
  private config: DefinitiveOptions;
  private templatePaths: string[] = [];
  private prefixBuild = '';
  private compiledAnonymousFnContent = '';
  private debug: Debug = {
    fileContent: '',
    message: '',
    lineNumber: null,
  };
  private parentTemplate = '';
  private childrenStore = new Store<string[]>();
  // usefull for error in children
  private errorHTML: undefined | string = undefined;
  public compiledStore = new Store<string>();

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
    this.config.extension = trimDotFromExtension(extension);

    checkOpeningAndClosingTag(this.config.tags);
    checkPrefixTemplateTags(this.config.parse);

    this.prefixBuild = buildPrefixRegex(this.config.parse);
    this.templatePaths = getFilesFromDirectory(views, this.config.extension);
  }

  /**
   * Get an array of absolute paths of the mapped files according to the view directory provided.
   */
  get mappedFiles() {
    return this.templatePaths.slice();
  }

  private getMetrics(filename: string, isAChild: boolean) {
    const { development, cache } = this.config;
    const metricsData: Metrics = {
      development,
      files: this.mappedFiles,
      filename,
      cacheEnabled: cache,
      isAChild,
    };

    return metricsData;
  }

  private compile(content: string, filename: string) {
    const { development } = this.config;
    const compiledAST = this.parse(content);

    updateChildrenStore(this.childrenStore, content, filename, this.parentTemplate, this.config);

    const isAChild = isAChildTemplate(this.parentTemplate, filename);
    const metricsData = this.getMetrics(filename, isAChild);

    const result = `
    ${includeFn()}

    ${PLACEHOLDER_VAR_START}
    ${PLACEHOLDER_VAR_END}

    const ${TP_VARNAME_WITH_PREFIX} = {res: "", e: this.config.escapeFunction};
    
    ${compileBody(compiledAST, this.config)}

    ${includeChildren(development, isAChild)}
    ${includeRenderTime(development, isAChild)}
    ${TP_VARNAME_WITH_PREFIX}.res += ${includeMetrics(metricsData)}


    return ${TP_VARNAME_WITH_PREFIX}.res;
  `;

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
   * @param template The path of your template to render.
   * @param data The datas to inject.
   * @param helpers The helpers functions to inject.
   */
  render(template: string, data: Data = {}, helpers: Helpers = {}): string {
    if (!templateIsOfTypeString(template)) return '';
    template = normalizeFilesPath(template);

    const { views, extension, fileResolution } = this.config;
    const ɵɵstart = performance.now();
    let ɵɵcacheHit = false;
    let filename = template;
    this.errorHTML = undefined;

    const pathWithExtension = getPathWithExtension(template, extension);
    if (!this.parentTemplate) {
      this.parentTemplate = getFileName(pathWithExtension);
    }

    if (isTemplateDynamicallyDefined(template)) {
      const cachedTemplate = this.compiledStore.get(template);

      if (cachedTemplate) {
        ɵɵcacheHit = true;
        const executeData: ExecuteFunction = {
          compiledContent: cachedTemplate,
          data,
          helpers,
          ɵɵstart,
          filename,
          ɵɵcacheHit,
        };

        return this.executeFunction(executeData);
      }

      const templateLoaded = this.dynamictemplatesStore.get(template);
      if (!templateLoaded) {
        console.error(
          new Error(`Failed to get programmaticaly defined template ${template} from cache`)
        );
        return '';
      }

      const templateData: LoadedTemplateData = {
        templateLoaded,
        data,
        helpers,
        ɵɵstart,
        filename,
        ɵɵcacheHit,
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

    const cachedTemplate = this.compiledStore.get(filename);
    if (cachedTemplate) {
      ɵɵcacheHit = true;
      const executeData: ExecuteFunction = {
        compiledContent: cachedTemplate,
        data,
        helpers,
        ɵɵstart,
        filename,
        ɵɵcacheHit,
      };

      return this.executeFunction(executeData);
    }

    const file = files[0];
    const compileData: CompileExecuteData = {
      filename,
      fullPath: file,
      data,
      helpers,
      ɵɵstart,
      ɵɵcacheHit,
    };

    return this.compileAndExecute(compileData);
  }

  private compileAndExecute(compileData: CompileExecuteData) {
    const { data, filename, fullPath, helpers, ɵɵstart, ɵɵcacheHit } = compileData;

    try {
      const templateFn = this.readFileAndGetCompiledFn(fullPath, data, helpers, filename);

      const immutableData = structuredClone(data);
      const html = templateFn.call(this, immutableData, helpers, ɵɵstart, ɵɵcacheHit);

      this.parentTemplate = resetChildAndParentAtEndOfExecution(
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
   * By default, no error should be returned.
   * Removes the cached compiled template.
   */
  private manageError(error: any, filename: string) {
    this.compiledStore.remove(filename);
    error.filename = filename;
    const errorData = this.handleErrorMessage(error);
    console.error(new Error(`${errorData.message} in ${filename}`));
    this.errorHTML = this.initErrorTemplate(errorData);

    return this.errorHTML;
  }

  private executeFunction(executeData: ExecuteFunction) {
    const { data, filename, helpers, ɵɵstart, compiledContent, ɵɵcacheHit } = executeData;

    try {
      const immutableData = structuredClone(data);
      const contentReplaced = injectDataAndHelpersInTemplate(
        data,
        helpers,
        this.helpersStore,
        compiledContent
      );
      this.compiledAnonymousFnContent = contentReplaced;

      updateChildrenStoreInCachedTemplate(
        this.childrenStore,
        filename,
        this.parentTemplate,
        this.config.development
      );
      const templateFn = compileToFunction(contentReplaced);
      const html = templateFn.call(this, immutableData, helpers, ɵɵstart, ɵɵcacheHit);

      this.parentTemplate = resetChildAndParentAtEndOfExecution(
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
        this.compiledAnonymousFnContent,
        this.debug.fileContent
      );

    errorData.message = finalMessage;
    errorData.fileContent = fileContentPerLine;
    errorData.lineNumber = correctedLineNumber;
    return errorData;
  }

  private initErrorTemplate(errorData: Data) {
    if (!this.config.development) return '';

    const templatesPath = path.join(__dirname, 'error');
    const tao = new Tao({ views: templatesPath });
    return tao.render('error', errorData);
  }

  private compileAndCache(content: string, filename: string) {
    const compiledContent = this.compile(content, filename);

    if (this.config.cache) {
      this.compiledStore.set(filename, compiledContent);
    }

    return compiledContent;
  }

  private readFileAndGetCompiledFn(
    resolvedPath: string,
    data: Data,
    helpers: Helpers,
    filename: string
  ) {
    this.debug.fileContent = '';
    const content = this.readFile(resolvedPath);
    this.debug.fileContent = content;
    const compiledContent = this.compileAndCache(content, filename);

    const contentReplaced = injectDataAndHelpersInTemplate(
      data,
      helpers,
      this.helpersStore,
      compiledContent
    );
    this.compiledAnonymousFnContent = contentReplaced;
    const templateFn = compileToFunction(contentReplaced);

    return templateFn;
  }

  /**
   * Sync version is preferable, since HTML file are normally small (<300 Ko)
   * and should be cached.
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

  /**
   * Handle dynamically defined templates
   */
  private handleLoadedTemplate(templateData: LoadedTemplateData) {
    const { data, filename, helpers, ɵɵstart, templateLoaded, ɵɵcacheHit } = templateData;

    try {
      const contentReplaced = this.compileLoadedTemplate(templateLoaded, data, helpers, filename);

      const templateFn = compileToFunction(contentReplaced);

      const immutableData = structuredClone(data);
      const html = templateFn.call(this, immutableData, helpers, ɵɵstart, ɵɵcacheHit);
      this.parentTemplate = resetChildAndParentAtEndOfExecution(
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
   * Handle dynamically defined templates
   */
  private compileLoadedTemplate(content: string, data: Data, helpers: Helpers, filename: string) {
    const compiledContent = this.compileAndCache(content, filename);

    const contentReplaced = injectDataAndHelpersInTemplate(
      data,
      helpers,
      this.helpersStore,
      compiledContent
    );
    this.compiledAnonymousFnContent = contentReplaced;

    return contentReplaced;
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
      console.warn(`Duplicate template name ${name} provided. Template content has been erased.`);
    }

    this.dynamictemplatesStore.set(name, template);
  }
}
