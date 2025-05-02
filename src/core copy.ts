import { defaultConfig } from "./config copy";
import { escapeRegExp, getLineNo } from "./parse copy";
import { buildParseError, EtaFileResolutionError, EtaParseError, RuntimeErr } from "./err copy";
import type { EtaConfig } from "./config copy";
import {
  getFullPath,
  getPathWithExtension,
  isTemplateDynamicallyDefined,
  isTemplateFileInsideGivenDirectory,
} from "./checks";
import { getFilesFromDirectory } from "./helpers";
import fs from "node:fs";
import { log } from "node:console";
import {
  buildPrefixRegex,
  compileContent,
  convertToCR,
  debugAtCompilationStart,
  getCurrentPrefixType,
} from "./utils";
import { config } from "node:process";
import {
  templateLitReg,
  singleQuoteReg,
  doubleQuoteReg,
  AsyncFunction,
  TEMPLATE_VARNAME,
} from "./const";
import { AstObject, TagType, TemplateFunction, TemplateData, Data } from "./interfaces";
import assert from "node:assert";
import { Cacher } from "./storage copy";

export class Eta {
  RuntimeErr = RuntimeErr;
  // renderAsync = renderAsync;
  // renderString = renderString;
  // renderStringAsync = renderStringAsync;

  private config: Required<EtaConfig>;
  private templatePaths: string[] = [];
  private templatesSync = new Cacher();
  private templatesAsync = new Cacher();

  constructor(customConfig: EtaConfig) {
    // + everything should be defaulted at init
    this.config = Object.freeze({ ...defaultConfig, ...customConfig });
    const { views, defaultExtension } = this.config;
    assert(views, "View directory is not defined");

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
        "isAsync",
        this.compile(content, isAsync)
      ) as TemplateFunction;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new EtaParseError(
          "Bad template syntax\n\n" +
            error.message +
            "\n" +
            Array(error.message.length + 1).join("=") +
            "\n" +
            this.compile(content, isAsync) +
            "\n"
        );
      }

      throw error;
    }
  }

  private compile(content: string, isAsync: boolean) {
    const { debug, functionHeader } = this.config;

    const compiledData: AstObject[] = this.parse(content);
    const compiledContent = this.compileBody(compiledData);

    const result = `${functionHeader}
  const include = (templatePath, data, isAbsolutePath) => this.render(templatePath, data, isAbsolutePath);
  const includeAsync = (templatePath, data, isAbsolutePath) => this.renderAsync(templatePath, data, isAbsolutePath);

  
  const __eta = {res: "", e: this.config.escapeFunction, f: this.config.filterFunction${debugAtCompilationStart(
    debug,
    content
  )}};
  
  function layout(path, data, isAbsolutePath) {
    __eta.layoutPath = path;
    __eta.layoutData = data;
    __eta.layoutAbsolute = isAbsolutePath;
  }
    
  ${debug ? "try {" : ""}
  ${compiledContent}

  if (__eta.layoutPath) {
    __eta.res = ${
      isAsync ? "await includeAsync" : "include"
    }(__eta.layoutPath, {...${TEMPLATE_VARNAME}, body: __eta.res, ...__eta.layoutData},
    __eta.layoutAbsolute);
  }

  ${
    debug
      ? "} catch (e) { this.RuntimeErr(e, __eta.templateStr, __eta.line, options.filepath) }"
      : ""
  }

  return __eta.res;
  `;

    return result;
  }

  private parse(expression: string): AstObject[] {
    const { parse, tags, debug } = this.config;

    const compiledData: AstObject[] = [];
    let lastIndex = 0;
    const parseOptions = parse;

    const prefixes = [parseOptions.exec, parseOptions.interpolate, parseOptions.raw].reduce(
      function (accumulator, prefix) {
        if (accumulator && prefix) {
          return accumulator + "|" + escapeRegExp(prefix);
        } else if (prefix) {
          // accumulator is falsy
          return escapeRegExp(prefix);
        } else {
          // prefix and accumulator are both falsy
          return accumulator;
        }
      },
      ""
    );

    const pr = buildPrefixRegex(parseOptions);
    const opening = tags[0];
    const closing = tags[1];
    assert(pr === prefixes, "buildprefixregex not the same");

    const parseOpenReg = new RegExp(
      escapeRegExp(opening) + "(-|_)?\\s*(" + prefixes + ")?\\s*",
      "g"
    );

    const parseCloseReg = new RegExp(
      "'|\"|`|\\/\\*|(\\s*(-|_)?" + escapeRegExp(closing) + ")",
      "g"
    );

    let openingResult: RegExpExecArray | null = null;

    while ((openingResult = parseOpenReg.exec(expression))) {
      const [original, dashOrUnderscore, openingPrefix = ""] = openingResult;
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

        if (original === "/*") {
          const commentCloseInd = expression.indexOf("*/", parseCloseReg.lastIndex);

          if (commentCloseInd === -1) {
            const error = buildParseError("Unclosed comment", expression, closeResult.index);
            throw new EtaParseError(error);
          }

          parseCloseReg.lastIndex = commentCloseInd;
        } else if (original === "'") {
          singleQuoteReg.lastIndex = closeResult.index;

          const singleQuoteMatch = singleQuoteReg.exec(expression);
          if (!singleQuoteMatch) {
            const error = buildParseError("Unclosed string", expression, closeResult.index);
            throw new EtaParseError(error);
          }

          parseCloseReg.lastIndex = singleQuoteReg.lastIndex;
        } else if (original === '"') {
          doubleQuoteReg.lastIndex = closeResult.index;
          const doubleQuoteMatch = doubleQuoteReg.exec(expression);

          if (!doubleQuoteMatch) {
            const error = buildParseError("Unclosed string", expression, closeResult.index);
            throw new EtaParseError(error);
          }

          parseCloseReg.lastIndex = doubleQuoteReg.lastIndex;
        } else if (original === "`") {
          templateLitReg.lastIndex = closeResult.index;
          const templateLitMatch = templateLitReg.exec(expression);

          if (!templateLitMatch) {
            const error = buildParseError("Unclosed string", expression, closeResult.index);
            throw new EtaParseError(error);
          }

          parseCloseReg.lastIndex = templateLitReg.lastIndex;
        }
      }

      if (templateData === undefined) {
        const error = buildParseError("Unclosed tag", expression, openingResult.index);
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
    const { debug } = this.config;
    let result = "";

    for (const value of templateValues) {
      if (typeof value === "string") {
        result += `__eta.res+='${value}';\n`;
        continue;
      }

      const { type, lineNo, content = "" } = value;

      if (debug) {
        result += `__eta.line=${lineNo};\n`;
      }

      result += compileContent(type, content, this.config);
    }

    return result;
  }

  // ++ vérifier après que les fonctions resolvePath && readFile
  // (assert) sont définies par l'utilisateur si écrasées
  // scission claire entre les options envoyées par l'utilisateur
  // et les variables internes => options.filepath
  // render(template: string, data: Data, meta?: { absoluteTemplatepath: string })
  render(templatePath: string, data: Data, isAbsolutePath = false) {
    assert(typeof templatePath === "string", "Template provided is not a string");
    const isAsync = false;

    const templateCached = this.handleCache(templatePath, this.templatesSync);
    if (templateCached) {
      return templateCached.call(this, data, isAsync);
    }

    const resolvedPath = this.resolvePath(templatePath, isAbsolutePath);
    const templateFn = this.readFileAndCompile(resolvedPath, isAsync);

    // call the new Function()
    return templateFn.call(this, data, isAsync);
  }

  private resolvePath(templatePath: string, isAbsolute: boolean) {
    const views = this.config.views!;

    templatePath = getPathWithExtension(templatePath, this.config.defaultExtension);
    const resolvedFilePath = getFullPath(views, templatePath, isAbsolute);

    const templateExists = isTemplateFileInsideGivenDirectory(this.templatePaths, resolvedFilePath);
    assert(templateExists, "An error occurred");

    // log(resolvedFilePath);
    return resolvedFilePath;
  }

  private readFileAndCompile(resolvedPath: string, isAsync: boolean) {
    const templateStore = isAsync ? this.templatesAsync : this.templatesSync;

    const content = this.readFile(resolvedPath);
    const templateFn = this.createCompilationFunction(content, isAsync);

    if (this.config.cache) {
      templateStore.define(resolvedPath, templateFn);
    }

    return templateFn;
  }

  private readFile(path: string) {
    try {
      const file = fs.readFileSync(path, "utf8");
      return file;
    } catch (error: any) {
      log(error.code);
      if (error.code === "ENOENT") {
        throw new EtaFileResolutionError(`Could not find template: ${path}`);
      }

      throw error;
    }
  }

  loadTemplate(name: string, template: string, isAsync = false) {
    assert(typeof template === "string", "Provided template is not a string");

    const templates = isAsync ? this.templatesAsync : this.templatesSync;
    templates.define(name, this.createCompilationFunction(template, isAsync));
  }
}
