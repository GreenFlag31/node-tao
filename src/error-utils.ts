import { TP_VARNAME_WITH_PREFIX } from './const';
import { AstObject, Debug, ErrorData, ErrorType } from './interfaces';

/**
 * Two possible exceptions:
 * There is no content => an error occurred while reading the file
 * There is no line number => there is a syntax error
 */
function findOriginalLineNumberWithMessage(
  error: ErrorData,
  compiledAST: AstObject[],
  compiledAnonymousFnContent: string,
  originalFileContent: string
): [string, string[], number] {
  if (error.type === 'Precompilation Error') {
    return [error.message, getNoContentData(), NaN];
  }
  if (error.type === 'ReadFile Error') {
    return ['Error while reading template file', getNoContentData(), NaN];
  }
  if (error.type === 'Inclusion Error') {
    return [error.message, getNoContentData(), NaN];
  }

  const [message, source] = getErrorMessageAndSource(error);
  const lineFromAnonymousFn = getLineFromAnonymousFunction(source);
  if (error.type === 'Compilation Error') {
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

function getNoContentData() {
  return ['', '', '', 'No content', '', '', ''];
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
 * Error occurred while parsing the template (unclosed string)
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
function handleInfiniteInclusionError(allChildren: string[]) {
  if (new Set(allChildren).size === allChildren.length) return;

  const error: any = new Error();
  error.message = `Possible infinite inclusion detected with children: ${allChildren.join(' - ')}`;
  error.lineNumber = NaN;
  error.fileContent = '';
  const errorType: ErrorType = 'Inclusion Error';
  error.type = errorType;

  throw error;
}

function handleNonUniqueFile(files: string[], filename: string) {
  let errorMessage = `Non existing template or template out of scope`;

  if (files.length > 1) {
    errorMessage = `Non unique template given "${filename}". Possible:\n- ${files.join('\n- ')}`;
  }

  const error: any = new Error();
  error.message = errorMessage;
  error.lineNumber = NaN;
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
  isAParseError,
  handleParseError,
  getParsingErrorData,
  handleInfiniteInclusionError,
  handleNonUniqueFile,
};
