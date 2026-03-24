/**
 * OpenAI Chat Completions `response_format: json_schema` (strict) 용 스키마.
 * `allowedSubjects`는 런타임 교과 후보와 동일해야 subjects 검증이 일치합니다.
 */
export function buildRecommendResponseJsonSchema(allowedSubjects: string[]) {
  const subjectEnum =
    allowedSubjects.length > 0
      ? [...new Set(allowedSubjects)]
      : ["국어", "수학", "정보"];

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      topics: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string", minLength: 5 },
            subjects: {
              type: "array",
              minItems: 2,
              maxItems: 5,
              items: {
                type: "string",
                enum: subjectEnum,
              },
            },
            methods: {
              type: "array",
              minItems: 4,
              maxItems: 10,
              items: { type: "string", minLength: 3 },
            },
            deliverables: {
              type: "array",
              minItems: 1,
              maxItems: 5,
              items: { type: "string", minLength: 2 },
            },
            recordSentence: {
              type: "string",
              minLength: 20,
              maxLength: 600,
            },
          },
          required: [
            "title",
            "subjects",
            "methods",
            "deliverables",
            "recordSentence",
          ],
        },
      },
    },
    required: ["topics"],
  };
}
