import { Router } from "express";
import { runRecommend } from "../handlers/recommendHandler.js";

export const recommendRouter = Router();

recommendRouter.post("/recommend", async (req, res) => {
  const out = await runRecommend(req.body);
  res.status(out.status).json(out.body);
});
