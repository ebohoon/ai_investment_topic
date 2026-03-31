import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import "./App.css";
import {
  fetchExplorationDesign,
  fetchResearchQuestions,
  type ComparisonTable,
  type ExplorationDesign,
  type ExplorationPayload,
  type InitialAnalysisStep,
  type RecommendedSource,
} from "./api";
import {
  COURSE_CATEGORY_OPTIONS,
  getCourseNames,
  getMiddleSchoolCourseNames,
  isMiddleSchoolGrade,
  MIDDLE_SUBJECT_GROUP_KEYS,
  MIDDLE_SUBJECT_GROUP_LABELS,
  SUBJECT_GROUP_LABELS,
  SUBJECT_GROUP_KEYS,
  type CourseCategory,
  type MiddleSubjectGroupKey,
  type SubjectGroupKey,
} from "./curriculumData";
import {
  AI_USAGE_LEVELS,
  GOAL_LEVELS,
  INQUIRY_TYPES,
  OUTPUT_FORMATS,
  validateExplorationForm,
  validateExplorationStep1,
  validateExplorationStep2Full,
  validateExplorationStep3,
  type RecommendFormInput,
} from "./validateRecommendInput";

const MBTI_TYPES = [
  "INTJ",
  "INTP",
  "ENTJ",
  "ENTP",
  "INFJ",
  "INFP",
  "ENFJ",
  "ENFP",
  "ISTJ",
  "ISFJ",
  "ESTJ",
  "ESFJ",
  "ISTP",
  "ISFP",
  "ESTP",
  "ESFP",
] as const;

const MBTI_CUSTOM = "__custom__";

const SCHOOL_GRADES = ["중1", "중2", "중3", "고1", "고2", "고3"] as const;

const GRADE_LEVEL_OPTIONS = [
  { value: "상위권", label: "상위권" },
  { value: "중상위권", label: "중상위권" },
  { value: "중위권", label: "중위권" },
  { value: "중하위권", label: "중하위권" },
  { value: "하위권", label: "하위권" },
  { value: "비공개", label: "비공개" },
] as const;

const INQUIRY_STYLE_OPTIONS = [
  { value: "실험·관찰", label: "실험·관찰 중심" },
  { value: "설문·인터뷰", label: "설문·인터뷰" },
  { value: "데이터·코딩·분석", label: "데이터·코딩·분석" },
  { value: "독서·에세이·발표", label: "독서·에세이·발표" },
  { value: "사회이슈·정책 조사", label: "사회이슈·정책 조사" },
  { value: "상관없음", label: "특별히 없음" },
] as const;

const CONSTRAINT_PERIOD_OPTIONS = [
  { value: "1주 이내", label: "1주 이내" },
  { value: "2~4주", label: "2~4주" },
  { value: "한 학기 정도", label: "한 학기 정도" },
  { value: "일정 미정·여유 있음", label: "일정 미정·여유 있음" },
] as const;

const CONSTRAINT_PLACE_OPTIONS = [
  { value: "집·온라인 위주", label: "집·온라인 위주" },
  { value: "학교 교실", label: "학교 교실" },
  { value: "실험실·준비된 장소 가능", label: "실험실·준비된 장소 가능" },
  { value: "도서관·독서실 등", label: "도서관·독서실 등" },
  { value: "야외·지역사회", label: "야외·지역사회" },
] as const;

const CONSTRAINT_TEAM_OPTIONS = [
  { value: "혼자", label: "혼자" },
  { value: "2~3명", label: "2~3명" },
  { value: "모둠(4명 이상)", label: "모둠(4명 이상)" },
  { value: "교사와 사전 협의 필요", label: "교사와 사전 협의 필요" },
] as const;

const CONSTRAINT_BUDGET_OPTIONS = [
  { value: "추가 비용 없이", label: "추가 비용 없이" },
  { value: "집·학교 재료로 가능", label: "집·학교 재료로 가능" },
  { value: "소액(만 원 안팎)까지 가능", label: "소액(만 원 안팎)까지 가능" },
  { value: "비용·재료 제약 없음", label: "비용·재료 제약 없음" },
  { value: "잘 모르겠음", label: "잘 모르겠음" },
] as const;

const STEP_LABELS = [
  "교과·기본",
  "관심·조건",
  "탐구 유형",
  "탐구 질문",
  "탐구 설계",
] as const;


function logEvent(name: string, detail?: Record<string, string>) {
  if (import.meta.env.DEV) {
    console.info(`[aicc] ${name}`, detail ?? "");
  }
}

function copyTextWithExecCommand(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

const CLIPBOARD_WRITE_TIMEOUT_MS = 8000;

/** 클립보드 복사(Clipboard API 우선, 실패·타임아웃 시 execCommand) */
async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await Promise.race([
        navigator.clipboard.writeText(text),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error("clipboard timeout")), CLIPBOARD_WRITE_TIMEOUT_MS);
        }),
      ]);
      return true;
    } catch {
      // fall through
    }
  }
  return copyTextWithExecCommand(text);
}

const SOURCE_TYPE_LABEL: Record<RecommendedSource["sourceType"], string> = {
  youtube: "YouTube",
  paper_pdf: "논문/PDF",
  institution: "기관 자료",
  news: "기사",
};

/** 복사용: 탭 구분(엑셀·메모장에 붙여넣기 용이) */
function formatComparisonTableForCopy(t: ComparisonTable): string {
  const headerLine = t.columnHeaders.join("\t");
  const body = t.rows.map((r) => r.cells.join("\t")).join("\n");
  return [headerLine, body].join("\n");
}

const COMPARISON_PLACEHOLDER_DISPLAY =
  "※ 이 칸에는 비교 대상별로 측정·관찰·설문 결과를 한국어로 한 줄 이상 적습니다(가상 수치·임의 단정 금지).";

/** 서버와 동일 규칙: ---·___만 있는 칸은 읽을 수 있는 안내로 치환(구 응답·캐시 대비) */
function normalizeComparisonCellDisplay(cell: string): string {
  const t = cell.trim();
  if (t === "") return cell;
  if (/^(?:___|…|\.{3,})$/.test(t)) return COMPARISON_PLACEHOLDER_DISPLAY;
  if (/^[\-_]{2,}$/.test(t)) return COMPARISON_PLACEHOLDER_DISPLAY;
  if (/^=+$/.test(t)) return COMPARISON_PLACEHOLDER_DISPLAY;
  return cell;
}

function ComparisonTableView({ table }: { table: ComparisonTable }) {
  if (!table.columnHeaders.length || !table.rows.length) return null;
  return (
    <div className="design-comparison-table-wrap design-comparison-table-wrap--md">
      <table className="design-comparison-table-md">
        <thead>
          <tr>
            {table.columnHeaders.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.cells.map((c, ci) => (
                <td key={ci}>{normalizeComparisonCellDisplay(c)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function subjectChipClassName(subject: string): string {
  const key = subject.trim();
  const map: Record<string, string> = {
    국어: "chip-subject chip-subject--korean",
    수학: "chip-subject chip-subject--math",
    영어: "chip-subject chip-subject--english",
    "사회(한국사/통합사회)": "chip-subject chip-subject--social",
    "과학(통합과학/물화생지)": "chip-subject chip-subject--science",
    정보: "chip-subject chip-subject--info",
    미술: "chip-subject chip-subject--art",
    음악: "chip-subject chip-subject--music",
    체육: "chip-subject chip-subject--pe",
    "기술·가정": "chip-subject chip-subject--home",
  };
  if (map[key]) return map[key];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return `chip-subject chip-subject--alt${Math.abs(h) % 6}`;
}

function formatInitialAnalysisStepForCopy(
  s: InitialAnalysisStep,
  i: number,
  processKind: ExplorationDesign["initialAnalysisProcessKind"]
): string {
  const outLabel = processKind === "data_ai" ? "산출·수치" : "산출·근거";
  return [
    `${i + 1}. ${s.phase}`,
    `   절차: ${s.procedure}`,
    `   ${outLabel}: ${s.concreteOutput}`,
    `   한계·주의: ${s.caveat}`,
  ].join("\n");
}

function formatRecommendedSourceBlock(s: RecommendedSource, i: number): string {
  return [
    `  [${i + 1}] ${s.title} (${SOURCE_TYPE_LABEL[s.sourceType]})`,
    `  이 페이지 활용: ${s.howItHelps}`,
  ].join("\n");
}

function formatDesignBlock(d: ExplorationDesign): string {
  return [
    "【1】 탐구 한 줄 요약",
    `"${d.oneLineSummary}"`,
    "",
    "【1】 핵심 용어·탐구 범위",
    d.keyTermsDefinition,
    "",
    "【2】 핵심 탐구 질문",
    ...d.coreResearchQuestions.map((q, i) => `${i + 1}. ${q}`),
    "",
    "【3】 분석 프레임 (관점 3가지)",
    ...d.analysisFrames.map((f, i) => `${i + 1}. ${f}`),
    "",
    "【4】 탐구 방법",
    "· 데이터 수집: " + d.researchExecution.dataCollection,
    "· 분석: " + d.researchExecution.analysisMethod,
    "· 도구: " + d.researchExecution.tools,
    "· 시각화: " + d.researchExecution.visualization,
    "",
    "【5】 비교 구조 분석",
    d.comparisonStructure,
    "",
    "【5】 비교·대조표 초안",
    formatComparisonTableForCopy(d.comparisonTable),
    "",
    d.initialAnalysisProcessKind === "data_ai"
      ? "【6】 탐구 과정 단계별 실행 방안 (AI 업무 적용 프로세스 5단계)"
      : "【6】 탐구 과정 단계별 실행 방안 (과정중심 탐구 5단계)",
    ...d.initialAnalysisExamples.map((s, i) =>
      formatInitialAnalysisStepForCopy(s, i, d.initialAnalysisProcessKind)
    ),
    "",
    "【7】 기대 결과",
    ...d.expectedResults.map((line, i) => `${i + 1}. ${line}`),
    "",
    "【8】 확장 방향",
    ...d.extensionDirections.map((line, i) => `${i + 1}. ${line}`),
    "",
    "【9】 교과 연계",
    d.subjects.join(", "),
    "",
    "【10】 세특·생기부 문장 초안(참고)",
    `"${d.recordSentence}"`,
    "",
    "【11】 추천 참고 자료",
    ...d.recommendedSources.map((s, i) => formatRecommendedSourceBlock(s, i)),
  ].join("\n");
}

function formatDesignBlockWithSource(sourceQuestion: string, d: ExplorationDesign): string {
  return [`【선택한 탐구 질문】 "${sourceQuestion}"`, "", formatDesignBlock(d)].join("\n");
}

function formatAllDesignsBlock(sourceQuestions: string[], designs: ExplorationDesign[]): string {
  return designs
    .map((d, i) => {
      const q = sourceQuestions[i] ?? "";
      const block = formatDesignBlockWithSource(q, d);
      return `════════ ${i + 1}번 질문에 대한 탐구 설계 ════════\n\n${block}`;
    })
    .join("\n\n\n");
}

function DesignResultCard({
  design,
  index,
}: {
  design: ExplorationDesign;
  index: number;
}) {
  return (
    <article
      className="topic-card design-result-card design-result-card--item"
      aria-labelledby={`design-card-${index}-title`}
    >
      <div className="design-result-block design-result-block--lead">
        <p className="design-block-label">[1] 탐구 한 줄 요약</p>
        <h2 id={`design-card-${index}-title`} className="design-result-title">
          {`"${design.oneLineSummary}"`}
        </h2>
        <div className="design-key-terms-wrap">
          <p className="design-sub-label design-sub-label--keyterms">핵심 용어·탐구 범위</p>
          <p className="text-block design-key-terms">{design.keyTermsDefinition}</p>
        </div>
      </div>

      <div className="design-result-block section section--q2">
        <h3>[2] 핵심 탐구 질문</h3>
        <ol className="design-list design-list--numbered">
          {design.coreResearchQuestions.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ol>
      </div>

      <div className="design-result-block section">
        <h3>[3] 분석 프레임 (관점 3가지)</h3>
        <div className="design-analysis-frames" role="list">
          {design.analysisFrames.map((f, i) => (
            <div key={i} className="design-analysis-frame" role="listitem">
              <span className="design-analysis-frame__badge" aria-hidden>
                관점 {i + 1}
              </span>
              <p className="design-analysis-frame__text">{f}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="design-result-block section">
        <h3>[4] 탐구 방법</h3>
        <dl className="design-dl">
          <dt>데이터 수집</dt>
          <dd>{design.researchExecution.dataCollection}</dd>
          <dt>분석</dt>
          <dd>{design.researchExecution.analysisMethod}</dd>
          <dt>도구</dt>
          <dd>{design.researchExecution.tools}</dd>
          <dt>시각화</dt>
          <dd>{design.researchExecution.visualization}</dd>
        </dl>
      </div>

      <div className="design-result-block section">
        <h3>[5] 비교 구조 분석</h3>
        <p className="text-block">{design.comparisonStructure}</p>
        <p className="design-sub-label design-sub-label--spaced">비교·대조표 초안</p>
        <ComparisonTableView table={design.comparisonTable} />
      </div>

      <div className="design-result-block section">
        <h3>[6] 탐구 과정 단계별 실행 방안</h3>
        <ol className="design-analysis-example-list">
          {design.initialAnalysisExamples.map((step, i) => (
            <li key={i} className="design-analysis-example-step">
              <span className="design-analysis-example-phase">{step.phase}</span>
              <dl className="design-analysis-example-dl">
                <dt>절차</dt>
                <dd>{step.procedure}</dd>
                <dt>
                  {design.initialAnalysisProcessKind === "data_ai" ? "산출·수치" : "산출·근거"}
                </dt>
                <dd>{step.concreteOutput}</dd>
                <dt>한계·주의</dt>
                <dd>{step.caveat}</dd>
              </dl>
            </li>
          ))}
        </ol>
      </div>

      <div className="design-result-block section">
        <h3>[7] 기대 결과</h3>
        <ul className="design-outline-list">
          {design.expectedResults.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="design-result-block section">
        <h3>[8] 확장 방향</h3>
        <ul className="design-outline-list">
          {design.extensionDirections.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="design-result-block section">
        <h3>[9] 교과 연계</h3>
        <div className="chips chips--design-subjects">
          {design.subjects.map((s) => (
            <span key={s} className={subjectChipClassName(s)}>
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="design-result-block section">
        <h3>[10] 세특·생기부 문장 초안 (참고)</h3>
        <p className="text-block">"{design.recordSentence}"</p>
        <p className="field-hint" style={{ marginTop: "0.5rem" }}>
          * 실제 기재는 학교 기재요령·교사 관찰에 따릅니다.
        </p>
      </div>

      <div className="design-result-block section">
        <h3>[11] 추천 참고 자료</h3>
        <p className="field-hint design-link-disclaimer">
          ※ URL은 표시하지 않아요. 제목·유형·활용 설명을 보고 해당 기관·포털에서 검색해 보세요.
        </p>
        <ul className="design-source-list">
          {design.recommendedSources.map((s, i) => (
            <li key={i} className="design-source-item">
              <div className="design-source-item__head">
                <span className="design-source-item__type">{SOURCE_TYPE_LABEL[s.sourceType]}</span>
                <strong className="design-source-item__title">{s.title}</strong>
              </div>
              <p className="design-source-item__rationale-label">이 페이지 활용</p>
              <p className="design-source-item__rationale">{s.howItHelps}</p>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function IconSectionBasic() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
      <path d="M4 21v-1a7 7 0 0 1 14 0v1" strokeLinecap="round" />
    </svg>
  );
}

function IconSectionInterest() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z"
        strokeLinejoin="round"
      />
      <path d="M5 19h14" strokeLinecap="round" />
    </svg>
  );
}

function IconSectionConstraints() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
        strokeLinecap="round"
      />
      <path
        d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2Z"
        strokeLinejoin="round"
      />
      <path d="M9 12h6M9 16h4" strokeLinecap="round" />
    </svg>
  );
}

function IconSectionExperience() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      <path d="M8 7h8M8 11h6" strokeLinecap="round" />
    </svg>
  );
}

type ChoiceBtnProps = {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
};

function ChoiceBtn({ active, children, onClick }: ChoiceBtnProps) {
  return (
    <button
      type="button"
      className={`choice-btn${active ? " choice-btn--active" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function App() {
  const [step, setStep] = useState(1);

  const [selectedSubject, setSelectedSubject] = useState("");
  const [courseCategory, setCourseCategory] = useState("");
  const [courseName, setCourseName] = useState("");
  const [major, setMajor] = useState("");
  const [grade, setGrade] = useState("");

  const [k1, setK1] = useState("");
  const [k2, setK2] = useState("");
  const [k3, setK3] = useState("");
  const [interestTopicDetail, setInterestTopicDetail] = useState("");
  const [mbtiSelect, setMbtiSelect] = useState<string>("");
  const [mbtiCustom, setMbtiCustom] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [inquiryStyle, setInquiryStyle] = useState("");
  const [goalLevel, setGoalLevel] = useState("");
  const [outputFormat, setOutputFormat] = useState("");
  const [aiUsageLevel, setAiUsageLevel] = useState("");
  const [constraintPeriod, setConstraintPeriod] = useState("");
  const [constraintPlace, setConstraintPlace] = useState("");
  const [constraintTeam, setConstraintTeam] = useState("");
  const [constraintBudget, setConstraintBudget] = useState("");
  const [constraintsExtra, setConstraintsExtra] = useState("");
  const [perf, setPerf] = useState("");

  const [inquiryType, setInquiryType] = useState("");

  const [questions, setQuestions] = useState<string[] | null>(null);
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState<number | null>(null);
  const [designSourceQuestions, setDesignSourceQuestions] = useState<string[]>([]);
  const [designResults, setDesignResults] = useState<ExplorationDesign[]>([]);

  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [designLoading, setDesignLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const errorBannerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const mbtiResolved = useMemo(() => {
    if (mbtiSelect === MBTI_CUSTOM) return mbtiCustom;
    return mbtiSelect;
  }, [mbtiSelect, mbtiCustom]);

  const recommendLike: RecommendFormInput = useMemo(
    () => ({
      major,
      keywords: [k1.trim(), k2.trim(), k3.trim()] as [string, string, string],
      mbtiOrTrait: mbtiResolved,
      gradeLevel,
      performanceExperience: perf,
      constraintsExtra,
      interestTopicDetail,
    }),
    [major, k1, k2, k3, mbtiResolved, gradeLevel, perf, constraintsExtra, interestTopicDetail]
  );

  const isMiddleGrade = useMemo(() => isMiddleSchoolGrade(grade), [grade]);

  const subjectKeysForGrade = useMemo(() => {
    if (!grade.trim()) return [] as readonly string[];
    return isMiddleSchoolGrade(grade) ? MIDDLE_SUBJECT_GROUP_KEYS : SUBJECT_GROUP_KEYS;
  }, [grade]);

  const courseNameOptions = useMemo(() => {
    if (!grade.trim() || !selectedSubject || selectedSubject === "기타") return [];
    if (isMiddleGrade) {
      return getMiddleSchoolCourseNames(
        selectedSubject as Exclude<MiddleSubjectGroupKey, "기타">
      );
    }
    if (!courseCategory) return [];
    return getCourseNames(
      selectedSubject as Exclude<SubjectGroupKey, "기타">,
      courseCategory as CourseCategory
    );
  }, [grade, selectedSubject, courseCategory, isMiddleGrade]);

  /** STEP 2 관심 주제 상세 위 STEP 1 과목 요약 — 본문은 하이픈 구분 단계 */
  const step1CurriculumRecap = useMemo((): { lead: string; body: string } => {
    const g = grade.trim();
    if (!g) return { lead: "선택한 과목:", body: "(학년·교과 미선택)" };
    const parts: string[] = [g];
    if (!selectedSubject.trim()) {
      return { lead: "선택한 과목:", body: `${parts.join(" - ")} - 교과(군) 미선택` };
    }
    if (selectedSubject === "기타") {
      const t = courseName.trim();
      parts.push("기타");
      if (t) parts.push(t);
      return { lead: "선택한 과목:", body: parts.join(" - ") };
    }
    const subjLabel = isMiddleGrade
      ? MIDDLE_SUBJECT_GROUP_LABELS[selectedSubject as MiddleSubjectGroupKey]
      : SUBJECT_GROUP_LABELS[selectedSubject as SubjectGroupKey];
    parts.push(subjLabel);
    if (isMiddleGrade) {
      const cn = courseName.trim();
      if (cn) parts.push(cn);
      return { lead: "선택한 과목:", body: parts.join(" - ") };
    }
    const cat = courseCategory.trim();
    const cn = courseName.trim();
    if (cat) parts.push(cat);
    if (cn) parts.push(cn);
    return { lead: "선택한 과목:", body: parts.join(" - ") };
  }, [grade, selectedSubject, courseCategory, courseName, isMiddleGrade]);

  const explorationPayload = useCallback((): ExplorationPayload => {
    return {
      major: major.trim(),
      keywords: [k1.trim(), k2.trim(), k3.trim()] as [string, string, string],
      grade,
      mbtiOrTrait: mbtiResolved.trim(),
      gradeLevel: gradeLevel.trim(),
      performanceExperience: perf.trim() || undefined,
      inquiryStyle: inquiryStyle.trim(),
      constraintPeriod: constraintPeriod.trim(),
      constraintPlace: constraintPlace.trim(),
      constraintTeam: constraintTeam.trim(),
      constraintBudget: constraintBudget.trim(),
      constraintsExtra: constraintsExtra.trim() || undefined,
      interestTopicDetail: interestTopicDetail.trim() || undefined,
      selectedSubject,
      courseCategory:
        selectedSubject === "기타" || isMiddleGrade
          ? undefined
          : courseCategory.trim() || undefined,
      courseName: courseName.trim() || undefined,
      inquiryType,
      goalLevel,
      outputFormat,
      aiUsageLevel,
    };
  }, [
    major,
    k1,
    k2,
    k3,
    grade,
    isMiddleGrade,
    mbtiResolved,
    gradeLevel,
    perf,
    inquiryStyle,
    constraintPeriod,
    constraintPlace,
    constraintTeam,
    constraintBudget,
    constraintsExtra,
    interestTopicDetail,
    selectedSubject,
    courseCategory,
    courseName,
    inquiryType,
    goalLevel,
    outputFormat,
    aiUsageLevel,
  ]);

  const resetFlow = useCallback(() => {
    setStep(1);
    setQuestions(null);
    setSelectedQuestionIdx(null);
    setDesignSourceQuestions([]);
    setDesignResults([]);
    setInterestTopicDetail("");
    setError(null);
  }, []);

  useLayoutEffect(() => {
    if (!error) return;
    const el = errorBannerRef.current;
    if (!el) return;

    const scrollToBanner = () => {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      try {
        el.focus({ preventScroll: true });
      } catch {
        el.focus();
      }
    };

    scrollToBanner();
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(scrollToBanner);
    });
    const t = window.setTimeout(scrollToBanner, 80);
    return () => {
      cancelAnimationFrame(raf1);
      window.clearTimeout(t);
    };
  }, [error]);

  useEffect(() => {
    if (step !== 5 || designResults.length === 0) return;
    const el = resultsRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.focus();
    });
  }, [step, designResults.length]);

  const validateFullExploration = useCallback((): string | null => {
    return validateExplorationForm({
      ...recommendLike,
      grade,
      inquiryStyle,
      constraintPeriod,
      constraintPlace,
      constraintTeam,
      constraintBudget,
      selectedSubject,
      courseCategory,
      courseName,
      inquiryType,
      goalLevel,
      outputFormat,
      aiUsageLevel,
    });
  }, [
    recommendLike,
    grade,
    inquiryStyle,
    constraintPeriod,
    constraintPlace,
    constraintTeam,
    constraintBudget,
    selectedSubject,
    courseCategory,
    courseName,
    inquiryType,
    goalLevel,
    outputFormat,
    aiUsageLevel,
  ]);

  const goNext = () => {
    setError(null);
    if (step === 1) {
      const err = validateExplorationStep1({
        selectedSubject,
        courseCategory,
        courseName,
        major,
        grade,
      });
      if (err) {
        setError(err);
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const err = validateExplorationStep2Full({
        ...recommendLike,
        inquiryStyle,
        constraintPeriod,
        constraintPlace,
        constraintTeam,
        constraintBudget,
        goalLevel,
        outputFormat,
        aiUsageLevel,
      });
      if (err) {
        setError(err);
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      const err = validateExplorationStep3(inquiryType);
      if (err) {
        setError(err);
        return;
      }
      setStep(4);
    }
  };

  const goBack = () => {
    setError(null);
    if (step <= 1) return;
    if (step === 4) {
      setQuestions(null);
      setSelectedQuestionIdx(null);
    }
    if (step === 5) {
      setDesignResults([]);
      setDesignSourceQuestions([]);
    }
    setStep((s) => Math.max(1, s - 1));
  };

  const onGenerateQuestions = async () => {
    setError(null);
    const err = validateFullExploration();
    if (err) {
      setError(err);
      return;
    }
    setQuestionsLoading(true);
    setQuestions(null);
    setSelectedQuestionIdx(null);
    logEvent("questions_click");
    try {
      const data = await fetchResearchQuestions(explorationPayload());
      setQuestions(data.questions);
      logEvent("questions_ok", { count: String(data.questions.length) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      setError(msg);
      logEvent("questions_error", { message: msg });
    } finally {
      setQuestionsLoading(false);
    }
  };

  const toggleQuestionPick = useCallback((idx: number) => {
    setSelectedQuestionIdx((prev) => (prev === idx ? null : idx));
  }, []);

  const onGenerateDesign = async () => {
    if (!questions?.length) {
      setError("먼저 탐구 질문을 생성하세요.");
      return;
    }
    if (selectedQuestionIdx === null) {
      setError("탐구 질문을 1개 선택하세요.");
      return;
    }
    const one = questions[selectedQuestionIdx]?.trim();
    if (!one) {
      setError("탐구 질문을 1개 선택하세요.");
      return;
    }
    const pickedTexts = [one];
    setError(null);
    const err = validateFullExploration();
    if (err) {
      setError(err);
      return;
    }
    setDesignLoading(true);
    logEvent("design_click", { picks: String(pickedTexts.length) });
    try {
      const data = await fetchExplorationDesign({
        ...explorationPayload(),
        selectedQuestions: pickedTexts,
      });
      if (data.designs.length !== pickedTexts.length) {
        throw new Error("서버 응답과 선택한 질문 수가 맞지 않습니다. 다시 시도해 주세요.");
      }
      setDesignSourceQuestions(pickedTexts);
      setDesignResults(data.designs);
      setStep(5);
      logEvent("design_ok", { count: String(data.designs.length) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      setError(msg);
      logEvent("design_error", { message: msg });
    } finally {
      setDesignLoading(false);
    }
  };

  const loadingOverlay = questionsLoading || designLoading;

  /** 생성 경과: 0 기본 → 30초 → 60초 → 90초 → 120초(별도 문구) */
  const [loadingHintLevel, setLoadingHintLevel] = useState<0 | 1 | 2 | 3 | 4>(0);
  useEffect(() => {
    if (!loadingOverlay) {
      setLoadingHintLevel(0);
      return;
    }
    setLoadingHintLevel(0);
    const id30 = window.setTimeout(() => setLoadingHintLevel(1), 30000);
    const id60 = window.setTimeout(() => setLoadingHintLevel(2), 60000);
    const id90 = window.setTimeout(() => setLoadingHintLevel(3), 90000);
    const id120 = window.setTimeout(() => setLoadingHintLevel(4), 120000);
    return () => {
      window.clearTimeout(id30);
      window.clearTimeout(id60);
      window.clearTimeout(id90);
      window.clearTimeout(id120);
    };
  }, [loadingOverlay]);

  const showCopyFeedback = useCallback((msg: string) => {
    setCopyFeedback(msg);
    window.setTimeout(() => setCopyFeedback(null), 3200);
  }, []);

  const keywordPlaceholders = ["예: 뇌과학", "예: 데이터", "예: 사회문제"];

  return (
    <div className="app">
      <header className="app-topbar">
        <img src="/aicc-logo.png" alt="AICC" className="app-logo" width={120} height={48} />
        <div className="app-brand">
          <h1 className="app-brand__title">AI 탐구 주제 설계 도구</h1>
          <p className="app-brand__subtitle">2028 대입·고교학점제에 맞춰 교과·질문·탐구 설계를 단계적으로 안내합니다.</p>
        </div>
      </header>

      <nav className="step-wizard" aria-label="진행 단계">
        <ol className="step-wizard__list">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const done = step > n;
            const current = step === n;
            return (
              <li key={label} className={`step-wizard__item${current ? " step-wizard__item--current" : ""}${done ? " step-wizard__item--done" : ""}`}>
                <span className="step-wizard__num" aria-hidden>
                  {done ? "✓" : n}
                </span>
                <span className="step-wizard__label">{label}</span>
              </li>
            );
          })}
        </ol>
      </nav>

      <section className="alert alert--info info-guide" role="note" aria-labelledby="usage-guide-title">
        <div className="info-guide__head">
          <span className="info-guide__icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </span>
          <p id="usage-guide-title" className="info-guide__title">
            이용 안내
          </p>
        </div>
        <p className="info-guide__lead">
          <strong>
            본 서비스는 교과 기반 탐구·수행 계획을 설계할 때 참고하는 도구입니다. 입시 합격이나 내신 등급을 보장하지 않습니다.
          </strong>
        </p>
        <ul className="info-guide__list">
          <li>단계마다 교과·유형·목표 수준을 고르면, 질문 후보와 최종 설계의 깊이가 달라집니다.</li>
          <li>세특·생기부 문장은 참고 초안입니다. 실제 기재는 학교생활기록부 기재요령과 담임교사 관찰을 따릅니다.</li>
          <li>허위 작성이나 AI 결과를 검토 없이 제출하는 것은 수행평가·AI 활용 지침에 맞지 않을 수 있습니다.</li>
        </ul>
      </section>

      {error && (
        <div
          id="form-error-banner"
          ref={errorBannerRef}
          tabIndex={-1}
          role="alert"
          aria-live="assertive"
          className="alert alert--error"
        >
          {error}
        </div>
      )}

      <div className="form-stack-wrap">
        <div className={`form-stack ${loadingOverlay ? "form-stack--loading" : ""}`}>
          {step === 1 && (
            <section className="form-section" aria-labelledby="sec-s1">
              <div className="section-head">
                <span className="section-icon">
                  <IconSectionBasic />
                </span>
                <div>
                  <h2 id="sec-s1">STEP 1 — 교과·기본 정보</h2>
                  <p className="section-desc">
                    먼저 현재 학년과 희망 전공을 고른 뒤, 설계받고 싶은 교과(군)와 과목을 선택합니다.
                  </p>
                </div>
              </div>
              <div className="form-grid cols-2">
                <div className="field">
                  <label className="field-label" htmlFor="grade">
                    현재 학년
                    <span className="badge-req">필수</span>
                  </label>
                  <select
                    id="grade"
                    className="text-like input-base"
                    value={grade}
                    onChange={(e) => {
                      const g = e.target.value;
                      const wasMiddle = isMiddleSchoolGrade(grade);
                      const nowMiddle = isMiddleSchoolGrade(g);
                      setGrade(g);
                      if (!g || wasMiddle !== nowMiddle) {
                        setSelectedSubject("");
                        setCourseCategory("");
                        setCourseName("");
                      }
                    }}
                  >
                    <option value="">선택</option>
                    {SCHOOL_GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="major">
                    희망 전공
                    <span className="badge-req">필수</span>
                  </label>
                  <input
                    id="major"
                    className="input-base"
                    type="text"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    placeholder="컴퓨터공학, 심리학 등"
                    maxLength={200}
                    autoComplete="off"
                  />
                </div>

                <div className="field field--full">
                  <label className="field-label" htmlFor="subject">
                    교과(군)
                    <span className="badge-req">필수</span>
                  </label>
                  <select
                    id="subject"
                    className="text-like input-base"
                    value={selectedSubject}
                    disabled={!grade.trim()}
                    onChange={(e) => {
                      setSelectedSubject(e.target.value);
                      setCourseCategory("");
                      setCourseName("");
                    }}
                  >
                    <option value="">
                      {grade.trim() ? "교과(군)을 선택하세요" : "먼저 학년을 선택하세요"}
                    </option>
                    {subjectKeysForGrade.map((s) => (
                      <option key={s} value={s}>
                        {isMiddleGrade
                          ? MIDDLE_SUBJECT_GROUP_LABELS[s as MiddleSubjectGroupKey]
                          : SUBJECT_GROUP_LABELS[s as SubjectGroupKey]}
                      </option>
                    ))}
                  </select>
                  <span className="field-hint">
                    {!grade.trim()
                      ? "학년을 선택하면 중학교·고등학교에 맞는 교과(군) 목록이 표시됩니다."
                      : isMiddleGrade
                        ? "중학교 과정: 교과(군)별로 정해진 과목명 중에서 선택합니다."
                        : "고등학교: 국·수·영·사·과·정보·기타. 기타는 예체능·융합 등 직접 입력합니다."}
                  </span>
                </div>

                {selectedSubject && selectedSubject !== "기타" && isMiddleGrade && (
                  <div className="field field--full">
                    <label className="field-label" htmlFor="course-name-ms">
                      과목명
                      <span className="badge-req">필수</span>
                    </label>
                    <select
                      id="course-name-ms"
                      className="text-like input-base"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                    >
                      <option value="">과목명 선택</option>
                      {courseNameOptions.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <span className="field-hint">학교 개설 명칭이 다르면 가장 가까운 항목을 고르세요.</span>
                  </div>
                )}

                {selectedSubject && selectedSubject !== "기타" && !isMiddleGrade && (
                  <>
                    <div className="field field--full">
                      <label className="field-label" htmlFor="course-category">
                        과목 분류
                        <span className="badge-req">필수</span>
                      </label>
                      <select
                        id="course-category"
                        className="text-like input-base"
                        value={courseCategory}
                        onChange={(e) => {
                          setCourseCategory(e.target.value);
                          setCourseName("");
                        }}
                      >
                        <option value="">공통·일반·진로·융합 중 선택</option>
                        {COURSE_CATEGORY_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field field--full">
                      <label className="field-label" htmlFor="course-name">
                        과목명
                        <span className="badge-req">필수</span>
                      </label>
                      <select
                        id="course-name"
                        className="text-like input-base"
                        value={courseName}
                        onChange={(e) => setCourseName(e.target.value)}
                        disabled={!courseCategory}
                      >
                        <option value="">과목명 선택</option>
                        {courseNameOptions.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <span className="field-hint">
                        학교 개설 과목명이 다르면 가장 가까운 항목을 선택하세요.
                      </span>
                    </div>
                  </>
                )}

                {selectedSubject === "기타" && (
                  <div className="field field--full">
                    <label className="field-label" htmlFor="course-name-other">
                      세부 교과·과목명
                      <span className="badge-req">필수</span>
                    </label>
                    <input
                      id="course-name-other"
                      className="input-base"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      placeholder="예: 미술, 음악, 체육, 융합 교과 등"
                      maxLength={100}
                      autoComplete="off"
                    />
                  </div>
                )}
              </div>
            </section>
          )}

          {step === 2 && (
            <>
              <section className="form-section" aria-labelledby="sec-s2a">
                <div className="section-head">
                  <span className="section-icon">
                    <IconSectionInterest />
                  </span>
                  <div>
                    <h2 id="sec-s2a">STEP 2 — 관심·성향·AI 활용</h2>
                    <p className="section-desc">키워드와 목표 깊이, 결과 형태를 정하면 이후 질문과 설계가 구체화됩니다.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label className="field-label">
                      관심 키워드 3개
                      <span className="badge-req">필수</span>
                    </label>
                    <span className="field-hint" style={{ marginTop: 0 }}>
                      각 칸마다 1글자 이상, 짧은 키워드로 입력하세요.
                    </span>
                    <div className="keyword-tags">
                      <div className="tag-field">
                        <span className="tag-hash" aria-hidden>
                          #
                        </span>
                        <input
                          type="text"
                          value={k1}
                          onChange={(e) => setK1(e.target.value)}
                          placeholder={keywordPlaceholders[0]}
                          maxLength={80}
                          autoComplete="off"
                          aria-label="관심 키워드 1"
                        />
                      </div>
                      <div className="tag-field">
                        <span className="tag-hash" aria-hidden>
                          #
                        </span>
                        <input
                          type="text"
                          value={k2}
                          onChange={(e) => setK2(e.target.value)}
                          placeholder={keywordPlaceholders[1]}
                          maxLength={80}
                          autoComplete="off"
                          aria-label="관심 키워드 2"
                        />
                      </div>
                      <div className="tag-field">
                        <span className="tag-hash" aria-hidden>
                          #
                        </span>
                        <input
                          type="text"
                          value={k3}
                          onChange={(e) => setK3(e.target.value)}
                          placeholder={keywordPlaceholders[2]}
                          maxLength={80}
                          autoComplete="off"
                          aria-label="관심 키워드 3"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="field field--full">
                    <label className="field-label" htmlFor="interestTopicDetail">
                      관심 주제 상세
                      <span className="badge-opt">선택</span>
                    </label>
                    <span className="field-hint" style={{ marginTop: 0, marginBottom: "0.45rem" }}>
                      구체적으로 관심 분야·궁금한 점·하고 싶은 탐구 방향을 적어 주세요. 만약 탐구하고 싶은 교과연계
                      아이디어가 있다면 서술해 주세요.
                    </span>
                    <div className="step1-curriculum-recap-wrap">
                      <p className="step1-curriculum-recap__kicker">STEP 1 참고</p>
                      <p
                        className="step1-curriculum-recap"
                        aria-label={`${step1CurriculumRecap.lead} ${step1CurriculumRecap.body}`}
                      >
                        <strong className="step1-curriculum-recap__lead">{step1CurriculumRecap.lead}</strong>{" "}
                        <span className="step1-curriculum-recap__body">{step1CurriculumRecap.body}</span>
                      </p>
                    </div>
                    <textarea
                      id="interestTopicDetail"
                      className="input-base"
                      value={interestTopicDetail}
                      onChange={(e) => setInterestTopicDetail(e.target.value)}
                      placeholder="예: 뇌과학과 학습 집중의 관계를 알아보고 싶고, 학교 도서관에서 찾을 수 있는 대중도서와 논문 요약 위주로 시작하려고 합니다."
                      maxLength={800}
                      rows={4}
                      autoComplete="off"
                    />
                  </div>
                  <div className="form-grid cols-2">
                    <div className="field">
                      <label className="field-label" htmlFor="mbti">
                        MBTI / 성향
                        <span className="badge-req">필수</span>
                      </label>
                      <select
                        id="mbti"
                        className="text-like input-base"
                        value={mbtiSelect}
                        onChange={(e) => setMbtiSelect(e.target.value)}
                      >
                        <option value="">MBTI·성향을 선택하세요</option>
                        {MBTI_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                        <option value={MBTI_CUSTOM}>기타 (직접 입력)</option>
                      </select>
                      {mbtiSelect === MBTI_CUSTOM && (
                        <input
                          className="input-base"
                          style={{ marginTop: "0.55rem" }}
                          type="text"
                          value={mbtiCustom}
                          onChange={(e) => setMbtiCustom(e.target.value)}
                          placeholder="예: 계획형, 사람 중심"
                          maxLength={100}
                          autoComplete="off"
                        />
                      )}
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="gradeLevel">
                        내신 수준
                        <span className="badge-req">필수</span>
                      </label>
                      <select
                        id="gradeLevel"
                        className="text-like input-base"
                        value={gradeLevel}
                        onChange={(e) => setGradeLevel(e.target.value)}
                      >
                        <option value="">내신 수준을 선택하세요</option>
                        {GRADE_LEVEL_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="field field--full">
                    <label className="field-label" htmlFor="inquiryStyle">
                      희망 탐구 방식
                      <span className="badge-req">필수</span>
                    </label>
                    <select
                      id="inquiryStyle"
                      className="text-like input-base"
                      value={inquiryStyle}
                      onChange={(e) => setInquiryStyle(e.target.value)}
                    >
                      <option value="">희망 탐구 방식을 선택하세요</option>
                      {INQUIRY_STYLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field field--full">
                    <span className="field-label">
                      탐구 목표 수준
                      <span className="badge-req">필수</span>
                    </span>
                    <div className="choice-grid" role="group" aria-label="탐구 목표 수준">
                      {GOAL_LEVELS.map((g) => (
                        <ChoiceBtn
                          key={g}
                          active={goalLevel === g}
                          onClick={() => setGoalLevel(goalLevel === g ? "" : g)}
                        >
                          {g}
                        </ChoiceBtn>
                      ))}
                    </div>
                  </div>
                  <div className="field field--full">
                    <span className="field-label">
                      결과 형태
                      <span className="badge-req">필수</span>
                    </span>
                    <div className="choice-grid" role="group" aria-label="결과 형태">
                      {OUTPUT_FORMATS.map((f) => (
                        <ChoiceBtn
                          key={f}
                          active={outputFormat === f}
                          onClick={() => setOutputFormat(outputFormat === f ? "" : f)}
                        >
                          {f}
                        </ChoiceBtn>
                      ))}
                    </div>
                  </div>
                  <div className="field field--full">
                    <span className="field-label">
                      AI 활용 수준
                      <span className="badge-req">필수</span>
                    </span>
                    <div className="choice-grid choice-grid--ai" role="group" aria-label="AI 활용 수준">
                      {AI_USAGE_LEVELS.map((a) => (
                        <ChoiceBtn
                          key={a}
                          active={aiUsageLevel === a}
                          onClick={() => setAiUsageLevel(aiUsageLevel === a ? "" : a)}
                        >
                          {a}
                        </ChoiceBtn>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="form-section" aria-labelledby="sec-s2b">
                <div className="section-head">
                  <span className="section-icon">
                    <IconSectionConstraints />
                  </span>
                  <div>
                    <h2 id="sec-s2b">탐구 조건</h2>
                    <p className="section-desc">기간·장소·진행·비용을 정하면 탐구안이 수행 환경에 맞게 제안됩니다.</p>
                  </div>
                </div>
                <div className="constraint-blocks">
                  <div className="field field--full">
                    <span className="field-label">
                      기간
                      <span className="badge-req">필수</span>
                    </span>
                    <div className="choice-grid choice-grid--dense">
                      {CONSTRAINT_PERIOD_OPTIONS.map((o) => (
                        <ChoiceBtn
                          key={o.value}
                          active={constraintPeriod === o.value}
                          onClick={() =>
                            setConstraintPeriod(constraintPeriod === o.value ? "" : o.value)
                          }
                        >
                          {o.label}
                        </ChoiceBtn>
                      ))}
                    </div>
                  </div>
                  <div className="field field--full">
                    <span className="field-label">
                      장소·환경
                      <span className="badge-req">필수</span>
                    </span>
                    <div className="choice-grid choice-grid--dense">
                      {CONSTRAINT_PLACE_OPTIONS.map((o) => (
                        <ChoiceBtn
                          key={o.value}
                          active={constraintPlace === o.value}
                          onClick={() =>
                            setConstraintPlace(constraintPlace === o.value ? "" : o.value)
                          }
                        >
                          {o.label}
                        </ChoiceBtn>
                      ))}
                    </div>
                  </div>
                  <div className="field field--full">
                    <span className="field-label">
                      진행 방식
                      <span className="badge-req">필수</span>
                    </span>
                    <div className="choice-grid choice-grid--dense">
                      {CONSTRAINT_TEAM_OPTIONS.map((o) => (
                        <ChoiceBtn
                          key={o.value}
                          active={constraintTeam === o.value}
                          onClick={() =>
                            setConstraintTeam(constraintTeam === o.value ? "" : o.value)
                          }
                        >
                          {o.label}
                        </ChoiceBtn>
                      ))}
                    </div>
                  </div>
                  <div className="field field--full">
                    <span className="field-label">
                      비용·재료
                      <span className="badge-req">필수</span>
                    </span>
                    <div className="choice-grid choice-grid--dense">
                      {CONSTRAINT_BUDGET_OPTIONS.map((o) => (
                        <ChoiceBtn
                          key={o.value}
                          active={constraintBudget === o.value}
                          onClick={() =>
                            setConstraintBudget(constraintBudget === o.value ? "" : o.value)
                          }
                        >
                          {o.label}
                        </ChoiceBtn>
                      ))}
                    </div>
                  </div>
                  <div className="field field--full">
                    <label className="field-label" htmlFor="constraintsExtra">
                      기타 한 줄
                      <span className="badge-opt">선택</span>
                    </label>
                    <input
                      id="constraintsExtra"
                      className="input-base"
                      type="text"
                      value={constraintsExtra}
                      onChange={(e) => setConstraintsExtra(e.target.value)}
                      placeholder="예: 주말만 가능"
                      maxLength={120}
                      autoComplete="off"
                    />
                  </div>
                </div>
              </section>

              <section className="form-section" aria-labelledby="sec-s2c">
                <div className="section-head">
                  <span className="section-icon">
                    <IconSectionExperience />
                  </span>
                  <div>
                    <h2 id="sec-s2c">경험</h2>
                    <p className="section-desc">
                      이전 수행·탐구 경험이 있으면 적어 주세요. 없으면 비워 두어도 됩니다.
                    </p>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="perf">
                    수행평가·탐구 경험
                    <span className="badge-opt">선택</span>
                  </label>
                  <textarea
                    id="perf"
                    className="input-base"
                    value={perf}
                    onChange={(e) => setPerf(e.target.value)}
                    placeholder="비워 두거나 5글자 이상, 예: 과학 수행에서 실험 설계·보고서 작성 등"
                    maxLength={500}
                    rows={3}
                  />
                </div>
              </section>
            </>
          )}

          {step === 3 && (
            <section className="form-section" aria-labelledby="sec-s3">
              <div className="section-head">
                <span className="section-icon">
                  <IconSectionInterest />
                </span>
                <div>
                  <h2 id="sec-s3">STEP 3 — 탐구 유형</h2>
                  <p className="section-desc">같은 교과라도 유형에 따라 질문과 설계 결과가 달라집니다.</p>
                </div>
              </div>
              <div className="choice-grid choice-grid--types" role="group" aria-label="탐구 유형">
                {INQUIRY_TYPES.map((t) => (
                  <ChoiceBtn
                    key={t}
                    active={inquiryType === t}
                    onClick={() => setInquiryType(inquiryType === t ? "" : t)}
                  >
                    {t}
                  </ChoiceBtn>
                ))}
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="form-section" aria-labelledby="sec-s4">
              <div className="section-head">
                <span className="section-icon">
                  <IconSectionBasic />
                </span>
                <div>
                  <h2 id="sec-s4">STEP 4 — 탐구 질문 생성·선택</h2>
                  <p className="section-desc">
                    여러 후보 탐구 질문 중 가장 적합하다고 판단되는 1개를 선택하면, 해당 질문을 기반으로 탐구 활동 설계가 생성됩니다.
                  </p>
                </div>
              </div>
              {(!questions || questions.length === 0) && (
                <div className="step4-actions">
                  <button type="button" className="btn-cta btn-cta--secondary" onClick={onGenerateQuestions} disabled={questionsLoading}>
                    {questionsLoading ? "질문 생성 중…" : "탐구 질문 3~5개 생성"}
                  </button>
                </div>
              )}
              {questions && questions.length > 0 && (
                <>
                  <p className="step4-pick-count" aria-live="polite">
                    {selectedQuestionIdx === null
                      ? "질문을 하나 선택하세요."
                      : "선택한 질문이 적용됩니다. 다른 질문을 고르면 선택이 바뀝니다."}
                  </p>
                  <ul className="question-card-list">
                    {questions.map((q, idx) => {
                      const picked = selectedQuestionIdx === idx;
                      return (
                        <li key={idx}>
                          <article className={`question-card${picked ? " question-card--selected" : ""}`}>
                            <p className="question-card__text">"{q}"</p>
                            <button
                              type="button"
                              className={picked ? "btn-pick btn-pick--active" : "btn-pick"}
                              aria-pressed={picked}
                              onClick={() => toggleQuestionPick(idx)}
                            >
                              {picked ? "선택 해제" : "선택하기"}
                            </button>
                          </article>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
              {questions && (
                <div className="step4-actions step4-actions--bottom">
                  <button
                    type="button"
                    className="btn-cta"
                    onClick={onGenerateDesign}
                    disabled={designLoading || selectedQuestionIdx === null}
                  >
                    {designLoading ? "설계 생성 중…" : "선택한 질문으로 탐구 설계 생성"}
                  </button>
                </div>
              )}
            </section>
          )}

          {step === 5 && designResults.length > 0 && (
            <div
              ref={resultsRef}
              tabIndex={-1}
              className="results-block"
              aria-label="탐구 설계 결과"
            >
              <h2 className="results-title">STEP 5 — 탐구 설계 결과</h2>
              {designSourceQuestions.length > 0 && (
                <div className="selected-questions-summary" aria-labelledby="picked-questions-title">
                  <h3 id="picked-questions-title" className="selected-questions-summary__label">
                    선택한 탐구 질문
                  </h3>
                  <div className="selected-questions-picked">
                    {designSourceQuestions.map((q, i) => (
                      <p key={i} className="selected-questions-picked__text">
                        <span className="selected-questions-picked__quote">"{q}"</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
              <div className="design-results-stack">
                {designResults.map((d, i) => (
                  <DesignResultCard key={i} design={d} index={i} />
                ))}
              </div>
              <div className="copy-all-wrap copy-all-wrap--results-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={async () => {
                    try {
                      const text = formatAllDesignsBlock(designSourceQuestions, designResults);
                      const ok = await copyText(text);
                      logEvent("copy", { section: "전체" });
                      showCopyFeedback(
                        ok
                          ? "복사되었습니다."
                          : "복사에 실패했습니다. 브라우저 권한을 확인하세요."
                      );
                    } catch (e) {
                      console.error(e);
                      showCopyFeedback("복사 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
                    }
                  }}
                >
                  전체 설계 복사
                </button>
                <button type="button" className="btn-secondary" onClick={resetFlow}>
                  처음부터 다시
                </button>
              </div>
            </div>
          )}

          {step < 5 && (
            <div className={`wizard-nav${step === 1 ? " wizard-nav--first" : ""}`}>
              {step > 1 && (
                <button type="button" className="btn-secondary btn-wizard-back" onClick={goBack}>
                  이전
                </button>
              )}
              {step < 4 && (
                <button type="button" className="btn-cta btn-cta--nav" onClick={goNext}>
                  다음 단계
                </button>
              )}
            </div>
          )}
        </div>

        {loadingOverlay && (
          <div className="form-loading-overlay" role="status" aria-live="polite" aria-label="생성 중">
            <div className="form-loading-inner">
              <span className="form-loading-spinner" aria-hidden />
              <p className="form-loading-text">
                {designLoading ? "탐구 설계를 작성하는 중입니다…" : "탐구 질문을 만드는 중입니다…"}
              </p>
              <p
                className={
                  loadingHintLevel >= 1
                    ? `form-loading-hint form-loading-hint--slow${
                        loadingHintLevel >= 2 ? " form-loading-hint--very-slow" : ""
                      }${loadingHintLevel >= 3 ? " form-loading-hint--extra-slow" : ""}${
                        loadingHintLevel >= 4 ? " form-loading-hint--long-wait" : ""
                      }`
                    : "form-loading-hint"
                }
              >
                {loadingHintLevel === 0 && <>보통 수십 초 이내에 완료됩니다.</>}
                {loadingHintLevel === 1 &&
                  (designLoading ? (
                    <>1분 이상 걸릴 수 있습니다. 이 창을 닫지 마세요.</>
                  ) : (
                    <>조금 오래 걸릴 수 있습니다. 잠시만 기다려 주세요.</>
                  ))}
                {loadingHintLevel === 2 &&
                  (designLoading
                    ? "더 알찬 설계를 위해 시간이 조금 오래 걸릴 수 있어요. 창을 닫지 마세요."
                    : "더 나은 질문 후보를 다듬는 데 시간이 걸릴 수 있습니다. 잠시만 더 기다려 주세요.")}
                {loadingHintLevel === 3 &&
                  (designLoading
                    ? "세부 항목을 꼼꼼히 채우는 중이에요. 창을 닫지 마세요."
                    : "질문을 다듬는 마무리 단계예요. 잠시만 기다려 주세요.")}
                {loadingHintLevel >= 4 &&
                  (designLoading
                    ? "거의 마무리 단계예요. 창을 닫지 말고 조금만 더 기다려 주세요."
                    : "질문 후보를 정리하는 마지막 단계예요. 잠시만 기다려 주세요.")}
              </p>
            </div>
          </div>
        )}
      </div>

      {copyFeedback && (
        <div className="copy-toast" role="status" aria-live="polite">
          {copyFeedback}
        </div>
      )}
    </div>
  );
}
