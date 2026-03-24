import "./loadEnv.js";
import cors from "cors";
import type { CorsOptions } from "cors";
import express from "express";
import { recommendRouter } from "./routes/recommend.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions: CorsOptions =
  allowedOrigins.length > 0
    ? {
        origin(origin, callback) {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
          }
          callback(null, false);
        },
      }
    : { origin: true };

app.use(cors(corsOptions));
app.use(express.json({ limit: "64kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", recommendRouter);

app.listen(PORT, () => {
  console.log(`AICC server http://127.0.0.1:${PORT}`);
});
