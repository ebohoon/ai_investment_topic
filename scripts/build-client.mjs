import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const clientDir = join(repoRoot, "client");

if (!existsSync(join(clientDir, "package.json"))) {
  console.error(
    "\n[build-client] client/package.json 을 찾을 수 없습니다.\n" +
      "Vercel Project Settings → Root Directory 가 비어 있어야 합니다(저장소 루트).\n" +
      "Root Directory 를 client 로 두면 이 스크립트도 실패합니다.\n"
  );
  process.exit(1);
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npm, ["run", "build"], {
  cwd: clientDir,
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

process.exit(result.status === null ? 1 : result.status);
