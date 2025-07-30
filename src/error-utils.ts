import { ErrorData, ErrorType } from './interfaces';

function findOriginalLineNumberWithMessage(
  error: ErrorData,
  compiledAnonymousFnContent: string,
  originalFileContent: string
): [string, string[], number | null] {
  const basicErrorTypes: ErrorType[] = [
    'Template Type Error',
    'Not Found Error',
    'Precompilation Error',
    'Inclusion Error',
  ];
  if (basicErrorTypes.includes(error.type)) {
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
  fileContent: string
): ErrorData {
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

function infiniteInclusionError(filename: string, children: string[]) {
  const error: any = new Error();
  const errorType: ErrorType = 'Inclusion Error';
  error.message = `Possible infinite inclusion detected in ${filename} with children: ${children.join(
    ' - '
  )}`;
  error.lineNumber = null;
  error.fileContent = '';
  error.type = errorType;

  return error;
}

function handleNonUniqueFile(files: string[], filename: string) {
  const errorType: ErrorType = 'Precompilation Error';
  let errorMessage = `Non existing template or template out of scope (reading "${filename}")`;

  if (files.length > 1) {
    errorMessage = `Non unique template given "${filename}". Possible:\n- ${files.join('\n- ')}`;
  }

  const error: any = new Error();
  error.message = errorMessage;
  error.lineNumber = null;
  error.fileContent = '';
  error.filename = filename;
  error.type = errorType;

  return error;
}

function handleWrongTypeInChildTemplate(template: string) {
  const errorType: ErrorType = 'Template Type Error';

  const error: any = new Error();
  error.message = `Provided template ${template} should be of type string`;
  error.lineNumber = null;
  error.fileContent = '';
  error.filename = template;
  error.type = errorType;

  return error;
}

function handleNotFoundDynamicChildTemplate(template: string) {
  const errorType: ErrorType = 'Not Found Error';

  const error: any = new Error();
  error.message = `Failed to get programmaticaly defined template ${template} from cache`;
  error.lineNumber = null;
  error.fileContent = '';
  error.filename = template;
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
  handleNonUniqueFile,
  infiniteInclusionError,
  handleWrongTypeInChildTemplate,
  handleNotFoundDynamicChildTemplate,
};
