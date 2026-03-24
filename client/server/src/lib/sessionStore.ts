import { MongoClient } from "mongodb";
import { readRuntimeEnv } from "./runtimeEnv.js";

const g = globalThis as typeof globalThis & {
  __aicc_mongo?: MongoClient | null;
};

async function getClient(): Promise<MongoClient | null> {
  const uri = readRuntimeEnv("MONGODB_URI");
  if (!uri) return null;

  if (g.__aicc_mongo) {
    return g.__aicc_mongo;
  }

  const next = new MongoClient(uri);
  await next.connect();
  g.__aicc_mongo = next;
  return g.__aicc_mongo;
}

export async function saveGeneratedSession(payload: {
  input: unknown;
  allowedSubjects: string[];
  topics: unknown;
}): Promise<void> {
  try {
    const c = await getClient();
    if (!c) return;
    const dbName = readRuntimeEnv("MONGODB_DB") ?? "aicc";
    const collName = readRuntimeEnv("MONGODB_COLLECTION") ?? "generated_sessions";
    await c.db(dbName).collection(collName).insertOne({
      createdAt: new Date(),
      ...payload,
    });
  } catch (e) {
    console.error("[sessionStore] MongoDB 저장 실패:", e);
  }
}
