// index.json 검사 — PR 마다 CI 가 돌린다 (.github/workflows/check.yml). 로컬에서는 `node scripts/check.mjs`.
//
// 보는 것: (1) JSON 이 {items: [...]} 인가 (2) 항목마다 id·repo·tag 모양 (3) id 가 목록 안에서 하나뿐인가
//          (4) 그 태그의 저장소 루트에 plugin.json 이 있고 그 id 가 항목의 id 와 같은가.
// 안 보는 것: 플러그인 코드. 목록은 주소만 맡는다.
// 규칙은 앱의 backend/plugins.py (ID_RE·REPO_RE·TAG_RE·remote_items) 와 같아야 한다 — 여기서 통과한 항목을 앱이 버리면 안 된다.
import { readFileSync } from "node:fs";

const ID_RE = /^[a-z0-9][a-z0-9_-]*$/;
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const TAG_RE = /^[A-Za-z0-9_.-]+$/;

const errors = [];
const fail = (msg) => errors.push(msg);

let data;
try {
  data = JSON.parse(readFileSync(new URL("../index.json", import.meta.url), "utf8"));
} catch (e) {
  console.error(`index.json 을 못 읽습니다: ${e.message}`);
  process.exit(1);
}
const items = Array.isArray(data?.items) ? data.items : null;
if (!items) {
  console.error('index.json 은 { "items": [ ... ] } 꼴이어야 합니다');
  process.exit(1);
}

const seen = new Set();
const checks = [];
items.forEach((it, i) => {
  const where = `items[${i}]`;
  if (!it || typeof it !== "object") return fail(`${where}: 객체가 아닙니다`);
  const id = String(it.id ?? "");
  if (!ID_RE.test(id)) return fail(`${where}: id 「${id}」 — 소문자·숫자·-·_ 만, 첫 글자는 소문자나 숫자`);
  if (seen.has(id)) fail(`${where}: id 「${id}」 가 목록에 두 번 있습니다`);
  seen.add(id);
  if (typeof it.name !== "string" || !it.name.trim()) fail(`${where} (${id}): name 이 비었습니다`);
  const repo = String(it.repo ?? ""), tag = String(it.tag ?? "");
  if (repo || tag) {
    if (!REPO_RE.test(repo)) return fail(`${where} (${id}): repo 는 "owner/repo" 꼴이어야 합니다 (받은 값: 「${repo}」)`);
    if (!TAG_RE.test(tag)) return fail(`${where} (${id}): tag 「${tag}」 — 글자·숫자·.·-·_ 만`);
    checks.push({ id, repo, tag, where });
  } else if (typeof it.zip === "string" && /^https:\/\//.test(it.zip)) {
    // zip 주소 항목 — 받아 보지는 않는다 (크기를 모른다). 모양만 본다.
  } else {
    fail(`${where} (${id}): repo+tag 또는 zip 주소가 있어야 합니다`);
  }
});

for (const c of checks) {
  const url = `https://raw.githubusercontent.com/${c.repo}/${c.tag}/plugin.json`;
  let text;
  try {
    const r = await fetch(url);
    if (!r.ok) { fail(`${c.where} (${c.id}): ${url} → HTTP ${r.status} (태그에 plugin.json 이 저장소 루트에 있어야 합니다)`); continue; }
    text = await r.text();
  } catch (e) {
    fail(`${c.where} (${c.id}): ${url} 을 못 받았습니다: ${e.message}`); continue;
  }
  let m;
  try { m = JSON.parse(text); } catch { fail(`${c.where} (${c.id}): 그 태그의 plugin.json 이 JSON 이 아닙니다`); continue; }
  if (!m || typeof m !== "object") { fail(`${c.where} (${c.id}): plugin.json 은 객체여야 합니다`); continue; }
  if (String(m.id ?? "") !== c.id) fail(`${c.where}: 목록의 id 「${c.id}」 와 plugin.json 의 id 「${m.id}」 가 다릅니다`);
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${items.length}개 항목 통과 (저장소 확인 ${checks.length}개)`);
