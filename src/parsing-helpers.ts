import { singleQuoteReg, doubleQuoteReg, templateLitReg } from './const';
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
    singleQuoteReg.lastIndex = closeResultIndex;

    const singleQuoteMatch = singleQuoteReg.exec(expression);
    if (!singleQuoteMatch) {
      const error = getParsingErrorData(
        expression,
        closeResultIndex,
        `Unclosed string " ${original} "`,
        debug
      );

      throw error;
    }

    lastIndex = singleQuoteReg.lastIndex;
  } else if (original === DOUBLE_QUOTE) {
    doubleQuoteReg.lastIndex = closeResultIndex;
    const doubleQuoteMatch = doubleQuoteReg.exec(expression);

    if (!doubleQuoteMatch) {
      const error = getParsingErrorData(
        expression,
        closeResultIndex,
        `Unclosed string " ${original} "`,
        debug
      );

      throw error;
    }

    lastIndex = doubleQuoteReg.lastIndex;
  } else if (original === LITERAL_QUOTE) {
    templateLitReg.lastIndex = closeResultIndex;
    const templateLitMatch = templateLitReg.exec(expression);

    if (!templateLitMatch) {
      const error = getParsingErrorData(
        expression,
        closeResultIndex,
        `Unclosed string " ${original} "`,
        debug
      );

      throw error;
    }

    lastIndex = templateLitReg.lastIndex;
  }

  return lastIndex;
}

export { handleQuotes, checkForUnclosedPrefix };
