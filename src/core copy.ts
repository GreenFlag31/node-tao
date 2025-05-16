import { defaultConfig } from './config copy';
import { escapeRegExp } from './parse copy';
import { buildParseError, EtaFileResolutionError, EtaParseError } from './err copy';
import type { DefinitiveConfig, EtaConfig } from './config copy';
import {
  checkOpeningAndClosingTag,
  checkAccessPermission,
  checkPrefixTemplateTags,
  getFullPath,
  getPathWithExtension,
  isTemplateDynamicallyDefined,
  templateContainsInclude,
  givenExtensionShouldNotStartWithADot,
} from './checks';
import { getFilesFromDirectory } from './helpers';
import fs from 'node:fs';
import promise from 'node:fs/promises';

import { log } from 'node:console';
import {
  buildPrefixRegex,
  compileBody,
  convertToCR,
  getCurrentPrefixType,
  includeCacheHit,
  includeFn,
  includeMetrics,
  includeRenderTime,
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
} from './interfaces';
import assert from 'node:assert';
import { Store } from './storage copy';
import { findOriginalLineNumberWithMessage } from './error-utils';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

export class Eta {
  // renderString = renderString;

  private config: DefinitiveConfig;
  private templatePaths: string[] = [];
  public templateStore = new Store();

  private compiledAST: AstObject[] = [];
  private compiledAnonymousFnContent = '';

  private debug: Debug = {
    originalFileName: '',
    fileContent: '',
    message: '',
    lineNumber: 1,
  };
  private startRenderTime = 0;

  // + everything should be defaulted at init
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
   * Get an array of absolute path of the mapped files
   * according to the view directory provided.
   */
  get mappedFiles() {
    return this.templatePaths;
  }

  private handleCache(template: string) {
    const cachedTemplate = this.templateStore.get(template);

    if (isTemplateDynamicallyDefined(template)) {
      if (!cachedTemplate) {
        throw new Error(
          `Failed to get programmaticaly defined template from cache (template '${template}')`
        );
      }

      return cachedTemplate;
    }

    if (this.config.cache && cachedTemplate) {
      return cachedTemplate;
    }

    return undefined;
  }

  private createCompilationFunction(content: string) {
    try {
      return new Function(TEMPLATE_VARNAME, 'hp', this.compile(content)) as TemplateFunction;
    } catch (error: any) {
      log('error inside createCompilationFn');

      if (error instanceof SyntaxError) {
        throw new EtaParseError(
          'Bad template syntax\n\n' +
            error.message +
            '\n' +
            Array(error.message.length + 1).join('=') +
            '\n' +
            this.compile(content) +
            '\n'
        );
      }

      throw error;
    }
  }

  private compile(content: string) {
    const { metrics } = this.config;
    const compiledData: AstObject[] = this.parse(content);
    this.compiledAST = compiledData;
    const isInclude = templateContainsInclude(content);

    const result = `
    ${includeFn(isInclude)}

    const ${TP_VARNAME_WITH_PREFIX} = {res: "", e: this.config.escapeFunction, f: this.config.filterFunction}
    
    ${compileBody(compiledData, this.config)}

    ${includeRenderTime(metrics)}
    ${includeCacheHit(metrics)}
    ${TP_VARNAME_WITH_PREFIX}.res += ${includeMetrics(metrics, this.mappedFiles)}

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

  cacheHit = false;

  render(templatePath: string, data: Data = {}, helpers: Helpers = {}) {
    const { views, extension } = this.config;
    this.startRenderTime = performance.now();
    this.cacheHit = false;

    assert(typeof templatePath === 'string', 'Template provided should be of type string');
    assert(
      this.templatePaths.length > 0,
      `No template files found in ${views} with extension ${extension}`
    );

    const isAbsolutePath = path.isAbsolute(templatePath);
    this.debug.originalFileName = getPathWithExtension(templatePath, extension);

    const resolvedPath = this.resolvePath(templatePath, isAbsolutePath);
    const hasAccess = checkAccessPermission(this.templatePaths, resolvedPath);
    if (!hasAccess) return '<h1>An error occurred</h1>';

    const templateCached = this.handleCache(resolvedPath);

    if (templateCached) {
      log(`${templatePath} cache hit`);
      this.cacheHit = true;
      return this.execute(templateCached, data, helpers);
    }

    const templateFn = this.readFileAndCompile(resolvedPath);
    return this.execute(templateFn, data, helpers);
  }

  private execute(templateFn: TemplateFunction, data: Data, helpers: Helpers) {
    try {
      const immutableData = structuredClone(data);
      const html = templateFn.call(this, immutableData, helpers);
      return html;
    } catch (error: any) {
      const errorData = this.handleErrorMessage(error);
      // by default, no error should be returned
      console.error(errorData);

      return this.renderErrorTemplate(errorData);
    }
  }

  private handleErrorMessage(error: any) {
    const { fileContent, lineNumber, message, originalFileName } = this.debug;
    const errorData = {
      originalFileName,
      fileContent,
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

  private renderErrorTemplate(errorData: Data): string | undefined {
    if (!this.config.debug) return '';

    const templatesPath = path.join(__dirname, 'public');
    const eta = new Eta({ views: templatesPath, extension: 'html', debug: true });
    return eta.render('error.html', errorData);
  }

  private resolvePath(templatePath: string, isAbsolute: boolean) {
    // Do not resolve dynamically loaded template
    if (isTemplateDynamicallyDefined(templatePath)) return templatePath;

    const { views, extension } = this.config;
    templatePath = getPathWithExtension(templatePath, extension);
    const resolvedFilePath = getFullPath(views, templatePath, isAbsolute);

    return resolvedFilePath;
  }

  private readFileAndCompile(resolvedPath: string) {
    const content = this.readFile(resolvedPath);
    this.debug.fileContent = content;
    const templateFn = this.createCompilationFunction(content);

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
      log(error.code);
      if (error.code === 'ENOENT') {
        throw new EtaFileResolutionError(`Could not find template: ${path}`);
      }

      throw error;
    }
  }

  private async asyncReadFile(path: string) {
    try {
      const file = await promise.readFile(path, 'utf8');
      return file;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Could not find template: ${path}`);
      }

      throw error;
    }
  }

  loadTemplate(name: string, template: string) {
    assert(typeof template === 'string', 'Provided template is not a string');
    assert(
      isTemplateDynamicallyDefined(name),
      "Dynamically loaded template should start with a '@'"
    );

    const templateFn = this.createCompilationFunction(template);
    this.templateStore.define(name, templateFn);
  }
}
