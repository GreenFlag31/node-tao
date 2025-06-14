import {
  DEFAULT_CLOSING,
  DEFAULT_EXEC,
  DEFAULT_EXTENSION,
  DEFAULT_INTERPOLATE,
  DEFAULT_OPENING,
  DEFAULT_RAW,
} from './const';
import { DefinitiveOptions } from './interfaces';
import { XMLEscape } from './utils';

const defaultConfig: DefinitiveOptions = {
  views: process.cwd(),
  autoEscape: true,
  escapeFunction: XMLEscape,
  cache: true,
  development: false,
  fileResolution: 'flexible',
  parse: {
    exec: DEFAULT_EXEC,
    interpolate: DEFAULT_INTERPOLATE,
    raw: DEFAULT_RAW,
  },
  tags: {
    opening: DEFAULT_OPENING,
    closing: DEFAULT_CLOSING,
  },
  extension: DEFAULT_EXTENSION,
};

export { defaultConfig };
