#!/usr/bin/env node
// 목록에 오른 플러그인의 코드에서 **사람이 볼 자리**를 찾아 목록으로 남긴다.
//
// ★★**합격 도장이 아니다.** 여기서 걸리는 것에는 정당한 쓰임이 많고(우리 「태그 굴리기」도 duckdb 를 쓴다),
//   걸리지 않는다고 안전한 것도 아니다. 이 스크립트가 하는 일은 **읽을 곳을 좁혀 주는 것** 하나다.
//   그래서 **무엇이 걸려도 실패로 끝내지 않는다** (exit 0). 판단은 병합하는 사람이 한다.
// ★검사 자체(항목 모양·태그의 plugin.json)는 `check.mjs` 가 한다. 여기는 코드만 본다.
//
// 쓰기: node scripts/scan.mjs            (index.json 의 모든 항목)
//       node scripts/scan.mjs tag-roll   (id 하나만)

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const only = process.argv[2] || "";

/** 눈에 띄면 사람이 그 줄을 읽어야 하는 것들. 이름은 **무엇이 걱정인지**로 짓는다. */
const RULES = [
  { why: "다른 프로그램을 띄운다", re: /\b(subprocess|os\.system|os\.popen|child_process|execFileSync|spawnSync)\b/ },
  { why: "문자열을 코드로 실행한다", re: /\b(eval|exec|compile)\s*\(|new\s+Function\s*\(|__import__\s*\(/ },
  { why: "직렬화된 객체를 되살린다 (임의 코드 실행 통로)", re: /\b(pickle|dill|marshal)\.loads?\s*\(/ },
  { why: "난독화 흔적", re: /\batob\s*\(|base64\.b64decode|(?:\\x[0-9a-fA-F]{2}){8,}/ },
  { why: "설치 중에 무언가를 깐다", re: /\bpip\s+install\b|\bnpm\s+i(nstall)?\b/ },
  { why: "바깥과 통신한다", re: /https?:\/\/(?!localhost|127\.0\.0\.1)[a-z0-9.-]+/i },
];

const EXT = new Set([".py", ".js", ".mjs", ".cjs", ".ts", ".html", ".json", ".sh", ".bat", ".ps1"]);
const SKIP_DIR = new Set([".git", "node_modules", "_lib", "_data", "__pycache__"]);
/** 함께 담아 온 남의 라이브러리는 건너뛴다 — 제작자가 쓴 코드만 본다 */
const VENDOR = /(^|\/)(lib|libs|vendor|third_party|dist)\//;

function walk(dir, base = dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, base, out);
    else if (EXT.has(path.extname(name))) out.push(path.relative(base, full).replace(/\\/g, "/"));
  }
  return out;
}

function scan(dir) {
  const hits = [];
  for (const rel of walk(dir)) {
    if (VENDOR.test(rel)) continue;
    const lines = readFileSync(path.join(dir, rel), "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      if (line.length > 2000) return;                  // 압축된 한 줄짜리 파일은 건너뛴다
      for (const r of RULES) {
        // 매니페스트의 `homepage` 는 적으라고 둔 칸이다 — 거기까지 「바깥과 통신한다」로 세면 잡음만 는다
        if (rel === "plugin.json" && r.why.startsWith("바깥")) continue;
        const m = r.re.exec(line);
        if (m) hits.push({ rel, line: i + 1, why: r.why, text: line.trim().slice(0, 120) });
      }
    });
  }
  return hits;
}

const items = JSON.parse(readFileSync(path.join(ROOT, "index.json"), "utf8")).items ?? [];
let looked = 0;

for (const it of items) {
  const id = String(it.id ?? "");
  if (only && id !== only) continue;
  if (!it.repo || !it.tag) { console.log(`· ${id}: zip 항목이라 건너뜁니다`); continue; }
  const tmp = mkdtempSync(path.join(tmpdir(), "scan-"));
  try {
    const url = `https://codeload.github.com/${it.repo}/tar.gz/refs/tags/${it.tag}`;
    // ★경로는 **상대**로 준다 (`cwd`) — 윈도우의 MSYS tar 는 `C:\…` 를 원격 호스트로 읽어 실패한다
    execFileSync("curl", ["-sSL", url, "-o", "src.tgz"], { cwd: tmp });
    execFileSync("tar", ["-xzf", "src.tgz", "--strip-components=1"], { cwd: tmp });
    rmSync(path.join(tmp, "src.tgz"));
    const hits = scan(tmp);
    looked++;
    console.log(`\n## ${id} (${it.repo}@${it.tag}) — 볼 곳 ${hits.length}개`);
    const byWhy = new Map();
    for (const h of hits) (byWhy.get(h.why) ?? byWhy.set(h.why, []).get(h.why)).push(h);
    for (const [why, list] of byWhy) {
      console.log(`\n  ${why} (${list.length})`);
      for (const h of list.slice(0, 12)) console.log(`    ${h.rel}:${h.line}  ${h.text}`);
      if (list.length > 12) console.log(`    … ${list.length - 12}개 더`);
    }
    if (!hits.length) console.log("  (걸린 것 없음 — 안전하다는 뜻은 아닙니다)");
  } catch (e) {
    console.log(`\n## ${id}: 받지 못했습니다 — ${e.message}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

console.log(`\n훑은 플러그인 ${looked}개. ★이 목록은 합격·불합격이 아니라 **읽을 자리**입니다.`);
