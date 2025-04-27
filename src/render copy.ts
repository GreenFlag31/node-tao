import type { Eta } from "./core copy";
import { TemplateFunction } from "./interfaces";

// export function renderAsync<T extends object>(
//   this: Eta,
//   template: string | TemplateFunction,
//   data: T,
//   meta?: { filepath: string }
// ): Promise<string> {
//   let templateFn: TemplateFunction;
//   const options = { ...meta, async: true };

//   if (typeof template === "string") {
//     if (!template.startsWith("@")) {
//       options.filepath = this.resolvePath(template, options);
//     }

//     templateFn = this.handleCache.call(this, template, options);
//   } else {
//     templateFn = template;
//   }

//   const res = templateFn.call(this, data, options);

//   // Return a promise
//   return Promise.resolve(res);
// }

// export function renderString<T extends object>(this: Eta, template: string, data: T): string {
//   const templateFn = this.compile(template, { async: false });

//   return this.render.call(this, templateFn, data);
// }

// export function renderStringAsync<T extends object>(
//   this: Eta,
//   template: string,
//   data: T
// ): Promise<string> {
//   const templateFn = this.compile(template, { async: true });

//   return renderAsync.call(this, templateFn, data);
// }
