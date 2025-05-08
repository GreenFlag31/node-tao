import { AstObject } from './interfaces';

function findOriginalLineNumberWithMessage(
  error: string,
  compiledAST: AstObject[],
  compiledAnonymousFnContent: string,
  originalFileContent: string
) {
  const [message, source] = getErrorMessageAndSource(error);
  const lineFromAnonymousFn = getLineFromAnonymousFunction(source);
  const compiledContent = extractContentFromAnonymousFunction(
    compiledAnonymousFnContent,
    lineFromAnonymousFn
  );
  const lineNumber = getOriginalLineNumber(compiledContent, compiledAST);
  const [fileContent, line] = trimEmptySpaceAndDecrementLine(originalFileContent, lineNumber);

  return [message, fileContent, line];
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

function trimEmptySpaceAndDecrementLine(fileContent: string, lineNumber: number) {
  const fileSplittedByNewLine = fileContent.split('\n');
  const fileContentWithoutEmptySpace: string[] = [];
  let offset = 0;

  for (let i = 0; i < fileSplittedByNewLine.length; i++) {
    const line = fileSplittedByNewLine[i];

    if (!line.trim()) {
      if (i < lineNumber - 1) offset += 1;
      continue;
    }

    fileContentWithoutEmptySpace.push(line);
  }

  const line = lineNumber - offset;
  return [fileContentWithoutEmptySpace, line];
}

export {
  getErrorMessageAndSource,
  getLineFromAnonymousFunction,
  extractContentFromAnonymousFunction,
  getOriginalLineNumber,
  findOriginalLineNumberWithMessage,
};
