import path from 'node:path';
import express from 'express';
import { Tao } from './tao';
import { normalizeFilesPath } from './utils';
import { log } from 'node:console';

const app = express();
const PORT = 3000;

const templatesPath = path.join(__dirname, 'templates');

const templateViews = path.join(process.cwd(), 'test/templates');
const tao = new Tao({ views: templateViews, development: true });

app.get('/', (req, res) => {
  const headerPartial = `
    <header>
      <h1><%= title %></h1>
      <%~ include('simple') %>
    </header>
  `;
  const data = { title: 'this is my partial', name: 'included' };
  tao.loadTemplate('@header3', headerPartial);
  const result = tao.render('@header3', data);

  const fullPath = normalizeFilesPath(path.join(templateViews, 'simple.html'));

  const data2 = { name: 'test' };
  const result2 = tao.render(fullPath, data2);

  log(result);
  log(result2);

  res.status(200).send(result);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
