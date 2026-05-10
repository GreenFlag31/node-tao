export type ErrorType =
  // Errors related to template parsing
  | 'Parse Error'
  // Errors related to reading template files (e.g. file not found)
  | 'ReadFile Error'
  // Errors that occur during template compilation (e.g. syntax error)
  | 'Compilation Error'
  // Errors that occur during template execution (e.g. unknown variable)
  | 'Execution Error'
  // Errors related to template inclusion (e.g. infinite inclusion)
  | 'Inclusion Error'
  // Errors that occur before template compilation
  | 'Precompilation Error'
  // Errors related to template type
  | 'Template Type Error'
  // Errors related to template not found
  | 'Not Found Error';

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

export type TagType = 'raw' | 'execute' | 'interpolate';

export type FileResolution = 'strict' | 'flexible';

export interface TemplateData {
  type: TagType | null;
  value: string;
  line: number;
  startPos: number;
  endPos: number;
}

export type ChildTemplateFunction = (data: Data, helpers: Helpers) => string;

export type TemplateFunction = (
  data: object,
  helpers: Helpers,
  ɵɵstart: number,
  ɵɵcacheHit: boolean,
) => string;

export interface DataOrHelper {
  [key: string]: any;
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
  dataOrHelpers: DataOrHelper;
  filename: string;
}

export interface LoadedTemplateData {
  templateLoaded: string;
  dataOrHelpers: DataOrHelper;
  ɵɵstart: number;
  filename: string;
  ɵɵcacheHit: boolean;
}

export interface CompileChildExecuteData {
  fullPath: string;
  dataOrHelpers: DataOrHelper;
  filename: string;
}

export interface CompileExecuteData {
  fullPath: string;
  dataOrHelpers: DataOrHelper;
  ɵɵstart: number;
  filename: string;
  ɵɵcacheHit: boolean;
}

export interface ExecuteChildFunction {
  compiledContent: string;
  dataOrHelpers: DataOrHelper;
  filename: string;
}

export interface ExecuteFunction {
  compiledContent: string;
  dataOrHelpers: DataOrHelper;
  ɵɵstart: number;
  filename: string;
  ɵɵcacheHit: boolean;
}

export interface Options {
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

export interface VariableData {
  name: string;
  type: string;
}

export interface HelperData {
  name: string;
  params: string;
}

export interface TemplateExpression {
  id: number;
  prefixType: TagType;
  expression: string;
  templateStart: number;
  templateEnd: number;
}

export interface TemplateQuotePosition {
  line: number;
}

export interface ErrorTemplateData {
  lineNumber: number | null;
  fileContent: string[];
  message: string;
  filename: string;
}
