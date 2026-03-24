import "dotenv/config";
import cors from "cors";
import express from "express";
import { recommendRouter } from "./routes/recommend.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors({ origin: true }));
app.use(express.json({ limit: "64kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", recommendRouter);

app.listen(PORT, () => {
  console.log(`AICC server http://127.0.0.1:${PORT}`);
});
