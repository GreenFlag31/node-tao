import path from 'node:path';
import express from 'express';
import { Tao } from './tao';

const app = express();
const PORT = 3000;

const templatesPath = path.join(__dirname, 'templates');
const tao = new Tao({ views: templatesPath, development: true, cache: true });

app.get('/', (req, res) => {
  const result = tao.render('simple');
  res.status(200).send(result);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
