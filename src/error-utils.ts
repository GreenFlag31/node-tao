import { log } from 'console';
import { AstObject, Debug, ErrorData, ErrorType } from './interfaces';
import { Store } from './store';

function findOriginalLineNumberWithMessage(
  error: ErrorData,
  compiledAnonymousFnContent: string,
  originalFileContent: string
): [string, string[], number | null] {
  if (error.type === 'Precompilation Error') {
    return [error.message, [], null];
  }
  if (error.type === 'Inclusion Error') {
    return [error.message, [], null];
  }
  if (error.type === 'Parse Error') {
    handleParseError(error);
    return [error.message, error.fileContent, error.lineNumber];
  }
  if (error.type === 'ReadFile Error') {
    return ['Error while reading template file', [], null];
  }

  const [message, source] = getErrorMessageAndSource(error);
  const lineFromAnonymousFn = getLineFromAnonymousFunction(source);

  if (error.type === 'Compilation Error') {
    const fileContent = splitByLine(originalFileContent);
    return [message, fileContent, lineFromAnonymousFn];
  }

  const compiledContent = extractContentFromAnonymousFunction(
    compiledAnonymousFnContent,
    lineFromAnonymousFn
  );
  const lineNumber = getOriginalLineNumber(compiledContent);
  const fileContent = splitByLine(originalFileContent);

  return [message, fileContent, lineNumber];
}

function getErrorMessageAndSource(error: any): [string, string] {
  const [message, source] = error.stack.split('\n');

  return [message, source];
}

/**
 * Calling new Function(...) is an anonymous function.
 */
function getLineFromAnonymousFunction(source: string) {
  const splitLastLineError = source.split('<anonymous>');
  const [_, line] = splitLastLineError[1].split(':');

  return Number(line);
}

function extractContentFromAnonymousFunction(compiledAnonymousFnContent: string, line: number) {
  const LINES_CORRECTION = 2;

  const lines = compiledAnonymousFnContent.split('\n');

  const compiledContentUntilError = lines.slice(0, line - LINES_CORRECTION);
  const compiledContent = compiledContentUntilError.join('\n');

  return compiledContent;
}

/**
 * Small lineCounter correction.
 */
function isolatedCarriageReturn(compiledAnonymousFnContent: string) {
  const regex = /\r/g;
  let match: RegExpExecArray | null = null;
  let lineCount = 0;

  while ((match = regex.exec(compiledAnonymousFnContent))) {
    lineCount++;
  }

  return lineCount;
}

function getOriginalLineNumber(compiledJoined: string) {
  let lineCount = 1;
  lineCount += isolatedCarriageReturn(compiledJoined);
  lineCount += (compiledJoined.match(/\\n/g) || []).length;

  return lineCount;
}

function splitByLine(fileContent: string) {
  const fileSplittedByNewLine = fileContent.split('\n');
  const lastLine = fileSplittedByNewLine.at(-1) || '';
  const lastLineIsEmpty = !lastLine.trim();
  if (lastLineIsEmpty) return fileSplittedByNewLine.slice(0, -1);

  return fileSplittedByNewLine;
}

/**
 * Error occurred while parsing the template (unclosed string)
 */
function handleParseError(error: any) {
  const { fileContent } = error;
  const content = splitByLine(fileContent);

  error.fileContent = content;
  return error;
}

function getParsingErrorData(
  expression: string,
  index: number,
  message: string,
  debug: Debug
): ErrorData {
  const { fileContent } = debug;
  const lineNumber = getTemplateParsedLineNumber(expression, index);
  const type: ErrorType = 'Parse Error';

  const error: any = new Error();
  error.message = message;
  error.lineNumber = lineNumber;
  error.fileContent = fileContent;
  error.type = type;

  return error;
}

function getTemplateParsedLineNumber(expression: string, index: number) {
  const splitIntoLines = expression.slice(0, index).split(/\n/);
  const line = splitIntoLines.length;
  return line;
}

/**
 * Detect infinite inclusion error.
 * FileContent is left empty.
 */
function handleInfiniteInclusionError(allChildren: string[], filename: string) {
  if (new Set(allChildren).size === allChildren.length) return;

  const error = infiniteInclusionError(filename, allChildren);

  throw error;
}

function infiniteInclusionError(filename: string, allChildren: string[]) {
  const error: any = new Error();
  error.message = `Possible infinite inclusion detected in ${filename} with children: ${allChildren.join(
    ' - '
  )}`;
  error.lineNumber = null;
  error.fileContent = '';
  const errorType: ErrorType = 'Inclusion Error';
  error.type = errorType;

  return error;
}

function handleNonUniqueFile(files: string[], filename: string) {
  let errorMessage = `Non existing template or template out of scope (reading "${filename}")`;

  if (files.length > 1) {
    errorMessage = `Non unique template given "${filename}". Possible:\n- ${files.join('\n- ')}`;
  }

  const error: any = new Error();
  error.message = errorMessage;
  error.lineNumber = null;
  error.fileContent = '';
  const errorType: ErrorType = 'Precompilation Error';
  error.type = errorType;

  return error;
}

export {
  getErrorMessageAndSource,
  getLineFromAnonymousFunction,
  extractContentFromAnonymousFunction,
  getOriginalLineNumber,
  findOriginalLineNumberWithMessage,
  handleParseError,
  getParsingErrorData,
  handleInfiniteInclusionError,
  handleNonUniqueFile,
  infiniteInclusionError,
};
