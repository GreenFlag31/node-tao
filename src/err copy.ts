export class EtaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Eta Error";
  }
}

export class EtaParseError extends EtaError {
  constructor(message: string) {
    super(message);
    this.name = "EtaParser Error";
  }
}

export class EtaRuntimeError extends EtaError {
  constructor(message: string) {
    super(message);
    this.name = "EtaRuntime Error";
  }
}

export class EtaFileResolutionError extends EtaError {
  constructor(message: string) {
    super(message);
    this.name = "EtaFileResolution Error";
  }
}

export class EtaNameResolutionError extends EtaError {
  constructor(message: string) {
    super(message);
    this.name = "EtaNameResolution Error";
  }
}

/**
 * Throws an EtaError with a nicely formatted error and message showing where in the template the error occurred.
 */

export function buildParseError(errorMessage: string, str: string, index: number) {
  let error = errorMessage;
  const whitespace = str.slice(0, index).split(/\n/);

  const lineNo = whitespace.length;
  const previousLineNo = lineNo - 1;
  const colNo = whitespace[previousLineNo].length + 1;

  error +=
    " at line " +
    lineNo +
    " col " +
    colNo +
    ":\n\n" +
    "  " +
    str.split(/\n/)[previousLineNo] +
    "\n" +
    "  " +
    Array(colNo).join(" ") +
    "^";

  return error;
}

export function RuntimeErr(originalError: Error, str: string, lineNo: number, path: string): never {
  // code gratefully taken from https://github.com/mde/ejs and adapted

  const lines = str.split("\n");
  const start = Math.max(lineNo - 3, 0);
  const end = Math.min(lines.length, lineNo + 3);
  const filename = path;
  // Error context
  const context = lines
    .slice(start, end)
    .map(function (line, i) {
      const curr = i + start + 1;
      return (curr == lineNo ? " >> " : "    ") + curr + "| " + line;
    })
    .join("\n");

  const header = filename ? filename + ":" + lineNo + "\n" : "line " + lineNo + "\n";

  const err = new EtaRuntimeError(header + context + "\n\n" + originalError.message);

  err.name = originalError.name; // the original name (e.g. ReferenceError) may be useful

  throw err;
}
