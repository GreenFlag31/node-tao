import path from 'node:path';
import { Eta } from './index copy';
import express from 'express';

const app = express();
const PORT = 3000;

const templatesPath = path.join(__dirname, 'templates');
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

function nPlusOne(n: number) {
  return n + 1;
}
function nPlusTwo(n: number) {
  return n + 2;
}

const eta = new Eta({
  views: templatesPath,
  extension: 'html',
  cache: true,
  debug: true,
});
eta.defineHelpers({ nPlusTwo });

app.get('/', (req, res) => {
  // const headerPartial = `
  //   <header>
  //     <h1><%= title %></h1>
  //   </header>
  // `;
  // const partialData = { title: 'this is my t' };
  // eta.loadTemplate('@header', headerPartial);
  // const renderedTemplate = eta.render('@header', partialData, { nPlusOne });

  const simple = {
    name: `ben`,
    num: 3,
  };

  const renderedTemplate = eta.render('simple', simple, { nPlusOne });
  res.status(200).send(renderedTemplate);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
