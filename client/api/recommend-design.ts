import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runDesign } from "../server/src/handlers/designHandler.js";

// Vercel Pro: 최대 300s (vercel.json·아래 config와 맞출 것)
export const config = {
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
