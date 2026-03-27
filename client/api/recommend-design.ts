import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runDesign } from "../server/src/handlers/designHandler.js";

export const config = {
  /** Pro: 최대 300s. 탐구 설계(대형 JSON) + OpenAI 지연 시 120s를 넘길 수 있음 */
  maxDuration: 300,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const out = await runDesign(req.body);
  return res.status(out.status).json(out.body);
}
