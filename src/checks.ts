import path from 'node:path';
import { DYNAMICAL_TEMPLATE_PREFIX } from './const';
import { Parse, Tags } from './interfaces';

function getPathWithExtension(filePath: string, extension: string) {
  const pathContainsExtension = path.extname(filePath);
  if (pathContainsExtension) return filePath;

  return `${filePath}.${extension}`;
}

function isTemplateDynamicallyDefined(template: string) {
  return template.startsWith(DYNAMICAL_TEMPLATE_PREFIX);
}

function includedTemplates(content: string, extension: string) {
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

/**
 * No metrics should be displayed if disabled or in production.
 */
function metricsDisabled(metrics: boolean) {
  return !metrics;
}

/**
 * No debug message should be displayed if disabled or in production.
 */
function debugDisabled(debug: boolean) {
  return !debug;
}

/**
 * Security measure to allow access to only files in given directory that has been previously mapped.
 */
function isTemplateFileInsideGivenDirectory(templatePaths: string[], templateFile: string) {
  return templatePaths.filter((path) => path.endsWith(templateFile));
}

function checkAccessPermission(templatePaths: string[], templateFile: string) {
  const filesFound = isTemplateFileInsideGivenDirectory(templatePaths, templateFile);

  if (filesFound.length === 0) {
    console.error(`Non existing template or template out of scope (reading "${templateFile}")`);
    return undefined;
  }
  if (filesFound.length > 1) {
    console.error(
      `Non unique template given "${templateFile}". Possible:\n- ${filesFound.join('\n- ')}`
    );
    return undefined;
  }

  return filesFound[0];
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
  if (extension.startsWith('.')) {
    throw new Error('Please provide an extension without a dot in front');
  }
}

export {
  getPathWithExtension,
  isTemplateFileInsideGivenDirectory,
  isTemplateDynamicallyDefined,
  checkOpeningAndClosingTag,
  checkPrefixTemplateTags,
  templateContainsInclude,
  checkAccessPermission,
  givenExtensionShouldNotStartWithADot,
  metricsDisabled,
  debugDisabled,
  includedTemplates,
};
