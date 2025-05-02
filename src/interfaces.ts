import { Options } from "./config copy";

export interface Data {
  [key: string]: unknown;
}

export type TagType = "raw" | "execute" | "interpolate" | "";

export interface TemplateData {
  type: TagType;
  content: string;
  lineNo?: number;
}

export interface Parse {
  /** Which prefix to use for evaluation. Default `""`, does not support `"-"` or `"_"` */
  exec: string;

  /** Which prefix to use for interpolation. Default `"="`, does not support `"-"` or `"_"` */
  interpolate: string;

  /** Which prefix to use for raw interpolation. Default `"~"`, does not support `"-"` or `"_"` */
  raw: string;
}

export type TemplateFunction = (data: object, isAsync: boolean) => string;

export type AstObject = string | TemplateData;
