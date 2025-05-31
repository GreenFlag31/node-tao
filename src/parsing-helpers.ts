import { singleQuoteReg, doubleQuoteReg, templateLitReg } from './const';
import { getParsingErrorData } from './error-utils';
import { Debug, TemplateData } from './interfaces';

function checkForUnclosedPrefix(
  templateData: TemplateData | undefined,
  expression: string,
  originalOpen: string,
  openingResultIndex: number,
  debug: Debug,
  filename: string
) {
  if (templateData) return;

  const error = getParsingErrorData(
    expression,
    openingResultIndex,
    `Unclosed prefix " ${originalOpen} "`,
    debug,
    filename
  );

  throw error;
}

/**
 * Handle quotes and throw in case of an error.
 */
function handleQuotes(
  expression: string,
  original: string,
  closeResultIndex: number,
  debug: Debug,
  filename: string
) {
  let lastIndex = 0;
  const SINGLE_QUOTE = "'";
  const DOUBLE_QUOTE = '"';
  const LITERAL_QUOTE = '`';

  if (original === SINGLE_QUOTE) {
    lastIndex = handleSingleQuote(expression, original, closeResultIndex, debug, filename);
  } else if (original === DOUBLE_QUOTE) {
    lastIndex = handleDoubleQuote(expression, original, closeResultIndex, debug, filename);
  } else if (original === LITERAL_QUOTE) {
    lastIndex = handleLiteralQuote(expression, original, closeResultIndex, debug, filename);
  }

  return lastIndex;
}

function handleSingleQuote(
  expression: string,
  original: string,
  closeResultIndex: number,
  debug: Debug,
  filename: string
) {
  singleQuoteReg.lastIndex = closeResultIndex;

  const singleQuoteMatch = singleQuoteReg.exec(expression);
  if (!singleQuoteMatch) {
    const error = getParsingErrorData(
      expression,
      closeResultIndex,
      `Unclosed string " ${original} "`,
      debug,
      filename
    );

    throw error;
  }

  return singleQuoteReg.lastIndex;
}

function handleDoubleQuote(
  expression: string,
  original: string,
  closeResultIndex: number,
  debug: Debug,
  filename: string
) {
  doubleQuoteReg.lastIndex = closeResultIndex;
  const doubleQuoteMatch = doubleQuoteReg.exec(expression);

  if (!doubleQuoteMatch) {
    const error = getParsingErrorData(
      expression,
      closeResultIndex,
      `Unclosed string " ${original} "`,
      debug,
      filename
    );

    throw error;
  }

  return doubleQuoteReg.lastIndex;
}

function handleLiteralQuote(
  expression: string,
  original: string,
  closeResultIndex: number,
  debug: Debug,
  filename: string
) {
  templateLitReg.lastIndex = closeResultIndex;
  const templateLitMatch = templateLitReg.exec(expression);

  if (!templateLitMatch) {
    const error = getParsingErrorData(
      expression,
      closeResultIndex,
      `Unclosed string " ${original} "`,
      debug,
      filename
    );

    throw error;
  }

  return templateLitReg.lastIndex;
}

export { handleQuotes, checkForUnclosedPrefix };
