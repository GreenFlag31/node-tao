import { globSync } from "glob";
import { EtaFileResolutionError } from "./err";

/**
 * Perform once.
 * Search for all files within a give directory.
 * Synchronous version is used due to commonjs support.
 */
function getFilesFromDirectory(directory: string, extension: string) {
  const files = globSync(`${directory}/**/*${extension}`, {
    absolute: true,
    nodir: true,
  });

  if (files.length === 0) {
    throw new EtaFileResolutionError(`No template files found in ${directory}`);
  }

  return files;
}

export { getFilesFromDirectory };
