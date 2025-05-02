import { Parse } from "./interfaces";
import { XMLEscape } from "./utils";

export interface Options {
  /** Compile to async function */
  async: boolean;
}

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

  /**
   * Raw JS code inserted in the template function. Useful for declaring global variables for user templates
   */
  functionHeader?: string;

  /** Parsing options */
  parse?: Parse;

  /** Array of plugins */
  plugins?: Array<{
    processFnString?: Function;
    processAST?: Function;
    processTemplate?: Function;
  }>;

  /** Delimiters: by default `['<%', '%>']` */
  tags?: [string, string];

  /** Name of the data object. Default `it` */
  varName?: string;

  /** Directory that contains templates */
  views?: string;

  /** Control template file extension defaults. Default `.eta` */
  defaultExtension?: string;
}

/* END TYPES */

/** Eta's base (global) configuration */
const defaultConfig: Required<EtaConfig> = {
  autoEscape: true,
  autoFilter: false,
  cache: false,
  debug: false,
  views: process.cwd(),
  escapeFunction: XMLEscape,
  // default filter function (not used unless enables) just stringifies the input
  filterFunction: (val) => String(val),
  functionHeader: "",
  parse: {
    exec: "",
    interpolate: "=",
    raw: "~",
  },
  plugins: [],
  tags: ["<%", "%>"],
  varName: "it",
  defaultExtension: ".eta",
};

export { defaultConfig };
