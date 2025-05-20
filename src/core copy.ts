import { defaultConfig } from './config copy';
import { escapeRegExp } from './parse copy';
import { buildParseError, EtaParseError } from './err copy';
import type { DefinitiveConfig, EtaConfig } from './config copy';
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
import {
  templateLitReg,
  singleQuoteReg,
  doubleQuoteReg,
  TEMPLATE_VARNAME,
  TP_VARNAME_WITH_PREFIX,
} from './const';
import {
  AstObject,
  TagType,
  TemplateFunction,
  TemplateData,
  Data,
  Debug,
  Helpers,
  TemplateLoaded,
  HelperFunction,
  Metrics,
} from './interfaces';
import assert from 'node:assert';
import { Store } from './storage copy';
import { findOriginalLineNumberWithMessage } from './error-utils';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { includeCacheHit, includeMetrics, includeRenderTime } from './metrics';

export class Eta {
  // renderString = renderString;

  private config: DefinitiveConfig;
  private templatePaths: string[] = [];

  /**
   * Stores the dynamically defined templates.
   */
  public templateStore = new Store();
  /**
   * Stores the cached template.
   */
  public templateLoaded = new Store<TemplateLoaded>();
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
    this.config = Object.freeze({ ...defaultConfig, ...customConfig } as DefinitiveConfig);
    const { views, extension, tags, parse } = this.config;

    checkOpeningAndClosingTag(tags);
    checkPrefixTemplateTags(parse);
    givenExtensionShouldNotStartWithADot(extension);

    this.templatePaths = getFilesFromDirectory(views, extension);
  }

  /**
   * Get the current config.
   */
  get currentConfig() {
    return this.config;
  }

  /**
   * Get an array of absolute paths of the mapped files according to the view directory provided.
   */
  get mappedFiles() {
    return this.templatePaths;
  }

  private createCompilationFunction(
    content: string,
    variablesOfData: string,
    variablesOfHelpers: string
  ) {
    return new Function(
      TEMPLATE_VARNAME,
      'hp',
      this.compile(content, variablesOfData, variablesOfHelpers)
    ) as TemplateFunction;
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


    const ${TP_VARNAME_WITH_PREFIX} = {res: "", e: this.config.escapeFunction, f: this.config.filterFunction}
    
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
    const parseOptions = parse;

    const prefixes = [parseOptions.exec, parseOptions.interpolate, parseOptions.raw].reduce(
      function (accumulator, prefix) {
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
      ''
    );

    const pr = buildPrefixRegex(parseOptions);
    assert(pr === prefixes, 'buildprefixregex not the same');

    const parseOpenReg = new RegExp(
      escapeRegExp(opening) + '(-|_)?\\s*(' + prefixes + ')?\\s*',
      'g'
    );

    const parseCloseReg = new RegExp(
      '\'|"|`|\\/\\*|(\\s*(-|_)?' + escapeRegExp(closing) + ')',
      'g'
    );

    let openingResult: RegExpExecArray | null = null;

    while ((openingResult = parseOpenReg.exec(expression))) {
      const [original, dashOrUnderscore, openingPrefix = ''] = openingResult;
      let closeResult: RegExpExecArray | null = null;
      let templateData: TemplateData | undefined = undefined;

      const precedingExpression = expression.slice(lastIndex, openingResult.index);

      lastIndex = original.length + openingResult.index;
      const prefix = openingPrefix; // by default either ~, =, or empty

      compiledData.push(convertToCR(precedingExpression));

      parseCloseReg.lastIndex = lastIndex;

      while ((closeResult = parseCloseReg.exec(expression))) {
        const [original, closePrefix] = closeResult;

        if (closePrefix) {
          const content = expression.slice(lastIndex, closeResult.index);

          lastIndex = parseCloseReg.lastIndex;
          parseOpenReg.lastIndex = lastIndex;

          const currentType: TagType = getCurrentPrefixType(prefix, parse);
          templateData = { type: currentType, content };
          break;
        }

        if (original === '/*') {
          const commentCloseInd = expression.indexOf('*/', parseCloseReg.lastIndex);

          if (commentCloseInd === -1) {
            const error = buildParseError('Unclosed comment', expression, closeResult.index);
            throw new EtaParseError(error);
          }

          parseCloseReg.lastIndex = commentCloseInd;
        } else if (original === "'") {
          singleQuoteReg.lastIndex = closeResult.index;

          const singleQuoteMatch = singleQuoteReg.exec(expression);
          if (!singleQuoteMatch) {
            const error = buildParseError('Unclosed string', expression, closeResult.index);
            throw new EtaParseError(error);
          }

          parseCloseReg.lastIndex = singleQuoteReg.lastIndex;
        } else if (original === '"') {
          doubleQuoteReg.lastIndex = closeResult.index;
          const doubleQuoteMatch = doubleQuoteReg.exec(expression);

          if (!doubleQuoteMatch) {
            const error = buildParseError('Unclosed string', expression, closeResult.index);
            throw new EtaParseError(error);
          }

          parseCloseReg.lastIndex = doubleQuoteReg.lastIndex;
        } else if (original === '`') {
          templateLitReg.lastIndex = closeResult.index;
          const templateLitMatch = templateLitReg.exec(expression);

          if (!templateLitMatch) {
            const error = buildParseError('Unclosed string', expression, closeResult.index);
            throw new EtaParseError(error);
          }

          parseCloseReg.lastIndex = templateLitReg.lastIndex;
        }
      }

      if (templateData === undefined) {
        const error = buildParseError('Unclosed tag', expression, openingResult.index);
        throw new EtaParseError(error);
      }

      compiledData.push(templateData);
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
    const { views, extension } = this.config;
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

    const fullPath = getFullPath(views, pathWithExtension);
    const hasAccess = checkAccessPermission(this.templatePaths, fullPath);
    if (!hasAccess) return '';

    const cachedTemplate = this.templateStore.get(fullPath);
    if (cachedTemplate) {
      this.cacheHit = true;
      log(`${template} cache hit`);
      return this.executeFunction(cachedTemplate, data, helpers);
    }

    return this.compileAndExecute(fullPath, data, helpers);
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

  private executeFunction(templateFn: TemplateFunction, data: Data, helpers: Helpers): string {
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
    const { fileContent, lineNumber, message, originalFileName } = this.debug;
    const errorData = {
      originalFileName,
      fileContent: [fileContent],
      message,
      lineNumber,
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
