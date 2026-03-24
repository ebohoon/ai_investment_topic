/** OpenAI `response_format: json_schema` (strict) — 탐구 질문 후보 */
export function buildQuestionsResponseJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      questions: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "string",
          minLength: 10,
          maxLength: 400,
        },
      },
    },
    required: ["questions"],
  };
}
