// index.json 검사 — PR 마다 CI 가 돌린다 (.github/workflows/check.yml). 로컬에서는 `node scripts/check.mjs`.
//
// 보는 것:
//   (1) JSON 이 {items: [...]} 인가  (2) 항목마다 id·repo·tag·name 모양  (3) id·이름이 목록 안에서 하나뿐인가
//   (4) id·이름이 앱의 공식 플러그인(앱 저장소 plugins-official/)과 겹치지 않는가 — 공식 id 는 예약이다
//   (5) 이미 등록된 id 의 repo 가 바뀌지 않았는가 — id 는 처음 등록한 저장소에 묶인다 (남이 같은 id 로 가로채지 못하게)
//   (6) 그 태그의 저장소 루트에 plugin.json 이 있고 그 id 가 항목의 id 와 같은가
// 안 보는 것: 플러그인 코드. 목록은 주소만 맡는다.
// 규칙 (1)(2)(4) 는 앱의 backend/plugins.py (ID_RE·REPO_RE·TAG_RE·remote_items·_catalog) 와 같아야 한다 —
// 여기서 통과한 항목을 앱이 버리면 안 된다. (5) 는 앱의 「출처가 같을 때만 업데이트」 와 짝이다.
import { readFileSync } from "node:fs";

const ID_RE = /^[a-z0-9][a-z0-9_-]*$/;
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const TAG_RE = /^[A-Za-z0-9_.-]+$/;
const APP_REPO = "mrm987/PeroPix3";
const APP_BRANCH = "master";
const BASE_INDEX = "https://raw.githubusercontent.com/mrm987/peropix-plugins/main/index.json";

const errors = [];
const warns = [];
const fail = (msg) => errors.push(msg);
const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

async function getJson(url) {
  const r = await fetch(url, { headers: { "User-Agent": "peropix-plugins-check" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

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

// (1)(2)(3) 모양과 중복
const seenId = new Map();
const seenName = new Map();
const checks = [];
items.forEach((it, i) => {
  const where = `items[${i}]`;
  if (!it || typeof it !== "object") return fail(`${where}: 객체가 아닙니다`);
  const id = String(it.id ?? "");
  if (!ID_RE.test(id)) return fail(`${where}: id 「${id}」 — 소문자·숫자·-·_ 만, 첫 글자는 소문자나 숫자`);
  if (seenId.has(id)) fail(`${where}: id 「${id}」 가 items[${seenId.get(id)}] 에 이미 있습니다`);
  seenId.set(id, i);
  const name = typeof it.name === "string" ? it.name.trim() : "";
  if (!name) fail(`${where} (${id}): name 이 비었습니다`);
  else if (seenName.has(norm(name))) fail(`${where} (${id}): 이름 「${name}」 이 items[${seenName.get(norm(name))}] 과 같습니다`);
  else seenName.set(norm(name), i);
  const repo = String(it.repo ?? ""), tag = String(it.tag ?? "");
  if (repo || tag) {
    if (!REPO_RE.test(repo)) return fail(`${where} (${id}): repo 는 "owner/repo" 꼴이어야 합니다 (받은 값: 「${repo}」)`);
    if (!TAG_RE.test(tag)) return fail(`${where} (${id}): tag 「${tag}」 — 글자·숫자·.·-·_ 만`);
    checks.push({ id, name, repo, tag, where });
  } else if (typeof it.zip === "string" && /^https:\/\//.test(it.zip)) {
    // zip 주소 항목 — 받아 보지는 않는다 (크기를 모른다). 모양만 본다.
  } else {
    fail(`${where} (${id}): repo+tag 또는 zip 주소가 있어야 합니다`);
  }
});

// (4) 공식 플러그인과의 충돌 — 앱 저장소의 plugins-official/ 폴더 이름과 각 plugin.json 의 name
try {
  const dirs = (await getJson(`https://api.github.com/repos/${APP_REPO}/contents/plugins-official?ref=${APP_BRANCH}`))
    .filter((e) => e.type === "dir" && ID_RE.test(e.name));
  const official = new Map();
  for (const d of dirs) {
    let name = "";
    try {
      name = String((await getJson(`https://raw.githubusercontent.com/${APP_REPO}/${APP_BRANCH}/plugins-official/${d.name}/plugin.json`)).name ?? "");
    } catch { /* 이름을 못 읽어도 id 예약은 본다 */ }
    official.set(d.name, name);
  }
  const officialNames = new Set([...official.values()].map(norm).filter(Boolean));
  items.forEach((it, i) => {
    if (!it || typeof it !== "object") return;
    const id = String(it.id ?? "");
    if (official.has(id)) fail(`items[${i}]: id 「${id}」 는 공식 플러그인의 id 라 쓸 수 없습니다`);
    const n = norm(it.name);
    if (n && officialNames.has(n)) fail(`items[${i}] (${id}): 이름 「${it.name}」 은 공식 플러그인의 이름이라 쓸 수 없습니다`);
  });
} catch (e) {
  warns.push(`공식 플러그인 목록을 못 받아 (4) 를 건너뜁니다: ${e.message}`);
}

// (5) 이미 등록된 id 의 repo 가 바뀌지 않았는가 (main 의 index.json 과 대조)
try {
  const base = await getJson(BASE_INDEX);
  const before = new Map((Array.isArray(base?.items) ? base.items : []).filter((x) => x?.id && x?.repo).map((x) => [String(x.id), String(x.repo)]));
  for (const c of checks) {
    const prev = before.get(c.id);
    if (prev && prev !== c.repo) fail(`${c.where} (${c.id}): 이 id 는 「${prev}」 가 등록한 것입니다. 저장소를 바꾸려면 원래 제작자가 PR 을 내야 합니다`);
  }
} catch (e) {
  warns.push(`main 의 index.json 을 못 받아 (5) 를 건너뜁니다: ${e.message}`);
}

// (6) 태그의 plugin.json
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

for (const w of warns) console.warn(`! ${w}`);
if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${items.length}개 항목 통과 (저장소 확인 ${checks.length}개)`);
