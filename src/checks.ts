import path from 'node:path';
import { DEFAULT_EXTENSION, DYNAMICAL_TEMPLATE_PREFIX } from './const';
import { Parse, Tags } from './interfaces';

function getPathWithExtension(filePath: string, extension = DEFAULT_EXTENSION) {
  const pathContainsExtension = path.extname(filePath);
  if (pathContainsExtension) return filePath;

  return filePath + extension;
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

function templateContainsLayout(content: string) {
  const layoutToken = new RegExp(/layout\(.*\)/);
  return layoutToken.test(content);
}

function templateContainsInclude(content: string) {
  const layoutToken = new RegExp(/include\(.*\)/);
  return layoutToken.test(content);
}

function templateContainsIncludeAsync(content: string) {
  const layoutToken = new RegExp(/includeAsync\(.*\)/);
  return layoutToken.test(content);
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

export {
  getPathWithExtension,
  getFullPath,
  isTemplateFileInsideGivenDirectory,
  isTemplateDynamicallyDefined,
  checkOpeningAndClosingTag,
  checkPrefixTemplateTags,
  templateContainsLayout,
  templateContainsInclude,
  templateContainsIncludeAsync,
};
