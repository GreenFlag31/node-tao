import { Parse, Tags } from './interfaces';
import {
  DEFAULT_CLOSING,
  DEFAULT_EXEC,
  DEFAULT_INTERPOLATE,
  DEFAULT_OPENING,
  DEFAULT_RAW,
} from './const';

/**
 * Configuration tag options can be partial, so definitive assignation is required to maintain all properties.
 */
function assignTags(tags: Tags) {
  const { opening = DEFAULT_OPENING, closing = DEFAULT_CLOSING } = tags;
  const definitiveTags: Required<Tags> = { opening, closing };

  return definitiveTags;
}

/**
 * Configuration parse options can be partial, so definitive assignation is required to maintain all properties.
 */
function assignParse(parse: Parse) {
  const { exec = DEFAULT_EXEC, interpolate = DEFAULT_INTERPOLATE, raw = DEFAULT_RAW } = parse;
  const definitiveParse: Required<Parse> = { exec, interpolate, raw };

  return definitiveParse;
}

export { assignTags, assignParse };
