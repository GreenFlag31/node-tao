import path from 'node:path';
import express from 'express';
import { Tao } from './tao';
import { options } from './interfaces';

const app = express();
const PORT = 3000;

const templatesPath = path.join(__dirname, 'templates');
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

const option: options = {
  debug: true,
  metrics: true,
  views: templatesPath,
};

const tao = new Tao(option);

app.get('/', (req, res) => {
  function nPlusOne(n: number) {
    return n + 1;
  }

  const renderedTemplate = tao.render('simple', { name: `ben` }, { nPlusOne });
  res.status(200).send(renderedTemplate);
});

app.get('/more', (req, res) => {
  const renderedTemplate = tao.render('partial', { name: `pa` });
  res.status(200).send(renderedTemplate);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
