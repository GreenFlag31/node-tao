import path from "node:path";
import { EtaFileResolutionError } from "./err";
import { DEFAULT_EXTENSION, DYNAMICAL_TEMPLATE_PREFIX } from "./const";

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

export {
  getPathWithExtension,
  getFullPath,
  isTemplateFileInsideGivenDirectory,
  isTemplateDynamicallyDefined,
};
