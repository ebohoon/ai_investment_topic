/**
 * 생성 API catch 블록에서 사용자에게 보여 줄 문구·상태 코드.
 * API 키·스택은 노출하지 않음.
 */
export function mapGenerationFailure(raw: string): { status: number; error: string } {
  if (raw.includes("OPENAI_API_KEY")) {
    return { status: 503, error: raw };
  }
  if (/401|incorrect api key|invalid api key|authentication/i.test(raw)) {
    return {
      status: 503,
      error:
        "OpenAI API 키가 거절되었습니다. Vercel(또는 로컬) 환경 변수 OPENAI_API_KEY를 확인한 뒤 재배포해 주세요.",
    };
  }
  if (/rate limit|429|too many requests/i.test(raw)) {
    return { status: 503, error: "요청이 많아 잠시 후 다시 시도해 주세요." };
  }
  if (/ETIMEDOUT|ECONNRESET|socket hang up|timed out|timeout|TIMEOUT|504|Gateway/i.test(raw)) {
    return {
      status: 504,
      error:
        "연결 시간이 초과되었습니다. 잠시 후 다시 시도하거나, 한 번에 선택한 질문 수를 줄여 보세요.",
    };
  }
  if (/maximum context|context length|token limit|too many tokens/i.test(raw)) {
    return {
      status: 413,
      error: "처리 용량 한도에 걸렸습니다. 입력을 줄이거나 나중에 다시 시도해 주세요.",
    };
  }
  if (/모델 JSON 파싱|JSON 파싱|Unexpected token|parse error/i.test(raw)) {
    return {
      status: 502,
      error: "AI 응답을 해석하지 못했습니다. 같은 버튼으로 다시 시도해 주세요.",
    };
  }
  if (/invalid_json_schema|response_format|json_schema/i.test(raw)) {
    return {
      status: 502,
      error: "AI 응답 형식 오류입니다. 잠시 후 다시 시도해 주세요.",
    };
  }
  if (
    /Too (small|big)|String must|Array must|Expected|Invalid enum|Invalid input/i.test(raw) ||
    /(recommendedSources|initialAnalysisExamples|howItHelps|comparisonTable)\./i.test(
      raw
    )
  ) {
    const tail = raw.length > 220 ? `${raw.slice(0, 217)}…` : raw;
    return {
      status: 502,
      error: `생성 결과가 형식 검증에 맞지 않았습니다. 다시 시도해 주세요. (${tail})`,
    };
  }

  const short = raw.length > 160 ? `${raw.slice(0, 157)}…` : raw;
  if (short !== "서버 오류" && short.length > 3) {
    return {
      status: 500,
      error: `일시적으로 생성에 실패했습니다. (${short})`,
    };
  }

  return {
    status: 500,
    error: "일시적으로 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  };
}
