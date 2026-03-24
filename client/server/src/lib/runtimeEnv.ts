/**
 * Vercel 등 번들러가 `process.env.OPENAI_API_KEY` 같은 정적 참조를
 * 빌드 시점 값으로 치환해 런타임 환경 변수가 무시되는 경우가 있어,
 * 동적 키로 읽습니다.
 */
export function readRuntimeEnv(key: string): string | undefined {
  const v = process.env[key];
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}
