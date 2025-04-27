import { EtaFileResolutionError } from "./err";
import promise from "node:fs/promises";
import type { Eta as EtaCore } from "./core copy";

async function asyncReadFile(this: EtaCore, path: string) {
  try {
    const file = await promise.readFile(path, "utf8");
    return file;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      throw new EtaFileResolutionError(`Could not find template: ${path}`);
    }

    throw error;
  }
}

export { asyncReadFile };
