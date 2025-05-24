import {
  DEFAULT_CLOSING,
  DEFAULT_EXEC,
  DEFAULT_EXTENSION,
  DEFAULT_INTERPOLATE,
  DEFAULT_OPENING,
  DEFAULT_RAW,
} from './const';
import { DefinitiveConfig } from './interfaces';
import { XMLEscape } from './utils';

const defaultConfig: DefinitiveConfig = {
  autoEscape: true,
  cache: true,
  debug: false,
  views: process.cwd(),
  escapeFunction: XMLEscape,
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
  metrics: true,
  fileResolution: 'flexible',
};

export { defaultConfig };
