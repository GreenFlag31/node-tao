export type ErrorType =
  | 'Parse Error'
  | 'ReadFile Error'
  | 'Compilation Error'
  | 'Execution Error'
  | 'Inclusion Error'
  | 'Precompilation Error';

export interface DebugData {
  compiledAnonymousFnContent: string;
  fileContent: string;
}

export interface Parse {
  /**
   * Which prefix to use for evaluation.
   * @default ""
   */
  exec?: string;

  /**
   * Which prefix to use for interpolation.
   * @default "="
   */
  interpolate?: string;

  /**
   * Which prefix to use for raw interpolation.
   * @default "~"
   */
  raw?: string;
}

export interface Tags {
  /**
   * @default "<%"
   */
  opening?: string;
  /**
   * @default "%>"
   */
  closing?: string;
}

/**
 * HTML content or template data.
 */
export type AstObject = string | TemplateData;

export type TagType = 'raw' | 'execute' | 'interpolate';

export type FileResolution = 'strict' | 'flexible';

export interface TemplateData {
  type: TagType;
  content: string;
}

export type ChildTemplateFunction = (data: object, helpers: Helpers) => string;

export type TemplateFunction = (
  data: object,
  helpers: Helpers,
  ɵɵstart: number,
  ɵɵcacheHit: boolean
) => string;

export interface ErrorData {
  filename: string;
  fileContent: string[];
  message: string;
  lineNumber: number | null;
  type: ErrorType;
  isAChildError: boolean;
  errorHTML: string;
}

export interface Data {
  [key: string]: any;
}

export type Helpers = {
  [fnName: string]: HelperFunction;
};

export type HelperFunction = (...args: any[]) => any;

export interface Metrics {
  development: boolean;
  files: string[];
  cacheEnabled: boolean;
  filename: string;
}

export interface LoadedChildTemplateData {
  templateLoaded: string;
  data: Data;
  helpers: Helpers;
  filename: string;
}

export interface LoadedTemplateData {
  templateLoaded: string;
  data: Data;
  helpers: Helpers;
  ɵɵstart: number;
  filename: string;
  ɵɵcacheHit: boolean;
}

export interface CompileChildExecuteData {
  fullPath: string;
  data: Data;
  helpers: Helpers;
  filename: string;
}

export interface CompileExecuteData {
  fullPath: string;
  data: Data;
  helpers: Helpers;
  ɵɵstart: number;
  filename: string;
  ɵɵcacheHit: boolean;
}

export interface ExecuteChildFunction {
  compiledContent: string;
  data: Data;
  helpers: Helpers;
  filename: string;
}

export interface ExecuteFunction {
  compiledContent: string;
  data: Data;
  helpers: Helpers;
  ɵɵstart: number;
  filename: string;
  ɵɵcacheHit: boolean;
}

export interface options {
  /**
   * Automatically XML-escape interpolations.
   *
   * @default true
   */
  autoEscape?: boolean;

  /**
   * Enable template lazy cache.
   *
   * @default true
   */
  cache?: boolean;

  /**
   * Display a visual error representation and activate metrics. Provided data is available in the console. Add infinite inclusion protection.
   *
   * @default false
   */
  development?: boolean;

  /**
   * Function to XML-sanitize interpolations.
   */
  escapeFunction?: (str: unknown) => string;

  /**
   * Parsing options.
   */
  parse?: Parse;

  /**
   * Default opening '<%', default closing '%>'.
   */
  tags?: Tags;

  /**
   * Directory that contains templates.
   *
   * @default process.cwd()
   */
  views?: string;

  /**
   * Template file extension.
   *
   * @default 'html'
   */
  extension?: string;

  /**
   * File mode resolution. Strict means you have to define the template path relative to the view provided, flexible allow you to define only the end of your path (make sure it is unique).
   *
   * @default "flexible"
   */
  fileResolution?: FileResolution;
}

export interface DefinitiveOptions {
  autoEscape: boolean;
  cache: boolean;
  development: boolean;
  escapeFunction: (str: unknown) => string;
  parse: Required<Parse>;
  tags: Required<Tags>;
  views: string;
  extension: string;
  fileResolution: FileResolution;
}
