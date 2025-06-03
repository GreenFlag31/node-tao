import { TP_VARNAME_WITH_PREFIX } from './const';
import { AstObject, Debug, ErrorType } from './interfaces';

/**
 * Two possible exceptions
 * There is no content => an error occurred while reading the file
 * There is no line number => there is a syntax error
 */
function findOriginalLineNumberWithMessage(
  error: string,
  compiledAST: AstObject[],
  compiledAnonymousFnContent: string,
  originalFileContent: string
): [string, string[], number] {
  if (!originalFileContent) {
    return ['Error while reading template file', ['', '', '', 'No content', '', '', ''], NaN];
  }

  const [message, source] = getErrorMessageAndSource(error);
  const lineFromAnonymousFn = getLineFromAnonymousFunction(source);
  if (isNaN(lineFromAnonymousFn)) {
    const [fileContent, _] = trimEmptySpaceAndDecrementLine(
      originalFileContent,
      lineFromAnonymousFn
    );
    return [message, fileContent, lineFromAnonymousFn];
  }

  const compiledContent = extractContentFromAnonymousFunction(
    compiledAnonymousFnContent,
    lineFromAnonymousFn
  );
  const lineNumber = getOriginalLineNumber(compiledContent, compiledAST);
  const [fileContent, line] = trimEmptySpaceAndDecrementLine(originalFileContent, lineNumber);

  return [message, fileContent, line];
}

function getErrorMessageAndSource(error: any): [string, string] {
  const [message, source] = error.stack.split('\n');

  return [message, source];
}

function getLineFromAnonymousFunction(source: string) {
  const splitLastLineError = source.split('<anonymous>');
  const [_, line, column] = splitLastLineError[1].split(':');

  return Number(line);
}

function extractContentFromAnonymousFunction(compiledAnonymousFnContent: string, line: number) {
  const LINES_CORRECTION = 2;

  const lines = compiledAnonymousFnContent.split('\n');
  const compiledContentUntilError = lines.slice(0, line - LINES_CORRECTION);
  const compiledContent = compiledContentUntilError.join(' ');

  return compiledContent;
}

function getOriginalLineNumber(compiledJoined: string, compiledAST: AstObject[]) {
  const result = `${TP_VARNAME_WITH_PREFIX}\\.res\\+=`;
  const resultRegex = new RegExp(result, 'g');
  const countBodyContent = compiledJoined.match(resultRegex) || [];
  const extract = compiledAST.slice(0, countBodyContent.length);
  let lineNumber = 1;

  for (const data of extract) {
    if (typeof data === 'string') {
      lineNumber += (data.match(/\\n/g) || []).length;
    }
  }

  return lineNumber;
}

function trimEmptySpaceAndDecrementLine(
  fileContent: string,
  lineNumber: number
): [string[], number] {
  const fileSplittedByNewLine = fileContent.split('\n');
  const fileContentWithoutEmptySpace: string[] = [];
  let offset = 0;

  for (let i = 0; i < fileSplittedByNewLine.length; i++) {
    const line = fileSplittedByNewLine[i];

    if (!line.trim()) {
      // empty line
      if (i < lineNumber - 1) offset += 1;
      continue;
    }

    fileContentWithoutEmptySpace.push(line);
  }

  const line = lineNumber - offset;
  return [fileContentWithoutEmptySpace, line];
}

/**
 * Error occurred while parsing the template.
 */
function isAParseError(error: any) {
  return error.type === 'Parse Error';
}

function handleParseError(error: any) {
  const { fileContent, lineNumber } = error;

  const [content, line] = trimEmptySpaceAndDecrementLine(fileContent, lineNumber);

  error.fileContent = content;
  error.lineNumber = line;
  return error;
}

function getParsingErrorData(
  expression: string,
  index: number,
  message: string,
  debug: Debug
): Error {
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
  const whitespace = expression.slice(0, index).split(/\n/);
  const line = whitespace.length;
  return line;
}

export {
  getErrorMessageAndSource,
  getLineFromAnonymousFunction,
  extractContentFromAnonymousFunction,
  getOriginalLineNumber,
  findOriginalLineNumberWithMessage,
  isAParseError,
  handleParseError,
  getParsingErrorData,
};
