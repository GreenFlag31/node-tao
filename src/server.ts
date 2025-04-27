import path from "node:path";
import { Eta } from "./index copy";
import { Eta as EtaOriginal } from "./index";
import express from "express";
import { log, time, timeEnd } from "node:console";

const app = express();
const PORT = 3000;

const templatesPath = path.join(__dirname, "templates");
const eta = new Eta({ views: templatesPath });
const etaOrigin = new EtaOriginal({ views: templatesPath });

app.get("/", (req, res) => {
  const absolutePathTest = path.join(templatesPath, "./simple");
  const renderedTemplate = eta.render("simple", {
    name: `Ben`,
  });

  res.status(200).send(renderedTemplate);
});

function test() {
  const renderedTemplate = etaOrigin.render("layout", {
    name: `Ben`,
  });
}

test();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
