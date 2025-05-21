export class EtaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Eta Error';
  }
}

export class EtaParseError extends EtaError {
  constructor(message: string) {
    super(message);
    this.name = 'EtaParser Error';
  }
}

export class EtaRuntimeError extends EtaError {
  constructor(message: string) {
    super(message);
    this.name = 'EtaRuntime Error';
  }
}

export class EtaFileResolutionError extends EtaError {
  constructor(message: string) {
    super(message);
    this.name = 'EtaFileResolution Error';
  }
}

export class EtaNameResolutionError extends EtaError {
  constructor(message: string) {
    super(message);
    this.name = 'EtaNameResolution Error';
  }
}

function getTemplateLineNumber(expression: string, index: number) {
  const whitespace = expression.slice(0, index).split(/\n/);
  const line = whitespace.length;
  return line;
}

/**
 * Throws an EtaError with a nicely formatted error and message showing where in the template the error occurred.
 */

function buildParseError(errorMessage: string, str: string, index: number) {
  const whitespace = str.slice(0, index).split(/\n/);
  const lineNo = whitespace.length;
  const previousLineNo = lineNo - 1;
  const colNo = whitespace[previousLineNo].length + 1;

  const error =
    ' at line ' +
    lineNo +
    ' col ' +
    colNo +
    ':\n\n' +
    '  ' +
    str.split(/\n/)[previousLineNo] +
    '\n' +
    '  ' +
    Array(colNo).join(' ') +
    '^';

  return errorMessage + error;
}

export { buildParseError, getTemplateLineNumber };
