import { time, timeEnd } from "node:console";
import path from "node:path";
import { Eta } from ".";
import express from "express";

const app = express();
const PORT = 3000;
const eta = new Eta({ views: path.join(__dirname, "templates") });

app.get("/", async (req, res) => {
  const renderedTemplate = await eta.renderAsync("./simple", {
    name: `ASYNC CONTENT BELOW!



HI FROM ASYNC`,
  });

  // await eta.renderStringAsync("Hi <%= it.name %>", { name: "Ada Lovelace" })
  res.status(200).send(renderedTemplate);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
