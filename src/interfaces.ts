export interface Data {
  [key: string]: any;
}

export type TagType = 'raw' | 'execute' | 'interpolate';

export interface TemplateData {
  type: TagType;
  content: string;
  lineNo?: number;
}

export interface Parse {
  /** Which prefix to use for evaluation. Default `""`, does not support `"-"` or `"_"` */
  exec?: string;

  /** Which prefix to use for interpolation. Default `"="`, does not support `"-"` or `"_"` */
  interpolate?: string;

  /** Which prefix to use for raw interpolation. Default `"~"`, does not support `"-"` or `"_"` */
  raw?: string;
}

export type TemplateFunction = (data: object, helpers: Helpers) => string;
export type TemplateLoaded = string;

export interface Tags {
  opening: string;
  closing: string;
}

/**
 * HTML content or template data.
 */
export type AstObject = string | TemplateData;

export interface Debug {
  originalFileName: string;
  fileContent: string;
  message: string;
  lineNumber: number;
}

export type HelperFunction = (...args: any[]) => any;

export type Helpers = {
  [fnName: string]: HelperFunction;
};
