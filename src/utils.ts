import type { DefinitiveConfig } from './config copy';
import { escMap, HELPER_VARNAME, TEMPLATE_VARNAME, TP_VARNAME_WITH_PREFIX } from './const';
import { AstObject, Parse, TagType } from './interfaces';
import { escapeRegExp } from './parse copy';
import { getFileNameAndAbsPath, setTitleStyle } from './metrics';

function includeFn(isInclude: boolean) {
  if (!isInclude) return '';

  return `const include = (templatePath, data = ${TEMPLATE_VARNAME}, helpers = ${HELPER_VARNAME}) => this.render(templatePath, data, helpers);`;
}

function includeRenderTime(metrics: boolean) {
  if (!metrics) return '';
  return `const renderDuration = (performance.now() - this.startRenderTime).toFixed(2);`;
}

function includeCacheHit(metrics: boolean) {
  if (!metrics) return '';
  return `const cacheHit = this.cacheHit;`;
}

function includeMetrics(metrics: boolean, files: string[]) {
  if (!metrics) return '';

  const filesNameAndPath = getFileNameAndAbsPath(files);
  const filesNumber = filesNameAndPath.length;
  const filesMapped = `${filesNumber} FILES MAPPED`;

  return `'<script>${getRenderTime()};${getCacheHit()};console.log(${setTitleStyle(
    filesMapped
  )});console.table(${JSON.stringify(filesNameAndPath)});</script>'`;
}

function getCacheHit() {
  return `console.log("%c[CACHE HIT]%c: ' + cacheHit + '", "color: white; background: green; padding: 2px; font-weight: bold;","color:normal")`;
}

function getRenderTime() {
  return `console.log("%c[RENDERED]%c: ' + renderDuration + 'ms", "color: white; background: green; padding: 2px; font-weight: bold;","color:normal")`;
}

function convertToCR(value: string) {
  return value.replace(/\\|'/g, '\\$&').replace(/\r\n|\n|\r/g, '\\n');
}

function getCurrentPrefixType(prefix: string, parse: DefinitiveConfig['parse']): TagType {
  const parseOptions: Record<string, TagType> = {
    [parse.exec]: 'execute',
    [parse.raw]: 'raw',
    [parse.interpolate]: 'interpolate',
  };

  return parseOptions[prefix] ?? '';
}
// renvoyer simplement le contenu, pas mettre .res+=
function compileBody(templateValues: AstObject[], config: DefinitiveConfig) {
  let result = '';

  for (const value of templateValues) {
    if (typeof value === 'string') {
      // HTML content
      result += `__${TEMPLATE_VARNAME}.res+='${value}';\n`;
      continue;
    }

    const { type, content = '' } = value;
    result += compileContent(type, content, config);
  }

  return result;
}

function compileContent(type: TagType, content: string, config: DefinitiveConfig) {
  const { autoEscape, autoFilter } = config;
  const prefix = TP_VARNAME_WITH_PREFIX;

  if (type === 'raw') {
    if (autoFilter) {
      content = `${prefix}.f(${content});`;
    }

    return `${prefix}.res+=${content};\n`;
  }

  if (type === 'interpolate') {
    if (autoFilter) {
      content = `${prefix}.f(${content})`;
    }

    if (autoEscape) {
      content = `${prefix}.e(${content})`;
    }

    return `${prefix}.res+=${content};\n`;
  }

  if (type === 'execute') {
    return `${content}\n`;
  }
}

function buildPrefixRegex(parseOptions: Parse) {
  const options: string[] = [];

  for (const prefix of Object.values(parseOptions)) {
    if (!prefix) continue;

    const prefixEscaped = escapeRegExp(prefix);
    options.push(prefixEscaped);
  }

  return options.join('|');
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
  XMLEscape,
  convertToCR,
  getCurrentPrefixType,
  compileContent,
  buildPrefixRegex,
  compileBody,
  includeFn,
  includeMetrics,
  includeRenderTime,
  includeCacheHit,
};
