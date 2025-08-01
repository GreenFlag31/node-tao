import { DYNAMICAL_TEMPLATE_PREFIX } from './const';
import { Parse, Tags } from './interfaces';
import { getPathWithExtension } from './utils';

function isTemplateDynamicallyDefined(template: string) {
  return template.startsWith(DYNAMICAL_TEMPLATE_PREFIX);
}

function checkOpeningAndClosingTag(tags: Tags) {
  const { opening, closing } = tags;
  if (opening === closing) {
    throw new Error('Opening and closing tag should be different');
  }
}

function checkPrefixTemplateTags(parse: Parse) {
  const parseValues = Object.entries(parse);

  for (let i = 0; i < parseValues.length; i++) {
    const [key, value] = parseValues[i];

    for (let j = i + 1; j < parseValues.length; j++) {
      const [nextKey, nextValue] = parseValues[j];

      if (value === nextValue) {
        throw new Error(
          `Cannot have the same parse value at '${key}' and '${nextKey}' with value '${value}'`
        );
      }
    }
  }
}

function trimDotFromExtension(extension: string) {
  if (extension.startsWith('.')) return extension.slice(1);

  return extension;
}

export {
  getPathWithExtension,
  isTemplateDynamicallyDefined,
  checkOpeningAndClosingTag,
  checkPrefixTemplateTags,
  trimDotFromExtension,
};
