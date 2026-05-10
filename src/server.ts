import express from 'express';
import path from 'node:path';
import { Tao } from './tao';

const app = express();
const PORT = 3000;

const tao = new Tao({
  views: path.join(__dirname),
  development: true,
});

app.get('/', (_req, res) => {
  const html = tao.render('index', {
    title: 'node-tao demo',
    name: 'World',
  });

  res.send(html);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
