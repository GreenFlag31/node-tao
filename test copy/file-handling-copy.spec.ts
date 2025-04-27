import path from "node:path";
import { Eta } from "../src/index copy";

// const viewsDir = path.join(__dirname, "templates");
// const eta = new Eta({ views: viewsDir });

// describe("file handling tests added", () => {
//   it("resolvePath should concat correctly path", () => {
//     const templateResult = eta.resolvePath("simple");

//     const resolved = path.join(__dirname, "templates", "simple.eta");
//     expect(templateResult).toEqual(resolved);
//   });
// });

const viewsDir = path.join(__dirname, "templates");
const eta = new Eta({ views: viewsDir, defaultExtension: ".eta" });

// describe("resolvePath", () => {
//   it("should resolve simple template name to full path", () => {
//     const result = eta.resolvePath("simple");
//     expect(result).toEqual(path.join(viewsDir, "simple.eta"));
//   });

//   it("should preserve nested paths", () => {
//     const result = eta.resolvePath("nested/partial");
//     expect(result).toEqual(path.join(viewsDir, "nested", "partial.eta"));
//   });

//   it("should strip leading slashes or backslashes", () => {
//     const result = eta.resolvePath("/leading/slash");
//     expect(result).toEqual(path.join(viewsDir, "leading", "slash.eta"));
//   });

//   it("should resolve relative to baseFilePath if provided", () => {
//     const baseFilePath = path.join(viewsDir, "partials", "parent.eta");
//     const result = eta.resolvePath("child", { filepath: baseFilePath });
//     expect(result).toEqual(path.join(viewsDir, "partials", "child.eta"));
//   });

//   it("should add extension if missing", () => {
//     const result = eta.resolvePath("noext");
//     expect(result.endsWith(".eta")).toBe(true);
//   });
// });
