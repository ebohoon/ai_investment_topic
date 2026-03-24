import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runDesign } from "../../server/src/handlers/designHandler.js";

export const config = {
  /** 선택 질문마다 별도 생성하므로 최대 5회 호출까지 고려 */
  maxDuration: 120,
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
