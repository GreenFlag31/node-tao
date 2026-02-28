import { defaultConfig } from './default-config';
import {
  checkOpeningAndClosingTag,
  checkPrefixTemplateTags,
  getPathWithExtension,
  isTemplateDynamicallyDefined,
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
  getResolvedPath,
  escapeRegExp,
  getFileName,
  valueIsAFunction,
  injectDataAndHelpersInTemplate,
  compileToFunction,
  compileChildToFunction,
  isAChildError,
  injectUserDataForVSCodeExtension,
} from './utils';
import { PLACEHOLDER_VAR_END, PLACEHOLDER_VAR_START, TP_VARNAME_WITH_PREFIX } from './const';
import {
  AstObject,
  TemplateData,
  Data,
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
  ExecuteChildFunction,
  LoadedChildTemplateData,
  CompileChildExecuteData,
  DebugData,
  InjectedData,
  TemplateExpression,
} from './interfaces';
import { Store } from './store';
import {
  handleWrongTypeOfTemplate,
  findOriginalLineNumberWithMessage,
  handleNonUniqueFile,
  handleNotFoundDynamicTemplate,
  handleNoTemplateFilesFound,
} from './error-utils';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { includeChildren, includeMetrics, includeRenderTime, updateChildrenStore } from './metrics';
import { assignParse, assignTags, initDebugData } from './init';
import { checkForUnclosedPrefix, handleQuotes } from './parsing-helpers';

export class Tao {
  private config: DefinitiveOptions;
  private templatePaths: string[] = [];
  private prefixBuild = '';

  /**
   * Stores already compiled templates.
   */
  public compiledStore = new Store<string>();
  /**
   * Stores dynamically loaded templates.
   */
  public dynamictemplatesStore = new Store<string>();
  /**
   * Stores global helpers.
   */
  public helpersStore = new Store<HelperFunction>();

  // Metrics - DX
  private parentTemplate = '';
  // Metrics - DX
  private childrenStore = new Store<string[]>();

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

  private getMetrics(filename: string) {
    const { development, cache } = this.config;
    const metricsData: Metrics = {
      development,
      files: this.mappedFiles,
      filename,
      cacheEnabled: cache,
    };

    return metricsData;
  }

  private compileChild(content: string, debugData: DebugData) {
    const compiledAST = this.parse(content, debugData);

    const result = `
    ${includeFn()}

    ${PLACEHOLDER_VAR_START}
    ${PLACEHOLDER_VAR_END}

    const ${TP_VARNAME_WITH_PREFIX} = {res: "", e: this.config.escapeFunction};
    
    ${compileBody(compiledAST, this.config)}

    return ${TP_VARNAME_WITH_PREFIX}.res;
  `;

    return result;
  }

  private compile(content: string, filename: string, debugData: DebugData) {
    const { development } = this.config;
    const compiledAST = this.parse(content, debugData);

    this.childrenStore.set(this.parentTemplate, []);
    const metricsData = this.getMetrics(filename);

    const result = `
    ${includeFn()}

    ${PLACEHOLDER_VAR_START}
    ${PLACEHOLDER_VAR_END}

    const ${TP_VARNAME_WITH_PREFIX} = {res: "", e: this.config.escapeFunction};
    
    ${compileBody(compiledAST, this.config)}

    ${includeChildren(development)}
    ${includeRenderTime(development)}
    ${TP_VARNAME_WITH_PREFIX}.res += ${includeMetrics(metricsData)}

    
    return ${TP_VARNAME_WITH_PREFIX}.res;
  `;

    return result;
  }

  private parse(rawTemplate: string, debugData: DebugData): AstObject[] {
    const { parse, tags } = this.config;
    const { closing, opening } = tags;

    const compiledData: AstObject[] = [];
    const templateExpressions: TemplateExpression[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null = null;
    let id = 0;

    const templateRegex = new RegExp(
      escapeRegExp(opening) +
        // first capture group is the prefix
        '(' +
        this.prefixBuild +
        // second capture group is the expression
        ')?\\s*([^' +
        escapeRegExp(closing) +
        ']+?)\\s*' +
        escapeRegExp(closing),
      'gm',
    );

    while ((match = templateRegex.exec(rawTemplate))) {
      const prefix = match[1];
      const prefixType = getCurrentPrefixType(prefix, parse);

      templateExpressions.push({
        id: id++,
        prefixType,
        expression: match[2],
        templateStart: match.index,
        templateEnd: templateRegex.lastIndex,
      });
    }

    for (const templateExpression of templateExpressions) {
      const { expression, prefixType: type, templateStart, templateEnd } = templateExpression;

      const precedingExpression = rawTemplate.slice(lastIndex, templateStart);
      const escapedExpression = escapeJSLiteral(precedingExpression);

      // l'HTML
      const htmlData: TemplateData = { type: null, content: escapedExpression };

      // l'expression
      const templateValue: TemplateData = { type, content: expression };

      compiledData.push(htmlData, templateValue);
      lastIndex = templateEnd;
    }

    // while ((openingResult = parseOpenReg.exec(expression))) {
    //   // openingPrefix by default either ~, =, or empty
    //   const [originalOpen, openingPrefix = ''] = openingResult;
    //   let closeResult: RegExpExecArray | null = null;
    //   let templateData: TemplateData | undefined = undefined;

    //   // l'html qui précéde
    //   const precedingExpression = expression.slice(lastIndex, openingResult.index);
    //   lastIndex = originalOpen.length + openingResult.index;

    //   const escapedExpression = escapeJSLiteral(precedingExpression);
    //   const htmlData: TemplateData = { type: null, content: escapedExpression };
    //   compiledData.push(htmlData);
    //   parseCloseReg.lastIndex = lastIndex;

    //   while ((closeResult = parseCloseReg.exec(expression))) {
    //     const [originalClose, closePrefix] = closeResult;

    //     if (closePrefix) {
    //       const content = expression.slice(lastIndex, closeResult.index);

    //       lastIndex = parseCloseReg.lastIndex;
    //       parseOpenReg.lastIndex = lastIndex;

    //       const prefixType = getCurrentPrefixType(openingPrefix, parse);
    //       templateData = { type: prefixType, content };
    //       compiledData.push(templateData);
    //       break;
    //     }

    //     parseCloseReg.lastIndex = handleQuotes(
    //       expression,
    //       originalClose,
    //       closeResult.index,
    //       debugData.fileContent,
    //     );
    //   }

    //   // checkForUnclosedPrefix(
    //   //   templateData,
    //   //   expression,
    //   //   originalOpen,
    //   //   openingResult.index,
    //   //   debugData.fileContent,
    //   // );
    // }

    const endOfTemplate = rawTemplate.slice(lastIndex);
    const escapedEndOfTemplate = escapeJSLiteral(endOfTemplate);
    const html: TemplateData = { type: null, content: escapedEndOfTemplate };
    compiledData.push(html);

    return compiledData;
  }

  /**
   * Render a template with data and helpers.
   * @param template The path of your template to render.
   * @param data The variables to inject.
   * @param helpers The helpers functions to inject.
   */
  render(template: string, data: Data = {}, helpers: Helpers = {}): string {
    const debugData = initDebugData();
    if (typeof template !== 'string') {
      const error = handleWrongTypeOfTemplate(template);
      const { errorHTML } = this.manageError(error, template, debugData);
      return errorHTML;
    }

    const { views, extension, fileResolution, development } = this.config;
    const ɵɵstart = performance.now();
    let ɵɵcacheHit = false;

    const pathWithExtension = getPathWithExtension(template, extension);
    const filename = getFileName(pathWithExtension);
    const fullPath = getResolvedPath(views, pathWithExtension, fileResolution);
    this.parentTemplate = filename;
    this.childrenStore.remove(this.parentTemplate);

    const injectedData: InjectedData = {
      development,
      fullPath,
      data,
      helpers,
      helpersStore: this.helpersStore,
      templatePaths: this.templatePaths,
    };
    injectUserDataForVSCodeExtension(injectedData);

    if (isTemplateDynamicallyDefined(template)) {
      const cachedTemplate = this.compiledStore.get(template);

      if (cachedTemplate) {
        ɵɵcacheHit = true;
        const executeData: ExecuteFunction = {
          compiledContent: cachedTemplate,
          data,
          helpers,
          ɵɵstart,
          filename: template,
          ɵɵcacheHit,
        };

        return this.executeFunction(executeData, debugData);
      }

      const templateLoaded = this.dynamictemplatesStore.get(template);
      if (!templateLoaded) {
        const error = handleNotFoundDynamicTemplate(template);
        const { errorHTML } = this.manageError(error, template, debugData);
        return errorHTML;
      }

      const templateData: LoadedTemplateData = {
        templateLoaded,
        data,
        helpers,
        ɵɵstart,
        filename: template,
        ɵɵcacheHit,
      };
      return this.handleLoadedTemplate(templateData, debugData);
    }

    if (this.templatePaths.length === 0) {
      const error = handleNoTemplateFilesFound(views, extension);
      const { errorHTML } = this.manageError(error, filename, debugData);
      return errorHTML;
    }

    const files = checkAccessPermission(this.templatePaths, fullPath);

    if (!fileIsUnique(files)) {
      const error = handleNonUniqueFile(files, filename);
      const { errorHTML } = this.manageError(error, filename, debugData);
      return errorHTML;
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

      return this.executeFunction(executeData, debugData);
    }

    // mapped fullPath template file
    const file = files[0];
    const compileData: CompileExecuteData = {
      filename,
      fullPath: file,
      data,
      helpers,
      ɵɵstart,
      ɵɵcacheHit,
    };

    return this.compileAndExecute(compileData, debugData);
  }

  /**
   * Render a child component. Called inside the parent template.
   */
  private renderChild(
    template: string,
    data: Data = {},
    helpers: Helpers = {},
  ): string | ErrorData {
    const debugData = initDebugData();

    if (typeof template !== 'string') {
      const error = handleWrongTypeOfTemplate(template);
      const errorData = this.handleChildError(error, template, debugData);
      return errorData;
    }

    const { views, extension, fileResolution, development } = this.config;
    const pathWithExtension = getPathWithExtension(template, extension);
    const filename = getFileName(pathWithExtension);
    const fullPath = getResolvedPath(views, pathWithExtension, fileResolution);

    updateChildrenStore(this.childrenStore, filename, this.parentTemplate, this.config.development);

    const injectedData: InjectedData = {
      development,
      fullPath,
      data,
      helpers,
      helpersStore: this.helpersStore,
      templatePaths: this.templatePaths,
    };
    injectUserDataForVSCodeExtension(injectedData);

    if (isTemplateDynamicallyDefined(template)) {
      const cachedTemplate = this.compiledStore.get(template);

      if (cachedTemplate) {
        const executeData: ExecuteChildFunction = {
          compiledContent: cachedTemplate,
          data,
          helpers,
          filename: template,
        };

        return this.executeChildFunction(executeData, debugData);
      }

      const templateLoaded = this.dynamictemplatesStore.get(template);
      if (!templateLoaded) {
        const error = handleNotFoundDynamicTemplate(template);
        const errorData = this.handleChildError(error, template, debugData);
        return errorData;
      }

      const templateData: LoadedChildTemplateData = {
        templateLoaded,
        data,
        helpers,
        filename: template,
      };
      return this.handleLoadedChildTemplate(templateData, debugData);
    }

    const files = checkAccessPermission(this.templatePaths, fullPath);

    if (!fileIsUnique(files)) {
      const error = handleNonUniqueFile(files, filename);
      const errorData = this.handleChildError(error, filename, debugData);
      return errorData;
    }

    const cachedTemplate = this.compiledStore.get(filename);
    if (cachedTemplate) {
      const executeData: ExecuteChildFunction = {
        compiledContent: cachedTemplate,
        data,
        helpers,
        filename,
      };
      return this.executeChildFunction(executeData, debugData);
    }

    const file = files[0];
    const compileData: CompileChildExecuteData = {
      filename,
      fullPath: file,
      data,
      helpers,
    };

    return this.compileAndExecuteChild(compileData, debugData);
  }

  private compileAndExecuteChild(compileData: CompileChildExecuteData, debugData: DebugData) {
    const { data, filename, fullPath, helpers } = compileData;

    try {
      const templateFn = this.readChildFileAndGetCompiledFn(
        fullPath,
        data,
        helpers,
        filename,
        debugData,
      );

      const immutableData = structuredClone(data);
      const html = templateFn.call(this, immutableData, helpers);

      return html;
    } catch (error: any) {
      const errorData = this.handleChildError(error, filename, debugData);
      return errorData;
    }
  }

  private compileAndExecute(compileData: CompileExecuteData, debugData: DebugData) {
    const { data, filename, fullPath, helpers, ɵɵstart, ɵɵcacheHit } = compileData;

    try {
      const templateFn = this.readFileAndGetCompiledFn(
        fullPath,
        data,
        helpers,
        filename,
        debugData,
      );

      const immutableData = structuredClone(data);
      const html = templateFn.call(this, immutableData, helpers, ɵɵstart, ɵɵcacheHit);

      return html;
    } catch (error: any) {
      // An error occurred in a child component - return it
      if (isAChildError(error)) return error.errorHTML;
      const { errorHTML } = this.manageError(error, filename, debugData);
      return errorHTML;
    }
  }

  private manageError(error: any, filename: string, debugData: DebugData): ErrorData {
    // this.compiledStore.remove(filename); => pourquoi ?
    error.filename = filename;
    const errorData = this.handleErrorMessage(error, debugData);
    console.error(new Error(`Error in ${filename}: ${errorData.message}`));
    const errorHTML = this.initErrorTemplate(errorData);
    errorData.errorHTML = errorHTML;

    return errorData;
  }

  private executeChildFunction(executeData: ExecuteChildFunction, debugData: DebugData) {
    const { data, filename, helpers, compiledContent } = executeData;

    try {
      const immutableData = structuredClone(data);
      const contentReplaced = injectDataAndHelpersInTemplate(
        data,
        helpers,
        this.helpersStore,
        compiledContent,
      );
      debugData.compiledAnonymousFnContent = contentReplaced;

      const templateFn = compileChildToFunction(contentReplaced);
      const html = templateFn.call(this, immutableData, helpers);

      return html;
    } catch (error: any) {
      const errorData = this.handleChildError(error, filename, debugData);
      return errorData;
    }
  }

  private handleChildError(error: any, filename: string, debugData: DebugData) {
    // Error in a nested child — bubble up to the parent
    if (isAChildError(error)) throw error;
    // Error occurred in this child component - handle it
    const errorData = this.manageError(error, filename, debugData);
    errorData.isAChildError = true;

    return errorData;
  }

  private executeFunction(executeData: ExecuteFunction, debugData: DebugData) {
    const { data, filename, helpers, ɵɵstart, compiledContent, ɵɵcacheHit } = executeData;

    try {
      const immutableData = structuredClone(data);
      const contentReplaced = injectDataAndHelpersInTemplate(
        data,
        helpers,
        this.helpersStore,
        compiledContent,
      );
      debugData.compiledAnonymousFnContent = contentReplaced;

      const templateFn = compileToFunction(contentReplaced);
      const html = templateFn.call(this, immutableData, helpers, ɵɵstart, ɵɵcacheHit);

      return html;
    } catch (error: any) {
      // An error occurred in a child component - return it
      if (isAChildError(error)) return error.errorHTML;
      const { errorHTML } = this.manageError(error, filename, debugData);
      return errorHTML;
    }
  }

  private handleErrorMessage(error: ErrorData, debugData: DebugData) {
    const [finalMessage, fileContentPerLine, correctedLineNumber] =
      findOriginalLineNumberWithMessage(
        error,
        debugData.compiledAnonymousFnContent,
        debugData.fileContent,
      );

    const errorData: ErrorData = {
      filename: error.filename,
      fileContent: fileContentPerLine,
      message: finalMessage,
      lineNumber: correctedLineNumber,
      // Execution error is the last possible error
      type: error.type ?? 'Execution Error',
      isAChildError: false,
      errorHTML: '',
    };

    return errorData;
  }

  private initErrorTemplate(errorData: Data) {
    if (!this.config.development) return '';

    const templatesPath = path.join(__dirname, 'error');
    const tao = new Tao({ views: templatesPath });
    return tao.render('error', errorData);
  }

  private compileChildAndCache(content: string, filename: string, debugData: DebugData) {
    const compiledContent = this.compileChild(content, debugData);

    if (this.config.cache) {
      this.compiledStore.set(filename, compiledContent);
    }

    return compiledContent;
  }

  private compileAndCache(content: string, filename: string, debugData: DebugData) {
    const compiledContent = this.compile(content, filename, debugData);

    if (this.config.cache) {
      this.compiledStore.set(filename, compiledContent);
    }

    return compiledContent;
  }

  private readChildFileAndGetCompiledFn(
    resolvedPath: string,
    data: Data,
    helpers: Helpers,
    filename: string,
    debugData: DebugData,
  ) {
    const content = this.readFile(resolvedPath);
    debugData.fileContent = content;
    const compiledContent = this.compileChildAndCache(content, filename, debugData);

    const contentReplaced = injectDataAndHelpersInTemplate(
      data,
      helpers,
      this.helpersStore,
      compiledContent,
    );
    debugData.compiledAnonymousFnContent = contentReplaced;
    const templateFn = compileChildToFunction(contentReplaced);

    return templateFn;
  }

  private readFileAndGetCompiledFn(
    resolvedPath: string,
    data: Data,
    helpers: Helpers,
    filename: string,
    debugData: DebugData,
  ) {
    const content = this.readFile(resolvedPath);
    debugData.fileContent = content;
    const compiledContent = this.compileAndCache(content, filename, debugData);

    const contentReplaced = injectDataAndHelpersInTemplate(
      data,
      helpers,
      this.helpersStore,
      compiledContent,
    );
    debugData.compiledAnonymousFnContent = contentReplaced;
    const templateFn = compileToFunction(contentReplaced);

    return templateFn;
  }

  /**
   * Sync version is preferable, since HTML file are normally small (<100 Ko)
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
  private handleLoadedTemplate(templateData: LoadedTemplateData, debugData: DebugData) {
    const { data, filename, helpers, ɵɵstart, ɵɵcacheHit } = templateData;

    try {
      const contentReplaced = this.compileLoadedTemplate(templateData, debugData);

      const templateFn = compileToFunction(contentReplaced);
      const immutableData = structuredClone(data);
      const html = templateFn.call(this, immutableData, helpers, ɵɵstart, ɵɵcacheHit);

      return html;
    } catch (error: any) {
      // An error occurred in a child component - return it
      if (isAChildError(error)) return error.errorHTML;
      const { errorHTML } = this.manageError(error, filename, debugData);
      return errorHTML;
    }
  }

  private handleLoadedChildTemplate(templateData: LoadedChildTemplateData, debugData: DebugData) {
    const { data, filename, helpers } = templateData;

    try {
      const contentReplaced = this.compileLoadedChildTemplate(templateData, debugData);

      const templateFn = compileChildToFunction(contentReplaced);

      const immutableData = structuredClone(data);
      const html = templateFn.call(this, immutableData, helpers);

      return html;
    } catch (error: any) {
      const errorData = this.handleChildError(error, filename, debugData);
      return errorData;
    }
  }

  /**
   * Handle dynamically defined templates
   */
  private compileLoadedTemplate(templateData: LoadedTemplateData, debugData: DebugData) {
    const { data, filename, helpers, templateLoaded: content } = templateData;

    const compiledContent = this.compileAndCache(content, filename, debugData);
    const contentReplaced = injectDataAndHelpersInTemplate(
      data,
      helpers,
      this.helpersStore,
      compiledContent,
    );
    debugData.compiledAnonymousFnContent = contentReplaced;

    return contentReplaced;
  }

  private compileLoadedChildTemplate(templateData: LoadedChildTemplateData, debugData: DebugData) {
    const { data, filename, helpers, templateLoaded: content } = templateData;

    const compiledContent = this.compileChildAndCache(content, filename, debugData);

    const contentReplaced = injectDataAndHelpersInTemplate(
      data,
      helpers,
      this.helpersStore,
      compiledContent,
    );
    debugData.compiledAnonymousFnContent = contentReplaced;

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
      console.warn(
        `⚠️  Duplicate template name ${name} provided. Template content has been erased.`,
      );
    }

    this.dynamictemplatesStore.set(name, template);
  }
}
