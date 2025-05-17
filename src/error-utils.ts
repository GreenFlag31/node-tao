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
      // empty line
      if (i < lineNumber - 1) offset += 1;
      continue;
    }

    fileContentWithoutEmptySpace.push(line);
  }

  const line = lineNumber - offset;
  return [fileContentWithoutEmptySpace, line];
}

function bareElementStyling(line: string) {
  let lineWithStyle = line.toLowerCase();
  const htmlElements = [
    'doctype',
    'html',
    'head',
    'title',
    'meta',
    'link',
    'body',
    'header',
    'nav',
    'main',
    'section',
    'article',
    'footer',
    'h1',
    'h2',
    'p',
    'a',
    'img',
    'ul',
    'ol',
    'li',
    'table',
    'form',
    'input',
    'button',
    'div',
    'span',
  ];

  for (const element of htmlElements) {
    const containsElement = lineWithStyle.indexOf(element);
    if (containsElement === -1) continue;

    const regex = new RegExp(`\\b${element}\\b`, 'g');
    lineWithStyle = lineWithStyle.replace(regex, `<span>${element}</span>`);
  }

  return lineWithStyle;
}

export {
  getErrorMessageAndSource,
  getLineFromAnonymousFunction,
  extractContentFromAnonymousFunction,
  getOriginalLineNumber,
  findOriginalLineNumberWithMessage,
};
