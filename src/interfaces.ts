export type TagType = 'raw' | 'execute' | 'interpolate';
export type ErrorType = 'Parse Error' | 'ReadFile Error' | 'Compilation Error' | 'Execution Error';

export interface Parse {
  /**
   * Which prefix to use for evaluation. Default `""`
   */
  exec?: string;

  /**
   * Which prefix to use for interpolation. Default `"="`
   */
  interpolate?: string;

  /**
   * Which prefix to use for raw interpolation. Default `"~"`
   */
  raw?: string;
}

export interface Tags {
  /**
   * Default "<%"
   */
  opening?: string;
  /**
   * Default "%>"
   */
  closing?: string;
}

/**
 * HTML content or template data.
 */
export type AstObject = string | TemplateData;

export interface TemplateData {
  type: TagType;
  content: string;
}

export type TemplateFunction = (data: object, helpers: Helpers) => string;

export interface Debug {
  originalFileName: string;
  fileContent: string;
  message: string;
  lineNumber: number;
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
  filename: string;
  cacheEnabled: boolean;
  templateLoaded: string[];
}

export interface EtaConfig {
  /**
   * Automatically XML-escape interpolations.
   *
   * Default true.
   * @default true
   */
  autoEscape?: boolean;

  /**
   * Enable template cache.
   *
   * Default true.
   */
  cache?: boolean;

  /**
   * Pretty-format error messages.
   *
   * Default false.
   */
  debug?: boolean;

  /**
   * Function to XML-sanitize interpolations
   */
  escapeFunction?: (str: unknown) => string;

  /** Parsing options */
  parse?: Parse;

  /**
   * Default opening '<%', default closing '%>'
   */
  tags?: Tags;

  /**
   * Directory that contains templates
   * Default to process.cwd()
   * @default process.cwd()
   */
  views?: string;

  /**
   * Control template file extension defaults.
   * @default 'eta'
   */
  extension?: string;

  /**
   * Display console logs inside your browser with several informations.
   */
  metrics?: boolean;

  /**
   * File mode resolution. Strict means you have to defined the template path relative to the view defined, flexible allow you to define only the end of your path (make sure it is unique!).
   *
   * Default "flexible"
   */
  fileResolution?: FileResolution;
}

export type FileResolution = 'strict' | 'flexible';

export interface DefinitiveConfig {
  /**
   * Automatically XML-escape interpolations.
   * Default true.
   * @default true
   */
  autoEscape: boolean;

  /**
   * Enable lazy template cache.
   */
  cache: boolean;

  /**
   * Pretty-format error messages.
   */
  debug: boolean;

  /**
   * Function to XML-sanitize interpolations
   */
  escapeFunction: (str: unknown) => string;

  /** Parsing options */
  parse: Required<Parse>;

  /**
   * Default opening '<%', default closing '%>'
   */
  tags: Required<Tags>;

  /**
   * Directory that contains templates
   * Default to process.cwd()
   * @default process.cwd()
   */
  views: string;

  /**
   * Control template file extension defaults.
   * Default tao.
   * @default 'tao'
   */
  extension: string;

  /**
   * Display console logs inside your browser with several informations.
   */
  metrics: boolean;

  /**
   * File mode resolution. Strict means you have to defined the template path relative to the view defined, flexible allow you to define only the end of your path (make sure it is unique!).
   *
   * Default "flexible"
   */
  fileResolution: FileResolution;
}
