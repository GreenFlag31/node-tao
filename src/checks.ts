import { DYNAMICAL_TEMPLATE_PREFIX } from './const';
import { Parse, Tags } from './interfaces';
import { getPathWithExtension } from './utils';

function templateIsOfTypeString(template: string) {
  if (typeof template !== 'string') {
    console.error(new Error('Provided template should be of type string'));
    return false;
  }

  return true;
}

function isTemplateDynamicallyDefined(template: string) {
  return template.startsWith(DYNAMICAL_TEMPLATE_PREFIX);
}

/**
 * Retrieve children template names.
 * Example: include('simple', ...) => simple.html
 */
function getChildrenTemplatesName(content: string, extension: string) {
  const includeToken = new RegExp(/include\(\s*([^,)]+)/, 'g');
  return [...content.matchAll(includeToken)].map((match) => {
    const matchWithoutQuotes = match[1].replace(/'|"|`/g, '');
    return getPathWithExtension(matchWithoutQuotes, extension);
  });
}

function templateContainsInclude(content: string) {
  const includeToken = new RegExp(/include\(.*\)/);
  return includeToken.test(content);
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

function givenExtensionShouldNotStartWithADot(extension: string) {
  if (extension.startsWith('.')) return extension.slice(1);

  return extension;
}

export {
  getPathWithExtension,
  isTemplateDynamicallyDefined,
  checkOpeningAndClosingTag,
  checkPrefixTemplateTags,
  templateContainsInclude,
  getChildrenTemplatesName,
  templateIsOfTypeString,
  givenExtensionShouldNotStartWithADot,
};
