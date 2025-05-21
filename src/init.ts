import { Tags } from './interfaces';
import { DEFAULT_CLOSING, DEFAULT_OPENING } from './const';

function assignTags(tags: Tags) {
  const { opening = '', closing = '' } = tags;
  const definitiveTags: Required<Tags> = { opening, closing };

  if (!opening) {
    definitiveTags.opening = DEFAULT_OPENING;
  }

  if (!closing) {
    definitiveTags.closing = DEFAULT_CLOSING;
  }

  return definitiveTags;
}

export { assignTags };
