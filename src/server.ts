import path from 'node:path';
import { Eta } from './index copy';
import { Eta as EtaOriginal } from './index';
import express from 'express';
import { log, time, timeEnd } from 'node:console';

const app = express();
const PORT = 3000;

const templatesPath = path.join(__dirname, 'templates');
const eta = new Eta({ views: templatesPath });
const etaOrigin = new EtaOriginal({ views: templatesPath, debug: true });

app.get('/', (req, res) => {
  const data = {
    htmlstuff: '<b>Hello, world!</b>',
    obj: {
      firstchild: 'value1',
      secondchild: 'value2',
      thirdchild: ['valA', 'valB', 'valC'],
      fourthchild: 'value4',
    },
  };

  const test = {
    name: `ben`,
  };

  const renderedTemplate = eta.render('simple', test);

  res.status(200).send(renderedTemplate);
});

function test() {
  const renderedTemplate = eta.render('simple', {
    name: `Ben`,
  });
  log(renderedTemplate);
}

// test();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
