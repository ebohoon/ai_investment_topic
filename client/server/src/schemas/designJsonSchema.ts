/**
 * OpenAI Chat Completions `response_format: json_schema` (strict) — 단일 탐구 설계.
 */
export function buildExplorationDesignJsonSchema(allowedSubjects: string[]) {
  const subjectEnum =
    allowedSubjects.length > 0
      ? [...new Set(allowedSubjects)]
      : ["국어", "수학", "정보"];

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string", minLength: 5 },
      researchQuestion: { type: "string", minLength: 8, maxLength: 400 },
      overview: { type: "string", minLength: 30, maxLength: 2500 },
      methodSteps: {
        type: "array",
        minItems: 4,
        maxItems: 12,
        items: { type: "string", minLength: 3 },
      },
      expectedResults: { type: "string", minLength: 20, maxLength: 2000 },
      extensionDirections: { type: "string", minLength: 15, maxLength: 1500 },
      subjects: {
        type: "array",
        minItems: 2,
        maxItems: 5,
        items: {
          type: "string",
          enum: subjectEnum,
        },
      },
      recordSentence: { type: "string", minLength: 20, maxLength: 600 },
      aiEthicsNote: { type: "string", minLength: 30, maxLength: 800 },
      processChecklist: {
        type: "array",
        minItems: 3,
        maxItems: 8,
        items: { type: "string", minLength: 3 },
      },
    },
    required: [
      "title",
      "researchQuestion",
      "overview",
      "methodSteps",
      "expectedResults",
      "extensionDirections",
      "subjects",
      "recordSentence",
      "aiEthicsNote",
      "processChecklist",
    ],
  };
}
