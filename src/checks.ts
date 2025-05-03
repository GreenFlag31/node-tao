import path from 'node:path';
import { DEFAULT_EXTENSION, DYNAMICAL_TEMPLATE_PREFIX } from './const';
import { Parse, Tags } from './interfaces';
import { log } from 'node:console';
import assert from 'node:assert';

function getPathWithExtension(filePath: string, defaultExtension = DEFAULT_EXTENSION) {
  const pathContainsExtension = path.extname(filePath);
  if (pathContainsExtension) return filePath;

  return filePath + defaultExtension;
}

function getFullPath(views: string, templatePath: string, isAbsolute: boolean) {
  if (isAbsolute) {
    return getPathWithExtension(templatePath);
  }

  return path.join(views, templatePath);
}

function isTemplateDynamicallyDefined(template: string) {
  return template.startsWith(DYNAMICAL_TEMPLATE_PREFIX);
}

/**
 * Security measure to allow access to only files in given directory that has been previously mapped.
 */
function isTemplateFileInsideGivenDirectory(templatePaths: string[], templateFile: string) {
  return templatePaths.some((path) => path.endsWith(templateFile));
}

function checkOpeningAndClosingTag(tags: Tags) {
  const { opening, closing } = tags;
  if (opening === closing) {
    throw new Error('Opening and closing tag should be different');
  }
}

function checkPrefixTemplateTags(parse: Parse) {
  const parseValues = Object.values(parse);
  const parseKeys = Object.keys(parse);

  for (let i = 0; i < parseValues.length; i++) {
    const value = parseValues[i];

    for (let j = i + 1; j < parseValues.length; j++) {
      const nextValue = parseValues[j];

      if (value === nextValue) {
        throw new Error(
          `Cannot have the same parse value at '${parseKeys[i]}' and '${parseKeys[j]}' with value '${value}'`
        );
      }
    }
  }
}

export {
  getPathWithExtension,
  getFullPath,
  isTemplateFileInsideGivenDirectory,
  isTemplateDynamicallyDefined,
  checkOpeningAndClosingTag,
  checkPrefixTemplateTags,
};
