import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** 항상 `client/server/.env` (패키지 루트) 기준 — npm 워크스페이스 실행 위치와 무관 */
const envPath = path.join(__dirname, "..", ".env");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (process.env.NODE_ENV !== "production") {
  console.warn(
    "[aicc] client/server/.env 파일이 없습니다. 루트의 .env.example 을 참고해 client/server/.env 를 만들고 OPENAI_API_KEY 를 넣으세요."
  );
}
