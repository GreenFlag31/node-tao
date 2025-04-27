import { Cacher } from "./storage";
import { defaultConfig } from "./config copy";
import { escapeRegExp, getLineNo } from "./parse copy";
// import { renderAsync, renderString, renderStringAsync } from "./render copy";
import {
  buildParseError,
  EtaFileResolutionError,
  EtaNameResolutionError,
  EtaParseError,
  RuntimeErr,
} from "./err copy";
import type { EtaConfig, Options } from "./config copy";
import { getFullPath, getPathWithExtension } from "./checks";
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
import { templateLitReg, singleQuoteReg, doubleQuoteReg, AsyncFunction } from "./const";
import { AstObject, TagType, TemplateFunction, TemplateData } from "./interfaces";
import assert from "node:assert";

export class Eta {
  config: EtaConfig;
  RuntimeErr = RuntimeErr;
  // renderAsync = renderAsync;
  // renderString = renderString;
  // renderStringAsync = renderStringAsync;

  templatesSync = new Cacher<TemplateFunction>({});
  templatesAsync = new Cacher<TemplateFunction>({});

  constructor(customConfig: Partial<EtaConfig> = {}) {
    this.config = { ...defaultConfig, ...customConfig };
    const { views, defaultExtension } = this.config;

    const templatePaths = getFilesFromDirectory(views!, defaultExtension!);

    log(templatePaths);

    // checks directly if views is defined
    // + everything should be defaulted at init
    // create init function
    // checkIfViewsExists(this.config.views);
  }

  handleCache(template: string, options: Partial<Options>): TemplateFunction | undefined {
    const templateStore = options && options.async ? this.templatesAsync : this.templatesSync;
    const cachedTemplate = templateStore.get(template);

    if (template.startsWith("@")) {
      // programatically defined partial/layout
      // should have been loaded before with "loadTemplate"
      if (cachedTemplate) return cachedTemplate;

      throw new EtaNameResolutionError(`Failed to get template '${template}'`);
    }

    if (this.config.cache && cachedTemplate) {
      return cachedTemplate;
    }

    return undefined;
  }

  compile(str: string, options?: Partial<Options>) {
    // code gratefully taken from https://github.com/mde/ejs and adapted
    const Fn = options && options.async ? (AsyncFunction as FunctionConstructor) : Function;

    try {
      return new Fn(
        this.config.varName,
        "options",
        this.compileToString(str, options)
      ) as TemplateFunction;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new EtaParseError(
          "Bad template syntax\n\n" +
            error.message +
            "\n" +
            Array(error.message.length + 1).join("=") +
            "\n" +
            this.compileToString(str, options) +
            "\n" // This will put an extra newline before the callstack for extra readability
        );
      }

      throw error;
    }
  }

  compileToString(str: string, options?: Partial<Options>): string {
    const isAsync = options && options.async;
    const { debug, useWith, functionHeader, varName } = this.config;

    const buffer: AstObject[] = this.parse(str);
    const compiledContent = this.compileBody(buffer);

    // note: when the include function passes through options, the only parameter that matters is the filepath parameter
    let res = `${functionHeader}
  const include = (template, data) => this.render(template, data, options);
  const includeAsync = (template, data) => this.renderAsync(template, data, options);
  
  const __eta = {res: "", e: this.config.escapeFunction, f: this.config.filterFunction${debugAtCompilationStart(
    debug,
    str
  )}};
  
  function layout(path, data) {
    __eta.layout = path;
    __eta.layoutData = data;
  }${debug ? "try {" : ""}${useWith ? "with(" + varName + "||{}){" : ""}
  
  ${compiledContent}
  if (__eta.layout) {
    __eta.res = ${
      isAsync ? "await includeAsync" : "include"
    } (__eta.layout, {...${varName}, body: __eta.res, ...__eta.layoutData});
  }
  ${useWith ? "}" : ""}${
      debug
        ? "} catch (e) { this.RuntimeErr(e, __eta.templateStr, __eta.line, options.filepath) }"
        : ""
    }
  return __eta.res;
  `;

    for (let i = 0; i < this.config.plugins.length; i++) {
      const plugin = this.config.plugins[i];
      if (plugin.processFnString) {
        res = plugin.processFnString(res, this.config);
      }
    }

    return res;
  }

  parse(expression: string): AstObject[] {
    const { plugins, parse, rmWhitespace, tags, debug } = this.config;

    let compiledData: AstObject[] = [];
    let lastIndex = 0;
    const parseOptions = parse;

    if (plugins) {
      // c'est un tableau vide!
      for (let i = 0; i < plugins.length; i++) {
        const plugin = plugins[i];
        if (plugin.processTemplate) {
          expression = plugin.processTemplate(expression, this.config);
        }
      }
    }

    /* Adding for EJS compatibility */
    if (rmWhitespace) {
      // Code taken directly from EJS
      // Have to use two separate replaces here as `^` and `$` operators don't
      // work well with `\r` and empty lines don't work well with the `m` flag.
      // Essentially, this replaces the whitespace at the beginning and end of
      // each line and removes multiple newlines.
      expression = expression.replace(/[\r\n]+/g, "\n").replace(/^\s+|\s+$/gm, "");
    }
    /* End rmWhitespace option */

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
    const openingTag = tags[0];
    const endingTag = tags[1];
    assert(pr === prefixes, "buildprefixregex not the same");

    const parseOpenReg = new RegExp(
      escapeRegExp(openingTag) + "(-|_)?\\s*(" + prefixes + ")?\\s*",
      "g"
    );

    const parseCloseReg = new RegExp(
      "'|\"|`|\\/\\*|(\\s*(-|_)?" + escapeRegExp(endingTag) + ")",
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

    if (plugins) {
      for (let i = 0; i < plugins.length; i++) {
        const plugin = plugins[i];
        if (plugin.processAST) {
          compiledData = plugin.processAST(compiledData, config);
        }
      }
    }

    return compiledData;
  }

  compileBody(templateValues: AstObject[]): string {
    const { debug } = this.config;
    let result = "";

    for (const value of templateValues) {
      if (typeof value === "string") {
        result += `__eta.res+='${value}'\n`;
        continue;
      }

      const { type, lineNo, content = "" } = value;

      if (debug) {
        result += `__eta.line=${lineNo}\n`;
      }

      result += compileContent(type, content, this.config);
    }

    return result;
  }

  render<T extends object>(template: string, data: T, meta?: { filepath: string }): string {
    assert(typeof template === "string", "Template provided is not a string");
    const options = { ...meta, async: false };

    // ++ vérifier après que les fonctions resolvePath && readFile
    // assert
    // sont définies par l'utilisateur si écrasées
    const programaticallyDefinedTemplate = template.startsWith("@");
    if (!programaticallyDefinedTemplate) {
      options.filepath = this.resolvePath(template, options);
    }

    const templateHasBeenCached = this.handleCache(template, options);
    let templateFn = templateHasBeenCached;
    if (!templateHasBeenCached) {
      templateFn = this.readFileAndCompile(options);
    }

    // call the new Function()
    const res = templateFn!.call(this, data, options);
    return res;
  }

  readFileAndCompile(options: Partial<Options>) {
    const templatePath = options.filepath as string;
    const templateStore = options && options.async ? this.templatesAsync : this.templatesSync;

    const templateString = this.readFile(templatePath);
    const templateFn = this.compile(templateString, options);

    if (this.config.cache) {
      templateStore.define(templatePath, templateFn);
    }

    return templateFn;
  }

  /**
   * Get the full path.
   * NodeJS recommands to checks the file directly and handle the error raised if the file is not accessible. => will be done in `readFile`
   */
  resolvePath(templatePath: string, options: Partial<Options> = {}): string {
    const views = this.config.views!;
    const baseFilePath = options.filepath;

    templatePath = getPathWithExtension(templatePath, this.config.defaultExtension);
    const resolvedFilePath = getFullPath(views, baseFilePath, templatePath);

    // +++ security
    // const templateExists=isTemplateFileInsideGivenDirectory(XXX, resolvedFilePath)

    // log(resolvedFilePath);
    return resolvedFilePath;
  }

  readFile(path: string) {
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

  loadTemplate(name: string, template: string, options?: { async: boolean }) {
    assert(typeof template === "string", "Provided template is not a string");

    const templates = options && options.async ? this.templatesAsync : this.templatesSync;

    templates.define(name, this.compile(template, options));
  }
}
