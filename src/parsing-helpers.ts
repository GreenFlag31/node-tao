import { SINGLE_QUOTE_REGEX, DOUBLE_QUOTE_REGEX, LITERAL_REGEX } from './const';
import { getParsingErrorData } from './error-utils';
import { Debug, TemplateData } from './interfaces';

function checkForUnclosedPrefix(
  templateData: TemplateData | undefined,
  expression: string,
  originalOpen: string,
  openingResultIndex: number,
  debug: Debug
) {
  if (templateData) return;

  const error = getParsingErrorData(
    expression,
    openingResultIndex,
    `Unclosed prefix " ${originalOpen} "`,
    debug
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
  debug: Debug
) {
  let lastIndex = 0;
  const SINGLE_QUOTE = "'";
  const DOUBLE_QUOTE = '"';
  const LITERAL_QUOTE = '`';

  if (original === SINGLE_QUOTE) {
    lastIndex = handleSingleQuote(expression, original, closeResultIndex, debug);
  } else if (original === DOUBLE_QUOTE) {
    lastIndex = handleDoubleQuote(expression, original, closeResultIndex, debug);
  } else if (original === LITERAL_QUOTE) {
    lastIndex = handleLiteralQuote(expression, original, closeResultIndex, debug);
  }

  return lastIndex;
}

function handleSingleQuote(
  expression: string,
  original: string,
  closeResultIndex: number,
  debug: Debug
) {
  SINGLE_QUOTE_REGEX.lastIndex = closeResultIndex;

  const singleQuoteMatch = SINGLE_QUOTE_REGEX.exec(expression);
  if (!singleQuoteMatch) {
    const error = getParsingErrorData(
      expression,
      closeResultIndex,
      `Unclosed string " ${original} "`,
      debug
    );

    throw error;
  }

  return SINGLE_QUOTE_REGEX.lastIndex;
}

function handleDoubleQuote(
  expression: string,
  original: string,
  closeResultIndex: number,
  debug: Debug
) {
  DOUBLE_QUOTE_REGEX.lastIndex = closeResultIndex;
  const doubleQuoteMatch = DOUBLE_QUOTE_REGEX.exec(expression);

  if (!doubleQuoteMatch) {
    const error = getParsingErrorData(
      expression,
      closeResultIndex,
      `Unclosed string " ${original} "`,
      debug
    );

    throw error;
  }

  return DOUBLE_QUOTE_REGEX.lastIndex;
}

function handleLiteralQuote(
  expression: string,
  original: string,
  closeResultIndex: number,
  debug: Debug
) {
  LITERAL_REGEX.lastIndex = closeResultIndex;
  const templateLitMatch = LITERAL_REGEX.exec(expression);

  if (!templateLitMatch) {
    const error = getParsingErrorData(
      expression,
      closeResultIndex,
      `Unclosed string " ${original} "`,
      debug
    );

    throw error;
  }

  return LITERAL_REGEX.lastIndex;
}

export { handleQuotes, checkForUnclosedPrefix };
