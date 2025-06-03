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
  // cache: false,
});

app.get('/', (req, res) => {
  const renderedTemplate = tao.render('simple', { name: `ben` });
  res.status(200).send(renderedTemplate);
});

app.get('/more', (req, res) => {
  const renderedTemplate = tao.render('partial', { name: `pa` });
  res.status(200).send(renderedTemplate);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
