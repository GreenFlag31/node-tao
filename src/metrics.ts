import { TEMPLATE_VARNAME } from './const';
import { Metrics } from './interfaces';

function includeRenderTime(metrics: boolean, isAChild: boolean) {
  if (!metrics || isAChild) return '';

  return `const ɵɵrenderDuration = (performance.now() - ɵɵstart).toFixed(2);`;
}

function includeChildren(metrics: boolean, isAChild: boolean) {
  if (!metrics || isAChild) return '';

  return `const ɵɵchildren = this.childrenStore.get(this.parentTemplate);`;
}

function resetParentTemplateAtEndOfExecution(parentTemplate: string, filename: string) {
  if (isAChildTemplate(parentTemplate, filename)) return parentTemplate;

  return '';
}

function getUniqueChildren(parentStored: string[], children: string[]) {
  const allChildren = parentStored.concat(children);
  return Array.from(new Set(allChildren));
}

function isAParentTemplate(parentTemplate: string, filename: string) {
  return parentTemplate === filename;
}

function isAChildTemplate(parentTemplate: string, filename: string) {
  return !isAParentTemplate(parentTemplate, filename);
}

/**
 * Display metrics in the browser. Do not include logs if disabled or if the current template is included in another template. Make data available in the console.
 */
function includeMetrics(metricsData: Metrics) {
  const { cacheEnabled, filename: filename, files, metrics, isAChild } = metricsData;
  if (!metrics || isAChild) return '""';

  const templatesPathWithDirectory = getFileNameAndAbsPath(files);

  return `'<script>const data = ' + JSON.stringify(${TEMPLATE_VARNAME}) + ';console.log(${logRendered(
    filename
  )});${logChildTemplatesCount()};${logRenderTime()};console.log(${logCache(
    cacheEnabled
  )});${logMappedTemplates(templatesPathWithDirectory)}</script>'`;
}

function logMappedTemplates(templates: string[]) {
  const logs = templates
    .map((tpl, i) => `console.log("%c#${i + 1} %c${tpl}", "color: #888", "color: #87cefa");`)
    .join('');

  return `console.group("%cMAPPED TEMPLATES (${templates.length})", "color: #00ffcc; font-weight: bold");${logs}console.groupEnd();`;
}

function logCache(cacheEnabled: boolean) {
  const isEnabled = cacheEnabled ? 'enabled' : 'disabled';

  return `"%c[CACHE]%c       ${isEnabled}", "color: #ff4d4d;font-weight:bold", ${getNormalStyle()}`;
}

function logRendered(template: string) {
  return `"%c[RENDERED]%c    ${template}", "color: #00ff99;font-weight:bold", ${getNormalStyle()}`;
}

function logChildTemplatesCount() {
  const children = `(ɵɵchildren.length ? ɵɵchildren.join(", ") : "")`;

  return `console.log("%c[CHILDREN]%c    ' + ${children} + '", "color: #66ccff;font-weight:bold",${getNormalStyle()})`;
}

function logRenderTime() {
  return `console.log("%c[RENDER TIME]%c ' + ɵɵrenderDuration + 'ms", "color: #ffa500;font-weight:bold",${getNormalStyle()})`;
}

/**
 * Takes into account the parent directory.
 */
function getFileNameAndAbsPath(files: string[]) {
  const templatesPathWithDirectory: string[] = [];

  for (const file of files) {
    const fileName = file.split('/').slice(-2).join('/');
    templatesPathWithDirectory.push(fileName);
  }

  return templatesPathWithDirectory;
}

function getNormalStyle() {
  return `"color: #fff"`;
}

export {
  getFileNameAndAbsPath,
  getNormalStyle,
  includeMetrics,
  includeRenderTime,
  isAChildTemplate,
  isAParentTemplate,
  resetParentTemplateAtEndOfExecution,
  includeChildren,
  getUniqueChildren,
};
