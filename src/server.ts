import path from 'node:path';
import { Eta } from './index copy';
import { Eta as EtaOriginal } from './index';
import express from 'express';
import { log, time, timeEnd } from 'node:console';

const app = express();
const PORT = 3000;

const templatesPath = path.join(__dirname, 'public');
const etaOrigin = new EtaOriginal({ views: templatesPath, debug: true });
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

const eta = new Eta({ views: templatesPath, extension: 'html' });
app.get('/', (req, res) => {
  const test = {
    name: `ben`,
  };

  const error = {
    originalFileName: 'simple.eta',
    fileContent: [
      '<!DOCTYPE html>\r',
      '<html lang="en">\r',
      '<head>\r',
      '  <meta charset="UTF-8" />\r',
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\r',
      '  <title>Title</title>\r',
      '</head>\r',
      '<body>\r',
      '<h1>Hi <%= itsqsq.name %></h1>\r',
      '</body>\r',
      '</html>',
    ],
    message: 'ReferenceError: itsqsq is not defined',
    lineNumber: 9,
  };

  const renderedTemplate = eta.render('error', error);

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
