import { defaultConfig } from './config copy';
import { escapeRegExp } from './parse copy';
import { buildParseError, EtaFileResolutionError, EtaParseError } from './err copy';
import type { DefinitiveConfig, EtaConfig } from './config copy';
import {
  checkOpeningAndClosingTag,
  checkPrefixTemplateTags,
  getFullPath,
  getPathWithExtension,
  isTemplateDynamicallyDefined,
  isTemplateFileInsideGivenDirectory,
  templateContainsInclude,
  templateContainsIncludeAsync,
  templateContainsLayout,
} from './checks';
import { getFilesFromDirectory } from './helpers';
import fs from 'node:fs';
import { log } from 'node:console';
import {
  buildLayoutFunction,
  buildPrefixRegex,
  compileBody,
  convertToCR,
  getCurrentPrefixType,
  includeAsyncFn,
  includeFn,
  includeLayoutContent,
} from './utils';
import {
  templateLitReg,
  singleQuoteReg,
  doubleQuoteReg,
  AsyncFunction,
  TEMPLATE_VARNAME,
  TP_VARNAME_WITH_PREFIX,
} from './const';
import { AstObject, TagType, TemplateFunction, TemplateData, Data, Debug } from './interfaces';
import assert from 'node:assert';
import { Store } from './storage copy';
import { findOriginalLineNumberWithMessage } from './error-utils';
import path from 'node:path';

export class Eta {
  // renderAsync = renderAsync;
  // renderString = renderString;
  // renderStringAsync = renderStringAsync;

  private config: DefinitiveConfig;
  private templatePaths: string[] = [];
  private templateStore = new Store();

  private compiledAST: AstObject[] = [];
  private compiledAnonymousFnContent = '';

  private debug: Debug = {
    originalFileName: '',
    fileContent: '',
    message: '',
    lineNumber: 1,
  };

  // + everything should be defaulted at init
  constructor(customConfig: EtaConfig = {}) {
    this.config = Object.freeze({ ...defaultConfig, ...customConfig } as DefinitiveConfig);
    const { views, extension, tags, parse } = this.config;

    checkOpeningAndClosingTag(tags);
    checkPrefixTemplateTags(parse);

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

  private handleCache(template: string, cache: boolean) {
    const cachedTemplate = this.templateStore.get(template);

    if (isTemplateDynamicallyDefined(template)) {
      if (!cachedTemplate) {
        throw new Error(
          `Failed to get programmaticaly defined template from cache (template '${template}')`
        );
      }

      return cachedTemplate;
    }

    if (cache && cachedTemplate) {
      return cachedTemplate;
    }

    return undefined;
  }

  private createCompilationFunction(content: string, isAsync: boolean) {
    const Fn = isAsync ? (AsyncFunction as FunctionConstructor) : Function;

    try {
      return new Fn(
        TEMPLATE_VARNAME,
        'isAsync',
        this.compile(content, isAsync)
      ) as TemplateFunction;
    } catch (error: any) {
      log('error inside createCompilationFn');

      if (error instanceof SyntaxError) {
        throw new EtaParseError(
          'Bad template syntax\n\n' +
            error.message +
            '\n' +
            Array(error.message.length + 1).join('=') +
            '\n' +
            this.compile(content, isAsync) +
            '\n'
        );
      }

      throw error;
    }
  }

  private compile(content: string, isAsync: boolean) {
    const { functionHeader } = this.config;

    const compiledData: AstObject[] = this.parse(content);
    this.compiledAST = compiledData;
    const isLayout = templateContainsLayout(content);
    const isInclude = templateContainsInclude(content);
    const isIncludeAsync = templateContainsIncludeAsync(content);

    const result = `${functionHeader}
  ${includeFn(isInclude)}
  ${includeAsyncFn(isIncludeAsync)}


  const ${TP_VARNAME_WITH_PREFIX} = {res: "", e: this.config.escapeFunction, f: this.config.filterFunction}
  
  ${buildLayoutFunction(isLayout)}
    
  ${compileBody(compiledData, this.config)}

  ${includeLayoutContent(isLayout, isAsync)}

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

  // ++ vérifier après que les fonctions resolvePath && readFile
  // (assert) sont définies par l'utilisateur si écrasées
  render(templatePath: string, data: Data, cache = false) {
    assert(typeof templatePath === 'string', 'Template provided is not a string');

    const isAbsolutePath = path.isAbsolute(templatePath);
    const isAsync = false;
    this.debug.originalFileName = getPathWithExtension(templatePath, this.config.extension);

    const resolvedPath = this.resolvePath(templatePath, isAbsolutePath);
    const templateCached = this.handleCache(resolvedPath, cache);

    if (templateCached) {
      log(`${templatePath} cache hit`);
      return this.execute(templateCached, data, isAsync);
    }

    const templateFn = this.readFileAndCompile(resolvedPath, isAsync, cache);
    return this.execute(templateFn, data, isAsync);
  }

  private execute(templateFn: TemplateFunction, data: Data, isAsync: boolean) {
    try {
      const html = templateFn.call(this, data, isAsync);
      return html;
    } catch (error: any) {
      const errorData = this.handleErrorMessage(error);
      // by default, no error should be returned
      log(errorData);
    }
  }

  private handleErrorMessage(error: any) {
    const [message, lineNumber] = findOriginalLineNumberWithMessage(
      error,
      this.compiledAST,
      this.compiledAnonymousFnContent
    );
    this.debug = { ...this.debug, message, lineNumber };
    return this.debug;
  }

  private resolvePath(templatePath: string, isAbsolute: boolean) {
    // Do not resolve dynamically loaded template
    if (isTemplateDynamicallyDefined(templatePath)) return templatePath;

    const { views, extension } = this.config;
    templatePath = getPathWithExtension(templatePath, extension);
    const resolvedFilePath = getFullPath(views, templatePath, isAbsolute);

    const templateExists = isTemplateFileInsideGivenDirectory(this.templatePaths, resolvedFilePath);
    assert(templateExists, 'An error occurred');

    // log(resolvedFilePath);
    return resolvedFilePath;
  }

  private readFileAndCompile(resolvedPath: string, isAsync: boolean, cache: boolean) {
    const content = this.readFile(resolvedPath);
    this.debug.fileContent = content;
    const templateFn = this.createCompilationFunction(content, isAsync);

    if (cache) {
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

  loadTemplate(name: string, template: string, isAsync = false) {
    assert(typeof template === 'string', 'Provided template is not a string');
    assert(
      isTemplateDynamicallyDefined(name),
      "Dynamically loaded template should start with a '@'"
    );

    const templateFn = this.createCompilationFunction(template, isAsync);
    this.templateStore.define(name, templateFn);
  }
}
