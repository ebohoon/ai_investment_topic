import { Router } from "express";
import { runDesign } from "../handlers/designHandler.js";
import { runQuestions } from "../handlers/questionsHandler.js";
import { runRecommend } from "../handlers/recommendHandler.js";

export const recommendRouter = Router();

recommendRouter.post("/recommend", async (req, res) => {
  const out = await runRecommend(req.body);
  res.status(out.status).json(out.body);
});

recommendRouter.post("/recommend/questions", async (req, res) => {
  const out = await runQuestions(req.body);
  res.status(out.status).json(out.body);
});

recommendRouter.post("/recommend/design", async (req, res) => {
  const out = await runDesign(req.body);
  res.status(out.status).json(out.body);
});

/** Vercel 평면 API 경로와 동일 (로컬 프록시 호환) */
recommendRouter.post("/recommend-questions", async (req, res) => {
  const out = await runQuestions(req.body);
  res.status(out.status).json(out.body);
});

recommendRouter.post("/recommend-design", async (req, res) => {
  const out = await runDesign(req.body);
  res.status(out.status).json(out.body);
});
