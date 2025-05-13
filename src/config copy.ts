import { DEFAULT_EXTENSION } from './const';
import { Parse, Tags } from './interfaces';
import { XMLEscape } from './utils';

export interface EtaConfig {
  /**
   * Automatically XML-escape interpolations.
   * @default true
   */
  autoEscape?: boolean;

  /**
   * Apply a filter function defined on the class to every interpolation or raw interpolation.
   */
  autoFilter?: boolean;

  /**
   * Enable template cache.
   */
  cache?: boolean;

  /**
   * Pretty-format error messages.
   */
  debug?: boolean;

  /**
   * Function to XML-sanitize interpolations
   */
  escapeFunction?: (str: unknown) => string;

  /**
   * Function applied to all interpolations when autoFilter is true
   */
  filterFunction?: (val: unknown) => string;

  /** Parsing options */
  parse?: Parse;

  /** Array of plugins */
  plugins?: Array<{
    processFnString?: Function;
    processAST?: Function;
    processTemplate?: Function;
  }>;

  /**
   * Default opening '<%'
   * Default closing '%>'
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
   * @default '.eta'
   */
  extension?: string;
}

export interface DefinitiveConfig {
  /**
   * Automatically XML-escape interpolations.
   * @default true
   */
  autoEscape: boolean;

  /**
   * Apply a filter function defined on the class to every interpolation or raw interpolation.
   */
  autoFilter: boolean;

  /**
   * Enable lazy template cache.
   */
  cache: boolean;

  /**
   * Pretty-format error messages.
   */
  debug?: boolean;

  /**
   * Function to XML-sanitize interpolations
   */
  escapeFunction: (str: unknown) => string;

  /**
   * Function applied to all interpolations when autoFilter is true
   */
  filterFunction: (val: unknown) => string;

  /** Parsing options */
  parse: Required<Parse>;

  /** Array of plugins */
  plugins: Array<{
    processFnString: Function;
    processAST: Function;
    processTemplate: Function;
  }>;

  /**
   * Default opening '<%'
   * Default closing '%>'
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
   * @default '.eta'
   */
  extension: string;
}

const defaultConfig: DefinitiveConfig = {
  autoEscape: true,
  cache: true,
  autoFilter: false,
  debug: false,
  views: process.cwd(),
  escapeFunction: XMLEscape,
  // default filter function (not used unless enables) just stringifies the input
  filterFunction: (val) => String(val),
  parse: {
    exec: '',
    interpolate: '=',
    raw: '~',
  },
  plugins: [],
  tags: {
    opening: '<%',
    closing: '%>',
  },
  extension: DEFAULT_EXTENSION,
};

export { defaultConfig };
