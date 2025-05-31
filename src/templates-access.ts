import { globSync } from 'glob';

/**
 * Perform once.
 * Search for all files within a given directory.
 * Normalize paths on Windows.
 */
function getFilesFromDirectory(directory: string, extension: string) {
  const files = globSync(`${directory}/**/*${extension}`, {
    absolute: true,
    nodir: true,
    ignore: ['node_modules/**'],
  });

  const normalizedPaths = files.map((file) => file.replace(/\\/g, '/'));
  return normalizedPaths;
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

export { getFilesFromDirectory, checkAccessPermission, isTemplateFileInsideGivenDirectory };
