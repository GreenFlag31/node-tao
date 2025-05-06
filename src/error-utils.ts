import { AstObject } from './interfaces';

function findOriginalLineNumberWithMessage(
  error: string,
  compiledAST: AstObject[],
  compiledAnonymousFnContent: string
) {
  const [message, source] = getErrorMessageAndSource(error);
  const lineFromAnonymousFn = getLineFromAnonymousFunction(source);
  const compiledContent = extractContentFromAnonymousFunction(
    compiledAnonymousFnContent,
    lineFromAnonymousFn
  );
  const lineNumber = getOriginalLineNumber(compiledContent, compiledAST);

  return [message, lineNumber];
}

function getErrorMessageAndSource(error: any) {
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
  const countBodyContent = compiledJoined.match(/__it\.res\+=/g) || [];
  const extract = compiledAST.slice(0, countBodyContent.length);
  let lineNumber = 1;

  for (const data of extract) {
    if (typeof data === 'string') {
      lineNumber += (data.match(/\\n/g) || []).length;
    }
  }

  return lineNumber;
}

export {
  getErrorMessageAndSource,
  getLineFromAnonymousFunction,
  extractContentFromAnonymousFunction,
  getOriginalLineNumber,
  findOriginalLineNumberWithMessage,
};
