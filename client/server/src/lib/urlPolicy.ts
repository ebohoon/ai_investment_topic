/**
 * 탐구 설계 JSON에 허용할 출처 URL 정책(모델 환각·비권장 도메인 완화).
 */

const BLOCKED_HOST_EXACT = new Set<string>([
  "dcinside.com",
  "www.dcinside.com",
  "m.dcinside.com",
]);

const DISALLOWED_HOST_SUBSTRINGS = ["localhost", "127.0.0.1", "example.com", "invalid"];

function isNamuWikiHost(host: string): boolean {
  return host === "namu.wiki" || host.endsWith(".namu.wiki");
}

/** null 이면 통과, 아니면 한국어 오류 메시지 */
export function urlOutputPolicyViolation(urlStr: string): string | null {
  const t = urlStr.trim();
  if (t.length === 0) return "URL이 비어 있습니다.";
  if (!t.startsWith("https://")) return "URL은 https로 시작해야 합니다.";
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return "올바른 URL 형식이 아닙니다.";
  }
  if (u.protocol !== "https:") return "URL은 https만 허용됩니다.";

  const host = u.hostname.toLowerCase();
  if (isNamuWikiHost(host) || BLOCKED_HOST_EXACT.has(host)) {
    return "이 도메인은 출처로 사용할 수 없습니다.";
  }
  for (const sub of DISALLOWED_HOST_SUBSTRINGS) {
    if (host.includes(sub)) return "허용되지 않는 도메인입니다.";
  }
  return null;
}
