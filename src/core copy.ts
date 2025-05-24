import { defaultConfig } from './default-config';
import { escapeRegExp } from './parse copy';

import {
  checkOpeningAndClosingTag,
  checkAccessPermission,
  checkPrefixTemplateTags,
  getPathWithExtension,
  isTemplateDynamicallyDefined,
  templateContainsInclude,
  givenExtensionShouldNotStartWithADot,
  debugDisabledOrInProduction,
} from './checks';
import { getFilesFromDirectory } from './get-files';
import fs from 'node:fs';

import { log } from 'node:console';
import {
  buildPrefixRegex,
  compileBody,
  convertToCR,
  getCurrentPrefixType,
  includeFn,
  initVariablesAndHelpers,
  getFullPath,
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
  DefinitiveConfig,
  EtaConfig,
} from './interfaces';
import assert from 'node:assert';
import { Store } from './storage copy';
import { findOriginalLineNumberWithMessage, handleParseError, isAParseError } from './error-utils';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { includeCacheHit, includeMetrics, includeRenderTime } from './metrics';
import { assignParse, assignTags } from './init';
import { checkForUnclosedPrefix, handleQuotes } from './parsing-helpers';

export class Eta {
  // renderString = renderString;

  private config: DefinitiveConfig;
  private templatePaths: string[] = [];
  private prefixBuild = '';

  /**
   * Stores dynamically defined templates.
   */
  public templateStore = new Store();
  /**
   * Stores cached templates.
   */
  public templateLoaded = new Store<string>();
  /**
   * Stores global helpers.
   */
  public helperStorage = new Store<HelperFunction>();

  private compiledAST: AstObject[] = [];
  private compiledAnonymousFnContent = '';

  /**
   * General debug information.
   */
  private debug: Debug = {
    originalFileName: '',
    fileContent: '',
    message: '',
    lineNumber: 1,
  };
  private startRenderTime = 0;
  private cacheHit = false;

  constructor(customConfig: EtaConfig = {}) {
    this.config = { ...defaultConfig, ...customConfig } as DefinitiveConfig;
    const { views, extension, tags, parse } = this.config;
    this.config.tags = assignTags(tags);
    this.config.parse = assignParse(parse);

    checkOpeningAndClosingTag(this.config.tags);
    checkPrefixTemplateTags(parse);
    givenExtensionShouldNotStartWithADot(extension);

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
    variablesOfHelpers: string
  ) {
    try {
      return new Function(
        TEMPLATE_VARNAME,
        'hp',
        this.compile(content, variablesOfData, variablesOfHelpers)
      ) as TemplateFunction;
    } catch (error: any) {
      const type: ErrorType = 'Compilation Error';
      error.type = error.type ?? type;
      throw error;
    }
  }

  private getMetrics() {
    const { metrics, cache } = this.config;
    const metricsData: Metrics = {
      metrics,
      files: this.mappedFiles,
      filename: this.debug.originalFileName,
      cacheEnabled: cache,
      templateLoaded: Object.keys(this.templateLoaded.getAll()),
    };

    return metricsData;
  }

  private compile(content: string, variablesOfData: string, variablesOfHelpers: string) {
    const { metrics } = this.config;
    const compiledData: AstObject[] = this.parse(content);
    this.compiledAST = compiledData;
    const isInclude = templateContainsInclude(content);
    const globalHelpers = initVariablesAndHelpers(this.helperStorage.getAll());
    const metricsData = this.getMetrics();

    const result = `
    ${includeFn(isInclude)}
    ${variablesOfData}
    ${variablesOfHelpers}
    ${globalHelpers}


    const ${TP_VARNAME_WITH_PREFIX} = {res: "", e: this.config.escapeFunction}
    
    ${compileBody(compiledData, this.config)}

    ${includeRenderTime(metrics)}
    ${includeCacheHit(metrics)}
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

      compiledData.push(convertToCR(precedingExpression));

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
        // if (original === '/*') {
        //   const commentCloseInd = expression.indexOf('*/', parseCloseReg.lastIndex);

        //   if (commentCloseInd === -1) {
        //     const error = getParsingErrorData(
        //       expression,
        //       closeResult.index,
        //       `Unclosed comment " ${original} "`,
        //       this.debug
        //     );

        //     throw error;
        //   }

        //   parseCloseReg.lastIndex = commentCloseInd;
        // } else if (original === "'") {
        //   singleQuoteReg.lastIndex = closeResult.index;

        //   const singleQuoteMatch = singleQuoteReg.exec(expression);
        //   if (!singleQuoteMatch) {
        //     const error = getParsingErrorData(
        //       expression,
        //       closeResult.index,
        //       `Unclosed string " ${original} "`,
        //       this.debug
        //     );

        //     throw error;
        //   }

        //   parseCloseReg.lastIndex = singleQuoteReg.lastIndex;
        // } else if (original === '"') {
        //   doubleQuoteReg.lastIndex = closeResult.index;
        //   const doubleQuoteMatch = doubleQuoteReg.exec(expression);

        //   if (!doubleQuoteMatch) {
        //     const error = getParsingErrorData(
        //       expression,
        //       closeResult.index,
        //       `Unclosed string " ${original} "`,
        //       this.debug
        //     );

        //     throw error;
        //   }

        //   parseCloseReg.lastIndex = doubleQuoteReg.lastIndex;
        // } else if (original === '`') {
        //   templateLitReg.lastIndex = closeResult.index;
        //   const templateLitMatch = templateLitReg.exec(expression);

        //   if (!templateLitMatch) {
        //     const error = getParsingErrorData(
        //       expression,
        //       closeResult.index,
        //       `Unclosed string " ${original} "`,
        //       this.debug
        //     );

        //     throw error;
        //   }

        //   parseCloseReg.lastIndex = templateLitReg.lastIndex;
        // }
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
    compiledData.push(convertToCR(endOfTemplate));

    return compiledData;
  }

  /**
   * Render a template with data and helpers.
   * @param template The name of your template to render.
   * @param data Provide data to inject.
   * @param helpers Provide helper functions to inject.
   */
  render(template: string, data: Data = {}, helpers: Helpers = {}): string {
    const { views, extension, fileResolution } = this.config;
    this.startRenderTime = performance.now();
    this.cacheHit = false;

    if (isTemplateDynamicallyDefined(template)) {
      const cachedTemplate = this.handleCachedLoadedTemplate(template);

      if (cachedTemplate) {
        return this.executeFunction(cachedTemplate, data, helpers);
      }

      // preloaded with 'loadTemplate'
      const templateLoaded = this.templateLoaded.get(template);
      if (!templateLoaded) {
        console.error(
          `Failed to get programmaticaly defined template from cache at template '${template}'`
        );
        return '';
      }

      return this.handleLoadedTemplate(template, templateLoaded, data, helpers);
    }

    if (this.templatePaths.length === 0) {
      console.error(`No template files found in ${views} with extension ${extension}`);
      return '';
    }

    const pathWithExtension = getPathWithExtension(template, extension);
    this.debug.originalFileName = pathWithExtension;

    const fullPath = getFullPath(views, pathWithExtension, fileResolution);
    const fileFound = checkAccessPermission(this.templatePaths, fullPath);
    if (!fileFound) return '';

    const cachedTemplate = this.templateStore.get(fileFound);
    if (cachedTemplate) {
      this.cacheHit = true;
      log(`${template} cache hit`);
      return this.executeFunction(cachedTemplate, data, helpers);
    }

    return this.compileAndExecute(fileFound, data, helpers);
  }

  private compileAndExecute(fullPath: string, data: Data = {}, helpers: Helpers = {}) {
    try {
      const variablesOfData = initVariablesAndHelpers(data);
      const variablesOfHelpers = initVariablesAndHelpers(helpers);
      const templateFn = this.readFileAndCompile(fullPath, variablesOfData, variablesOfHelpers);
      const immutableData = structuredClone(data);
      const html = templateFn.call(this, immutableData, helpers);
      return html;
    } catch (error) {
      const errorData = this.handleErrorMessage(error);
      // by default, no error should be returned
      console.error(errorData);
      return this.initErrorTemplate(errorData);
    }
  }

  private executeFunction(templateFn: TemplateFunction, data: Data, helpers: Helpers) {
    try {
      const immutableData = structuredClone(data);
      const html = templateFn.call(this, immutableData, helpers);
      return html;
    } catch (error: any) {
      const errorData = this.handleErrorMessage(error);
      // by default, no error should be returned
      console.error(errorData);
      return this.initErrorTemplate(errorData);
    }
  }

  private handleErrorMessage(error: any) {
    error.type = error.type ?? 'Execution Error';
    const parsingError = isAParseError(error);
    if (parsingError) return handleParseError(error);

    const { fileContent, lineNumber, message, originalFileName } = this.debug;
    const errorData = {
      originalFileName,
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

  private initErrorTemplate(errorData: Data): string {
    if (debugDisabledOrInProduction(this.config.debug)) return '';

    const templatesPath = path.join(__dirname, 'public');
    const eta = new Eta({ views: templatesPath, extension: 'html', cache: true, metrics: false });
    return eta.render('error', errorData);
  }

  private readFileAndCompile(
    resolvedPath: string,
    variablesOfData: string,
    variablesOfHelpers: string
  ) {
    this.debug.fileContent = '';
    const content = this.readFile(resolvedPath);
    this.debug.fileContent = content;
    const templateFn = this.createCompilationFunction(content, variablesOfData, variablesOfHelpers);

    if (this.config.cache) {
      this.templateStore.define(resolvedPath, templateFn);
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
    const cachedTemplate = this.templateStore.get(template);
    this.debug.originalFileName = template;

    if (!cachedTemplate) return undefined;

    log(`${template} cache hit`);
    this.cacheHit = true;
    return cachedTemplate;
  }

  private handleLoadedTemplate(
    template: string,
    templateLoaded: string,
    data: Data = {},
    helpers: Helpers = {}
  ) {
    try {
      const templateFn = this.compileLoadedTemplate(templateLoaded, data, helpers);

      if (this.config.cache) {
        this.templateStore.define(template, templateFn);
      }

      const immutableData = structuredClone(data);
      const html = templateFn.call(this, immutableData, helpers);
      return html;
    } catch (error) {
      const errorData = this.handleErrorMessage(error);
      // by default, no error should be returned
      console.error(errorData);
      return this.initErrorTemplate(errorData);
    }
  }

  private compileLoadedTemplate(content: string, data: Data = {}, helpers: Helpers = {}) {
    const variablesOfData = initVariablesAndHelpers(data);
    const variablesOfHelpers = initVariablesAndHelpers(helpers);
    const templateFn = this.createCompilationFunction(content, variablesOfData, variablesOfHelpers);

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

      this.helperStorage.define(key, fn);
    }
  }

  /**
   * Cache dynamical defined templates.
   * @param name The name of your template. Should start with a '@'.
   * @param template The template content.
   */
  loadTemplate(name: string, template: string) {
    if (!isTemplateDynamicallyDefined(name)) {
      console.error("Dynamically loaded template should start with a '@'");
      return;
    }

    this.templateLoaded.define(name, template);
  }
}
