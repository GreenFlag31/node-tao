import path from 'node:path';
import express from 'express';
import { Tao } from './tao';
import { options } from './interfaces';

const app = express();
const PORT = 3000;

const templatesPath = path.join(__dirname, 'templates');
// const publicPath = path.join(__dirname, 'public');
// app.use(express.static(publicPath));

const option: options = {
  debug: true,
  metrics: true,
  views: templatesPath,
};

const tao = new Tao(option);

app.get('/', (req, res) => {
  const data = {
    name: 'aaaqq',
  };
  const result = tao.render('simple');
  res.status(200).send(result);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
