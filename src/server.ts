import path from 'node:path';
import { Eta } from './index copy';
import { Eta as EtaOriginal } from './original/index';
import express from 'express';
import { log, time, timeEnd } from 'node:console';

const app = express();
const PORT = 3000;

const templatesPath = path.join(__dirname, 'templates');
const etaOrigin = new EtaOriginal({ views: templatesPath });
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

const eta = new Eta({ views: templatesPath, extension: 'eta', cache: false });
app.get('/', (req, res) => {
  let simple = {
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

  const renderedTemplate = eta.render('simple', simple);

  res.status(200).send(renderedTemplate);
});

function test() {
  for (let i = 0; i < 100; i++) {
    const renderedTemplate = eta.render('simple', {
      name: `Ben`,
    });
  }
}

// test();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
