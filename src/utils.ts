import type { EtaConfig } from "./config copy";
import type { EtaConfig as OriginalConfig } from "./config";
import { escMap, TEMPLATE_VARNAME } from "./const";
import { Parse, TagType } from "./interfaces";
import { escapeRegExp } from "./parse copy";

function debugAtCompilationStart(debug: boolean, value: string) {
  if (!debug) return "";

  return `, line: 1, templateStr: "${convertToCR(value)}"`;
}

function convertToCR(value: string) {
  return value.replace(/\\|'/g, "\\$&").replace(/\r\n|\n|\r/g, "\\n");
}

function getCurrentPrefixType(prefix: string, parse: Parse): TagType {
  const parseOptions: Record<string, TagType> = {
    [parse.exec]: "execute",
    [parse.raw]: "raw",
    [parse.interpolate]: "interpolate",
  };

  return parseOptions[prefix] ?? "";
}

function compileContent(type: TagType, content: string, config: EtaConfig) {
  const { autoEscape, autoFilter } = config;

  if (type === "raw") {
    if (autoFilter) {
      content = `__eta.f(${content});`;
    }

    return `__eta.res+=${content};\n`;
  }

  if (type === "interpolate") {
    if (autoFilter) {
      content = `__eta.f(${content})`;
    }

    if (autoEscape) {
      content = `__eta.e(${TEMPLATE_VARNAME}.${content})`;
    }

    return `__eta.res+=${content};\n`;
  }

  if (type === "execute") {
    return `${content};\n`;
  }
}

function buildPrefixRegex(parseOptions: Parse) {
  const options: string[] = [];

  for (const prefix of Object.values(parseOptions)) {
    if (!prefix) continue;

    const prefixEscaped = escapeRegExp(prefix);
    options.push(prefixEscaped);
  }

  return options.join("|");
}

/**
 * Takes a string within a template and trims it, based on the preceding tag's whitespace control and `config.autoTrim`
 */
function trimWS(
  str: string,
  config: OriginalConfig,
  wsLeft: string | false,
  wsRight?: string | false
): string {
  let leftTrim;
  let rightTrim;

  if (Array.isArray(config.autoTrim)) {
    // Slightly confusing,
    // but _}} will trim the left side of the following string
    leftTrim = config.autoTrim[1];
    rightTrim = config.autoTrim[0];
  } else {
    leftTrim = rightTrim = config.autoTrim;
  }

  if (wsLeft || wsLeft === false) {
    leftTrim = wsLeft;
  }

  if (wsRight || wsRight === false) {
    rightTrim = wsRight;
  }

  if (!rightTrim && !leftTrim) {
    return str;
  }

  if (leftTrim === "slurp" && rightTrim === "slurp") {
    return str.trim();
  }

  if (leftTrim === "_" || leftTrim === "slurp") {
    // full slurp
    str = str.trimStart();
  } else if (leftTrim === "-" || leftTrim === "nl") {
    // nl trim
    str = str.replace(/^(?:\r\n|\n|\r)/, "");
  }

  if (rightTrim === "_" || rightTrim === "slurp") {
    // full slurp
    str = str.trimEnd();
  } else if (rightTrim === "-" || rightTrim === "nl") {
    // nl trim
    str = str.replace(/(?:\r\n|\n|\r)$/, "");
  }

  return str;
}

function replaceChar(input: string): string {
  return escMap[input];
}

/**
 * XML-escapes an input value after converting it to a string
 * @param value - Input value (usually a string)
 * @returns XML-escaped string
 */
function XMLEscape(input: unknown): string {
  const newStr = String(input);
  if (/[&<>"']/.test(newStr)) {
    return newStr.replace(/[&<>"']/g, replaceChar);
  }

  return newStr;
}

export {
  trimWS,
  XMLEscape,
  convertToCR,
  debugAtCompilationStart,
  getCurrentPrefixType,
  compileContent,
  buildPrefixRegex,
};
