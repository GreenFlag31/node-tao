import { defaultConfig } from './config copy';
import { escapeRegExp, getLineNo } from './parse copy';
import { buildParseError, EtaFileResolutionError, EtaParseError, RuntimeErr } from './err copy';
import type { EtaConfig } from './config copy';
import {
  checkOpeningAndClosingTag,
  checkPrefixTemplateTags,
  getFullPath,
  getPathWithExtension,
  isTemplateDynamicallyDefined,
  isTemplateFileInsideGivenDirectory,
} from './checks';
import { getFilesFromDirectory } from './helpers';
import fs from 'node:fs';
import { log, time, timeEnd } from 'node:console';
import {
  buildPrefixRegex,
  compileContent,
  convertToCR,
  debugAtCompilationStart,
  getCurrentPrefixType,
} from './utils';
import {
  templateLitReg,
  singleQuoteReg,
  doubleQuoteReg,
  AsyncFunction,
  TEMPLATE_VARNAME,
  TP_VARNAME_ANONYMOUS_FN,
} from './const';
import { AstObject, TagType, TemplateFunction, TemplateData, Data, Debug } from './interfaces';
import assert from 'node:assert';
import { Cacher } from './storage copy';
import { findOriginalLineNumberWithMessage } from './error-utils';

export class Eta {
  RuntimeErr = RuntimeErr;
  // renderAsync = renderAsync;
  // renderString = renderString;
  // renderStringAsync = renderStringAsync;

  private config: Required<EtaConfig>;
  private templatePaths: string[] = [];
  private templatesSync = new Cacher();
  private templatesAsync = new Cacher();

  private compiledAST: AstObject[] = [];
  private compiledAnonymousFnContent = '';

  private debug: Debug = {
    originalFileName: '',
    fileContent: '',
    message: '',
    lineNumber: 0,
  };

  constructor(customConfig: EtaConfig) {
    // + everything should be defaulted at init
    this.config = Object.freeze({ ...defaultConfig, ...customConfig });
    const { views, defaultExtension, tags, parse } = this.config;

    checkOpeningAndClosingTag(tags);
    checkPrefixTemplateTags(parse);

    this.templatePaths = getFilesFromDirectory(views, defaultExtension);
  }

  private handleCache(template: string, templateStore: Cacher) {
    const cachedTemplate = templateStore.get(template);

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
    const { debug, functionHeader } = this.config;

    const compiledData: AstObject[] = this.parse(content);
    this.compiledAST = compiledData;
    const compiledContent = this.compileBody(compiledData);

    const result = `${functionHeader}
  const include = (templatePath, data, isAbsolutePath) => this.render(templatePath, data, isAbsolutePath);
  const includeAsync = (templatePath, data, isAbsolutePath) => this.renderAsync(templatePath, data, isAbsolutePath);

  
  const ${TP_VARNAME_ANONYMOUS_FN} = {res: "", e: this.config.escapeFunction, f: this.config.filterFunction${debugAtCompilationStart(
      debug,
      content
    )}};
  
  function layout(path, data, isAbsolutePath) {
    ${TP_VARNAME_ANONYMOUS_FN}.layoutPath = path;
    ${TP_VARNAME_ANONYMOUS_FN}.layoutData = data;
    ${TP_VARNAME_ANONYMOUS_FN}.layoutAbsolute = isAbsolutePath;
  }
    
  ${debug ? 'try {' : ''}
  ${compiledContent}

  if (${TP_VARNAME_ANONYMOUS_FN}.layoutPath) {
    ${TP_VARNAME_ANONYMOUS_FN}.res = ${
      isAsync ? 'await includeAsync' : 'include'
    }(${TP_VARNAME_ANONYMOUS_FN}.layoutPath, {...${TEMPLATE_VARNAME}, body: ${TP_VARNAME_ANONYMOUS_FN}.res, ...${TP_VARNAME_ANONYMOUS_FN}.layoutData},
    ${TP_VARNAME_ANONYMOUS_FN}.layoutAbsolute);
  }

  ${
    debug
      ? '} catch (e) { this.RuntimeErr(e, ${TP_VARNAME_ANONYMOUS_FN}.templateStr, ${TP_VARNAME_ANONYMOUS_FN}.line, options.filepath) }'
      : ''
  }

  return ${TP_VARNAME_ANONYMOUS_FN}.res;
  `;

    this.compiledAnonymousFnContent = result;
    return result;
  }

  private parse(expression: string): AstObject[] {
    const { parse, tags, debug } = this.config;
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

      if (debug) {
        templateData.lineNo = getLineNo(expression, openingResult.index);
      }

      compiledData.push(templateData);
    }

    const endOfTemplate = expression.slice(lastIndex);
    compiledData.push(convertToCR(endOfTemplate));

    return compiledData;
  }

  private compileBody(templateValues: AstObject[]) {
    // const { debug } = this.config;
    let result = '';

    for (const value of templateValues) {
      if (typeof value === 'string') {
        // HTML content
        result += `__${TEMPLATE_VARNAME}.res+='${value}';\n`;
        continue;
      }

      const { type, lineNo, content = '' } = value;

      // if (debug) {
      //   result += `__eta.line=${lineNo};\n`;
      // }

      result += compileContent(type, content, this.config);
    }

    return result;
  }

  // ++ vérifier après que les fonctions resolvePath && readFile
  // (assert) sont définies par l'utilisateur si écrasées
  render(templatePath: string, data: Data, isAbsolutePath = false) {
    assert(typeof templatePath === 'string', 'Template provided is not a string');
    // time('Template rendered in');
    const isAsync = false;
    this.debug.originalFileName = getPathWithExtension(templatePath, this.config.defaultExtension);

    const templateCached = this.handleCache(templatePath, this.templatesSync);
    if (templateCached) {
      return templateCached.call(this, data, isAsync);
    }

    const resolvedPath = this.resolvePath(templatePath, isAbsolutePath);
    const templateFn = this.readFileAndCompile(resolvedPath, isAsync);

    try {
      // call the new Function()
      const result = templateFn.call(this, data, isAsync);
      // timeEnd('Template rendered in');
      return result;
    } catch (error: any) {
      this.handleErrorMessage(error);
    }
  }

  private handleErrorMessage(error: any) {
    const [message, lineNumber] = findOriginalLineNumberWithMessage(
      error,
      this.compiledAST,
      this.compiledAnonymousFnContent
    );
    this.debug = { ...this.debug, message, lineNumber };
    log(this.debug);
  }

  private resolvePath(templatePath: string, isAbsolute: boolean) {
    const { views, defaultExtension } = this.config;

    templatePath = getPathWithExtension(templatePath, defaultExtension);
    const resolvedFilePath = getFullPath(views, templatePath, isAbsolute);

    const templateExists = isTemplateFileInsideGivenDirectory(this.templatePaths, resolvedFilePath);
    assert(templateExists, 'An error occurred');

    // log(resolvedFilePath);
    return resolvedFilePath;
  }

  private readFileAndCompile(resolvedPath: string, isAsync: boolean) {
    const templateStore = isAsync ? this.templatesAsync : this.templatesSync;

    const content = this.readFile(resolvedPath);
    this.debug.fileContent = content;
    const templateFn = this.createCompilationFunction(content, isAsync);

    if (this.config.cache) {
      templateStore.define(resolvedPath, templateFn);
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
    assert(name.startsWith('@'), "Dynamically loaded template should start with a '@'");

    const templateStore = isAsync ? this.templatesAsync : this.templatesSync;
    templateStore.define(name, this.createCompilationFunction(template, isAsync));
  }
}
