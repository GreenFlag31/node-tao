import { infiniteInclusionError } from './error-utils';
import { Metrics } from './interfaces';
import { Store } from './store';

function includeRenderTime(development: boolean) {
  if (!development) return '';

  return `const ɵɵrenderDuration = (performance.now() - ɵɵstart).toFixed(2);`;
}

function includeChildren(development: boolean) {
  if (!development) return '';

  return `const ɵɵchildren = this.childrenStore.get(this.parentTemplate) || [];`;
}

function updateChildrenStore(
  childrenStore: Store<string[]>,
  filename: string,
  parentTemplate: string,
  development: boolean,
) {
  if (!development) return;

  const children = childrenStore.get(parentTemplate) || [];
  if (children.includes(filename)) {
    const error = infiniteInclusionError(filename, children);
    throw error;
  }

  children.push(filename);
  childrenStore.set(parentTemplate, children);
}

/**
 * Builds the static HTML/CSS/JS for the floating devtools widget.
 * All string literals inside use double quotes so the output is safe
 * to embed in the single-quoted JS string produced by includeMetrics.
 */
function buildDevtoolsWidget(filename: string, cacheEnabled: boolean, templates: string[]): string {
  const cacheStatus = cacheEnabled ? 'enabled' : 'disabled';
  const tmplItems = templates.map((t, i) => `<li><b>${i + 1}</b>${t}</li>`).join('');

  const consoleMappedItems = templates
    .map((t, i) => `console.log("%c#${i + 1} %c${t}","color: #888","color: #87cefa");`)
    .join('');

  const css = [
    '#tao-dt{position:fixed;bottom:20px;right:20px;z-index:2147483647;font-family:ui-monospace,monospace;font-size:12px}',
    '#tao-dt-btn{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#0f0f1a,#1e1e3a);border:1px solid #4a4a6a;color:#00ff99;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.5);transition:transform .2s,box-shadow .2s;outline:none}',
    '#tao-dt-btn:hover{transform:scale(1.1);box-shadow:0 6px 24px rgba(0,255,153,.15)}',
    '#tao-dt-panel{position:absolute;bottom:52px;right:0;width:320px;background:#0d0d1a;border:1px solid #2a2a4a;border-radius:12px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.7);display:none}',
    '#tao-dt-panel.tao-open{display:block}',
    '.tao-ph{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #1a1a3a;background:#09091a}',
    '.tao-ph-t{color:#00ff99;font-weight:700;font-size:13px}',
    '.tao-ph-x{background:none;border:none;color:#555;cursor:pointer;font-size:14px;padding:0;line-height:1}',
    '.tao-ph-x:hover{color:#ff4d4d}',
    '.tao-pb{padding:10px 14px}',
    '.tao-row{display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:1px solid #111128}',
    '.tao-k{color:#555;font-size:10px;text-transform:uppercase;letter-spacing:.6px}',
    '.tao-v{color:#ccc;text-align:right;word-break:break-all;max-width:185px;font-size:11px}',
    '.tao-v-ok{color:#00ff99}.tao-v-warn{color:#ffa500}.tao-v-info{color:#66ccff}.tao-v-dim{color:#555}',
    '.tao-sep{color:#3a3a6a;font-size:10px;text-transform:uppercase;letter-spacing:.6px;margin:10px 0 6px;font-weight:700}',
    '.tao-ul{list-style:none;padding:0;margin:0;max-height:100px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#2a2a4a #0d0d1a}',
    '.tao-ul::-webkit-scrollbar{width:4px}',
    '.tao-ul::-webkit-scrollbar-track{background:#0d0d1a}',
    '.tao-ul::-webkit-scrollbar-thumb{background:#2a2a4a;border-radius:2px}',
    '.tao-ul li{color:#87cefa;padding:2px 0;font-size:11px;display:flex;gap:5px}',
    '.tao-ul li b{color:#444;font-weight:normal;min-width:16px}',
  ].join('');

  // TAO_DT_set receives runtime values from the data-injection script tag.
  // Static values (filename, cacheStatus, templates) are baked in here at compile time.
  const js = [
    '(function(){',
    'function getEl(id) { return document.getElementById(id); }',
    'window.TAO_DT_set = function(data) {',
    'var rtValue = parseFloat(data.rt);',
    'getEl("tao-dt-rt").textContent = data.rt;',
    'getEl("tao-dt-rt").className = "tao-v " + (rtValue < 5 ? "tao-v-ok" : "tao-v-warn");',
    'var cacheHit = data.ch;',
    'getEl("tao-dt-ch").textContent = String(cacheHit);',
    'getEl("tao-dt-ch").className = "tao-v " + (cacheHit ? "tao-v-ok" : "tao-v-dim");',
    'var childrenEl = getEl("tao-dt-ci");',
    'childrenEl.textContent = data.ci || "none";',
    'if (!data.ci) childrenEl.className = "tao-v tao-v-dim";',
    'var dkEl = getEl("tao-dt-dk");',
    'dkEl.textContent = String(data.dk);',
    'dkEl.className = "tao-v " + (data.dk > 0 ? "tao-v-info" : "tao-v-dim");',
    'var hkEl = getEl("tao-dt-hk");',
    'hkEl.textContent = String(data.hk);',
    'hkEl.className = "tao-v " + (data.hk > 0 ? "tao-v-info" : "tao-v-dim");',
    `console.log("%c[RENDERED]%c    ${filename}", "color: #00ff99;font-weight:bold", "color: #fff");`,
    'console.log("%c[CHILDREN]%c    " + (data.ci || ""), "color: #66ccff;font-weight:bold", "color: #fff");',
    'console.log("%c[RENDER TIME]%c " + data.rt, "color: #ffa500;font-weight:bold", "color: #fff");',
    `console.log("%c[CACHE]%c       ${cacheStatus}", "color: #ff4d4d;font-weight:bold", "color: #fff");`,
    'console.log("%c[CACHE HIT]%c   " + String(cacheHit), "color:rgb(255, 0, 221);font-weight:bold", "color: #fff");',
    `console.group("%cMAPPED TEMPLATES (${templates.length})", "color: #00ffcc; font-weight: bold");`,
    consoleMappedItems,
    'console.groupEnd();',
    '};',
    'var btn = getEl("tao-dt-btn");',
    'var panel = getEl("tao-dt-panel");',
    'btn.addEventListener("click", function(e) { e.stopPropagation(); panel.classList.toggle("tao-open"); });',
    'getEl("tao-dt-x").addEventListener("click", function() { panel.classList.remove("tao-open"); });',
    'document.addEventListener("click", function(e) { if (!e.target.closest("#tao-dt")) panel.classList.remove("tao-open"); });',
    '})();',
  ].join('');

  return [
    `<style>${css}</style>`,
    `<div id="tao-dt">`,
    `<div id="tao-dt-panel">`,
    `<div class="tao-ph"><span class="tao-ph-t">&#9889; Tao DevTools</span><button class="tao-ph-x" id="tao-dt-x">&#x2715;</button></div>`,
    `<div class="tao-pb">`,
    `<div class="tao-row"><span class="tao-k">Template</span><span class="tao-v tao-v-ok">${filename}</span></div>`,
    `<div class="tao-row"><span class="tao-k">Render time</span><span class="tao-v" id="tao-dt-rt"></span></div>`,
    `<div class="tao-row"><span class="tao-k">Cache</span><span class="tao-v ${cacheEnabled ? 'tao-v-ok' : 'tao-v-warn'}">${cacheStatus}</span></div>`,
    `<div class="tao-row"><span class="tao-k">Cache hit</span><span class="tao-v" id="tao-dt-ch"></span></div>`,
    `<div class="tao-row"><span class="tao-k">Children</span><span class="tao-v tao-v-info" id="tao-dt-ci"></span></div>`,
    `<div class="tao-row"><span class="tao-k">Data keys</span><span class="tao-v" id="tao-dt-dk"></span></div>`,
    `<div class="tao-row"><span class="tao-k">Helpers</span><span class="tao-v" id="tao-dt-hk"></span></div>`,
    `<div class="tao-sep">Mapped templates (${templates.length})</div>`,
    `<ul class="tao-ul">${tmplItems}</ul>`,
    `</div></div>`,
    `<button id="tao-dt-btn" title="Tao DevTools">&#964;</button>`,
    `</div>`,
    `<script>${js}</script>`,
  ].join('');
}

/**
 * Injects the devtools floating widget when development mode is enabled.
 * The widget shows a small "τ" button in the bottom-right corner; clicking it
 * opens a panel with render time, cache info, and template list.
 * Console logs are preserved inside the widget setup script.
 */
function includeMetrics(metricsData: Metrics) {
  const { cacheEnabled, filename, files, development } = metricsData;
  if (!development) return '"";';

  const templates = getFileNameAndAbsPath(files);
  const widget = buildDevtoolsWidget(filename, cacheEnabled, templates);

  // ' + variable + ' splices runtime values into the compiled JS string.
  // The resulting expression in compiled code:
  //   ɵɵtp.res += '[widget]<script>TAO_DT_set({rt:"Xms",ch:bool,ci:"..."})</script>';
  return `'${widget}<script>TAO_DT_set({rt:"' + ɵɵrenderDuration + 'ms",ch:' + ɵɵcacheHit + ',ci:"' + ɵɵchildren.join(", ") + '",dk:' + Object.keys(tao).length + ',hk:' + Object.keys(hp).length + '})</script>'`;
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

export {
  getFileNameAndAbsPath,
  includeMetrics,
  includeRenderTime,
  includeChildren,
  updateChildrenStore,
};
