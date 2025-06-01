import path from 'node:path';
import express from 'express';
import { Tao } from './tao';

const app = express();
const PORT = 3000;

const templatesPath = path.join(__dirname, 'templates');
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

const tao = new Tao({
  views: templatesPath,
  debug: true,
  metrics: true,
});

app.get('/', (req, res) => {
  const headerPartial = `
    <header>
      <h1><%= title %></h1>
    </header>
  `;
  // const partialData = { title: 'this is my t' };
  tao.loadTemplate('@header', headerPartial);
  // const renderedTemplate = eta.render('@header', partialData, { nPlusOne });

  const simple = {
    name: `ben`,
    includePage: `this is included in include page`,
    heading: 'this is a heading',
    content: 'this is a content',
  };

  const renderedTemplate = tao.render('simple', simple);
  res.status(200).send(renderedTemplate);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
