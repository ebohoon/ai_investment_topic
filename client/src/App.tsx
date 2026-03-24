import { useCallback, useState, type FormEvent } from "react";
import "./App.css";
import {
  fetchRecommendations,
  type RecommendApiResponse,
  type TopicCard,
} from "./api";
import { validateRecommendForm } from "./validateRecommendInput";

function logEvent(name: string, detail?: Record<string, string>) {
  if (import.meta.env.DEV) {
    console.info(`[aicc] ${name}`, detail ?? "");
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function formatTopicBlock(t: TopicCard, index: number): string {
  const lines = [
    `【주제 ${index + 1}】 ${t.title}`,
    "",
    "교과 연계: " + t.subjects.join(", "),
    "",
    "탐구 방법:",
    ...t.methods.map((m, i) => `${i + 1}. ${m}`),
    "",
    "결과물: " + t.deliverables.join(", "),
    "",
    "생기부 문장: " + t.recordSentence,
  ];
  return lines.join("\n");
}

export default function App() {
  const [major, setMajor] = useState("");
  const [k1, setK1] = useState("");
  const [k2, setK2] = useState("");
  const [k3, setK3] = useState("");
  const [grade, setGrade] = useState("고1");
  const [mbti, setMbti] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [perf, setPerf] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendApiResponse | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const onCopy = useCallback(
    async (label: string, text: string) => {
      const ok = await copyText(text);
      logEvent("copy", { section: label });
      showToast(ok ? "복사했습니다." : "복사에 실패했습니다. 브라우저 권한을 확인하세요.");
    },
    [showToast]
  );

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    const keywords = [k1.trim(), k2.trim(), k3.trim()] as [string, string, string];
    const clientErr = validateRecommendForm({
      major,
      keywords,
      mbtiOrTrait: mbti,
      gradeLevel,
      performanceExperience: perf,
    });
    if (clientErr) {
      setError(clientErr);
      return;
    }
    logEvent("generate_click");
    setLoading(true);
    try {
      const data = await fetchRecommendations({
        major: major.trim(),
        keywords,
        grade,
        mbtiOrTrait: mbti.trim() || undefined,
        gradeLevel: gradeLevel.trim() || undefined,
        performanceExperience: perf.trim() || undefined,
      });
      setResult(data);
      logEvent("generate_ok", { count: String(data.topics.length) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "알 수 없는 오류";
      setError(msg);
      logEvent("generate_error", { message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>AICC AI 탐구 주제 추천</h1>
        <p>
          교과 연계 탐구 주제·실행 단계·결과물·생기부 문장 초안을 한 번에 설계합니다.
        </p>
      </header>

      {toast && (
        <div className="error-banner" style={{ borderColor: "var(--success)" }}>
          {toast}
        </div>
      )}

      <form className="form-card" onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="field">
            희망 전공 <span className="hint">필수</span>
            <input
              type="text"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              placeholder="예: 컴퓨터공학, 의학, 경영학"
              maxLength={200}
              autoComplete="off"
            />
          </label>
          <label className="field">
            현재 학년 <span className="hint">필수</span>
            <select value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="중3">중3</option>
              <option value="고1">고1</option>
              <option value="고2">고2</option>
            </select>
          </label>
        </div>

        <div className="form-grid" style={{ marginTop: "1rem" }}>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            관심 분야 키워드 3개 <span className="hint">각각 짧게</span>
            <div className="keyword-row">
              <input
                type="text"
                value={k1}
                onChange={(e) => setK1(e.target.value)}
                placeholder="키워드 1"
                maxLength={80}
              />
              <input
                type="text"
                value={k2}
                onChange={(e) => setK2(e.target.value)}
                placeholder="키워드 2"
                maxLength={80}
              />
              <input
                type="text"
                value={k3}
                onChange={(e) => setK3(e.target.value)}
                placeholder="키워드 3"
                maxLength={80}
              />
            </div>
          </label>
        </div>

        <div className="form-grid cols-2" style={{ marginTop: "1rem" }}>
          <label className="field">
            MBTI / 성향 <span className="hint">선택</span>
            <input
              type="text"
              value={mbti}
              onChange={(e) => setMbti(e.target.value)}
              placeholder="예: INTP, 계획형"
              maxLength={100}
            />
          </label>
          <label className="field">
            내신 수준 <span className="hint">선택·자기평가</span>
            <input
              type="text"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              placeholder="예: 상위권 / 중위권"
              maxLength={100}
            />
          </label>
        </div>

        <label className="field" style={{ marginTop: "1rem" }}>
          수행평가·탐구 경험 <span className="hint">선택</span>
          <textarea
            value={perf}
            onChange={(e) => setPerf(e.target.value)}
            placeholder="예: 과학 수행으로 실험 보고서 작성 경험"
            maxLength={500}
          />
        </label>

        <div className="actions">
          <button type="submit" className="primary" disabled={loading}>
            {loading ? "생성 중…" : "탐구 주제 생성"}
          </button>
        </div>
      </form>

      {error && <div className="error-banner">{error}</div>}

      {result && (
        <>
          <p className="sr-only" aria-live="polite">
            결과 {result.topics.length}개가 생성되었습니다.
          </p>
          <div className="meta-chips">
            <span>교과 후보 엔진 반영</span>
            {result.allowedSubjects.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>

          <div className="actions" style={{ marginBottom: "1rem" }}>
            <button
              type="button"
              className="ghost"
              onClick={() =>
                onCopy(
                  "전체",
                  result.topics.map((t, i) => formatTopicBlock(t, i)).join("\n\n---\n\n")
                )
              }
            >
              전체 결과 복사
            </button>
          </div>

          {result.topics.map((t, idx) => (
            <article key={idx} className="topic-card">
              <h2>
                주제 {idx + 1}. {t.title}
              </h2>

              <div className="section">
                <h3>교과 연계</h3>
                <div className="chips">
                  {t.subjects.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
                <div className="copy-row">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => onCopy("교과", t.subjects.join(", "))}
                  >
                    교과만 복사
                  </button>
                </div>
              </div>

              <div className="section">
                <h3>탐구 방법</h3>
                <ul>
                  {t.methods.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
                <div className="copy-row">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() =>
                      onCopy(
                        "탐구방법",
                        t.methods.map((m, i) => `${i + 1}. ${m}`).join("\n")
                      )
                    }
                  >
                    단계 복사
                  </button>
                </div>
              </div>

              <div className="section">
                <h3>결과물 형태</h3>
                <div className="chips">
                  {t.deliverables.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div className="copy-row">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => onCopy("결과물", t.deliverables.join(", "))}
                  >
                    결과물 복사
                  </button>
                </div>
              </div>

              <div className="section">
                <h3>생기부 문장 초안</h3>
                <p className="text-block">{t.recordSentence}</p>
                <div className="copy-row">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => onCopy("생기부", t.recordSentence)}
                  >
                    생기부 문장 복사
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => onCopy(`주제카드${idx + 1}`, formatTopicBlock(t, idx))}
                  >
                    이 카드 전체 복사
                  </button>
                </div>
              </div>
            </article>
          ))}
        </>
      )}
    </div>
  );
}
