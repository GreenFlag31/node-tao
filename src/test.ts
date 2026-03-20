import path from 'node:path';
import { Tao } from './tao';

const tao = new Tao({ development: true });
const parentComponent = `
    <header>
      <h1><%= parentTitle %></h1>
      <%~ include('@childComponent') %>
    </header>
  `;
const childComponent = `
    <div>
      <h1><%= childTitle %></h1>
    </div>
  `;
const parentTitle = { parentTitle: 'parent data', childTitle: 'child data' };
tao.loadTemplate('@parentComponent', parentComponent);
tao.loadTemplate('@childComponent', childComponent);
const result = tao.render('@parentComponent', parentTitle);
const result2 = tao.render('@parentComponent', parentTitle);
