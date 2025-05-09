import { Eta as EtaCore } from "./core";
import { readFile, resolvePath } from "./file-handling";
export {
  EtaError,
  EtaFileResolutionError,
  EtaNameResolutionError,
  EtaParseError,
  EtaRuntimeError,
} from "./err";
export { type EtaConfig, type Options } from "./config";

export class Eta extends EtaCore {
  readFile = readFile;

  resolvePath = resolvePath;
}
