// This is a new file, not contained in the original project.
// Having small functions does not only improves readability and
// reduces bugs, it's also make them testable.
import path from "node:path";
import { EtaFileResolutionError } from "./err";
import { DEFAULT_EXTENSION } from "./const";

function checkIfViewsExists(views: string | undefined) {
  if (!views) {
    throw new EtaFileResolutionError("Views directory is not defined");
  }
}

function getPathWithExtension(filePath: string, defaultExtension = DEFAULT_EXTENSION) {
  const pathContainsExtension = path.extname(filePath);
  if (pathContainsExtension) return filePath;

  return filePath + defaultExtension;
}

function getFullPath(views: string, baseFilePath: string | undefined, templatePath: string) {
  if (baseFilePath) {
    return getPathWithExtension(baseFilePath);
  }

  return path.join(views, templatePath);
}

/**
 * Security measure to allow access to only files in given directory that has been previously mapped.
 */
function isTemplateFileInsideGivenDirectory(templatePaths: string[], templateFile: string) {
  return templatePaths.some((path) => path.endsWith(templateFile));
}

export {
  checkIfViewsExists,
  getPathWithExtension,
  getFullPath,
  isTemplateFileInsideGivenDirectory,
};
