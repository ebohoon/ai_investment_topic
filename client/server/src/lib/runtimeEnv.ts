/**
 * 환경 변수 읽기.
 * - 프론트(Vite) 번들에서는 정적 `process.env.XXX` 치환을 피하려 동적 키를 쓰는 편이 안전할 수 있음.
 * - Vercel 서버리스(@vercel/node)에서는 `process.env[key]` 동적 인덱스가 번들 과정에서 비는 사례가 있어,
 *   자주 쓰는 키는 명시적 프로퍼티(`process.env.OPENAI_API_KEY`)로도 읽습니다.
 */
function explicitEnv(key: string): string | undefined {
  switch (key) {
    case "OPENAI_API_KEY":
      return process.env.OPENAI_API_KEY;
    case "OPENAI_MODEL":
      return process.env.OPENAI_MODEL;
    case "MONGODB_URI":
      return process.env.MONGODB_URI;
    case "MONGODB_DB":
      return process.env.MONGODB_DB;
    case "MONGODB_COLLECTION":
      return process.env.MONGODB_COLLECTION;
    case "PORT":
      return process.env.PORT;
    case "ALLOWED_ORIGINS":
      return process.env.ALLOWED_ORIGINS;
    default:
      return undefined;
  }
}

export function readRuntimeEnv(key: string): string | undefined {
  const raw = explicitEnv(key) ?? process.env[key];
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  return t.length > 0 ? t : undefined;
}
