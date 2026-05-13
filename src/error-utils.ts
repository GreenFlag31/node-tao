import { ErrorType } from './interfaces';

class TaoError extends Error {
  filename: string;
  fileContent: string[];
  lineNumber: number | null;
  type: ErrorType;
  isAChildError: boolean;
  errorHTML: string;

  constructor({
    message,
    type,
    filename = '',
    fileContent = [],
    lineNumber = null,
    errorHTML = '',
    isAChildError = false,
  }: {
    message: string;
    type: ErrorType;
    filename?: string;
    fileContent?: string[];
    lineNumber?: number | null;
    errorHTML?: string;
    isAChildError?: boolean;
  }) {
    super(message);
    this.name = 'TaoError';

    this.type = type;
    this.lineNumber = lineNumber;
    this.fileContent = fileContent;
    this.filename = filename;
    this.isAChildError = isAChildError;
    this.errorHTML = errorHTML;
  }
}

/**
 * @returns [error message, original file content splitted by line, original line number]
 */
function findOriginalLineNumberWithMessage(
  error: any,
  compiledAnonymousFnContent: string,
  originalFileContent: string,
): [string, string[], number | null] {
  const basicErrorTypes: ErrorType[] = [
    'Template Type Error',
    'Not Found Error',
    'Precompilation Error',
  ];

  if (basicErrorTypes.includes(error.type)) {
    return [error.message, [], null];
  }

  if (error.type === 'ReadFile Error') {
    return ['Error while reading the template file', [], null];
  }

  if (error.type === 'Parse Error') {
    return [error.message, error.fileContent, error.lineNumber];
  }

  if (!error.stack) {
    return [error.message ?? 'Unknown error', [], null];
  }

  const [message, source] = error.stack.split('\n');
  const lineFromAnonymousFn = getLineFromAnonymousFunction(source);

  if (error.type === 'Compilation Error') {
    const fileContent = splitAndRemoveTrailingEmptyLine(originalFileContent);
    return [message, fileContent, lineFromAnonymousFn];
  }

  // -> Execution Error

  const compiledContent = extractContentFromAnonymousFunction(
    compiledAnonymousFnContent,
    lineFromAnonymousFn,
  );
  const lineNumber = getOriginalLineNumber(compiledContent);
  const fileContent = splitAndRemoveTrailingEmptyLine(originalFileContent);

  return [message, fileContent, lineNumber];
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

function splitAndRemoveTrailingEmptyLine(fileContent: string) {
  const fileSplittedByNewLine = fileContent.split('\n');
  const lastLine = fileSplittedByNewLine.at(-1) || '';
  const lastLineIsEmpty = !lastLine.trim();
  if (lastLineIsEmpty) return fileSplittedByNewLine.slice(0, -1);

  return fileSplittedByNewLine;
}

function handleNonUniqueFile(files: string[], filename: string) {
  const type: ErrorType = 'Precompilation Error';

  let message = `Non existing template or template out of scope (reading "${filename}")`;

  if (files.length > 1) {
    message = `Non unique template given "${filename}". Possible:\n- ${files.join('\n- ')}`;
  }

  return { message, type };
}

function handleWrongTypeOfTemplate(template: string) {
  const type: ErrorType = 'Template Type Error';
  const message = `Invalid template "${template}" provided.`;

  return { message, type };
}

function handleNotFoundDynamicTemplate(template: string) {
  const type: ErrorType = 'Not Found Error';
  const message = `Failed to get programmaticaly defined template "${template}" from cache`;

  return { message, type };
}

function handleNoTemplateFilesFound(views: string, extension: string) {
  const type: ErrorType = 'Not Found Error';
  const message = `No template files found (reading: ${views}.${extension})`;

  return { message, type };
}

function logger(level: 'info' | 'warn' | 'error' | 'debug', message: string) {
  if (!message) return;

  const color = {
    debug: '\x1b[90m',
    info: '\x1b[36m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
  }[level];

  const reset = '\x1b[0m';
  const time = new Date().toISOString();

  console.log(`${color}[${time}] [${level.toUpperCase()}]${reset}`, message);
}

export {
  TaoError,
  getLineFromAnonymousFunction,
  extractContentFromAnonymousFunction,
  getOriginalLineNumber,
  findOriginalLineNumberWithMessage,
  handleNonUniqueFile,
  handleWrongTypeOfTemplate,
  handleNotFoundDynamicTemplate,
  handleNoTemplateFilesFound,
  logger,
  splitAndRemoveTrailingEmptyLine,
};
