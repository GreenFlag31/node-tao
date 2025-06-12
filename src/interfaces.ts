export type ErrorType =
  | 'Parse Error'
  | 'ReadFile Error'
  | 'Compilation Error'
  | 'Execution Error'
  | 'Inclusion Error'
  | 'Precompilation Error';

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

export interface TemplateData {
  type: TagType;
  content: string;
}

export type TemplateFunction = (data: object, helpers: Helpers, ɵɵstart: number) => string;

export interface Debug {
  fileContent: string;
  message: string;
  lineNumber: number | null;
}

export interface ErrorData {
  filename: string;
  fileContent: [string];
  message: string;
  lineNumber: number;
  type: ErrorType;
}

export interface Data {
  [key: string]: any;
}

export type Helpers = {
  [fnName: string]: HelperFunction;
};

export type HelperFunction = (...args: any[]) => any;

export interface Metrics {
  metrics: boolean;
  files: string[];
  cacheEnabled: boolean;
  isAChild: boolean;
  filename: string;
}

export interface LoadedTemplateData {
  template: string;
  templateLoaded: string;
  data: Data;
  helpers: Helpers;
  ɵɵstart: number;
  filename: string;
}

export interface CompileExecuteData {
  fullPath: string;
  data: Data;
  helpers: Helpers;
  ɵɵstart: number;
  filename: string;
}

export interface ExecuteFunction {
  templateFn: TemplateFunction;
  data: Data;
  helpers: Helpers;
  ɵɵstart: number;
  filename: string;
}

export interface options {
  /**
   * Automatically XML-escape interpolations.
   *
   * @default true
   */
  autoEscape?: boolean;

  /**
   * Enable template cache.
   *
   * @default true
   */
  cache?: boolean;

  /**
   * Display an error box in your browser with debug information.
   *
   * @default false
   */
  debug?: boolean;

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
   * Display console logs inside your browser with several informations.
   *
   * @default false
   */
  metrics?: boolean;

  /**
   * File mode resolution. Strict means you have to define the template path relative to the view provided, flexible allow you to define only the end of your path (make sure it is unique).
   *
   * @default "flexible"
   */
  fileResolution?: FileResolution;
}

export type FileResolution = 'strict' | 'flexible';

export interface DefinitiveOptions {
  autoEscape: boolean;
  cache: boolean;
  debug: boolean;
  escapeFunction: (str: unknown) => string;
  parse: Required<Parse>;
  tags: Required<Tags>;
  views: string;
  extension: string;
  metrics: boolean;
  fileResolution: FileResolution;
}
