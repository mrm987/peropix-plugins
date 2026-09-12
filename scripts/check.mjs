// index.json 검사 — PR 마다 CI 가 돌린다 (.github/workflows/check.yml). 로컬에서는 `node scripts/check.mjs`.
//
// 보는 것:
//   (1) JSON 이 {items: [...]} 인가  (2) 항목마다 id·repo·tag·name 모양 (name 은 문자열 또는 언어별 묶음)  (3) id·이름이 목록 안에서 하나뿐인가
//   (4) 「공식」 표식(official: true)을 PR 로 새로 붙이려 하지 않는가 — 그 표식은 목록 주인만 붙인다
//   (5) 이미 등록된 id 의 repo 가 바뀌지 않았는가 — id 는 처음 등록한 저장소에 묶인다 (남이 같은 id 로 가로채지 못하게)
//   (6) 그 태그의 저장소 루트에 plugin.json 이 있고 그 id 가 항목의 id 와 같은가
// 안 보는 것: 플러그인 코드. 목록은 주소만 맡는다.
// 규칙 (1)(2) 는 앱의 backend/plugins.py (ID_RE·REPO_RE·TAG_RE·remote_items) 와 같아야 한다 —
// 여기서 통과한 항목을 앱이 버리면 안 된다. (5) 는 앱의 「출처가 같을 때만 업데이트」 와 짝이다.
import { readFileSync } from "node:fs";

const ID_RE = /^[a-z0-9][a-z0-9_-]*$/;
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const TAG_RE = /^[A-Za-z0-9_.-]+$/;
const BASE_INDEX = "https://raw.githubusercontent.com/mrm987/peropix-plugins/main/index.json";
//: PR 로 온 것인가 — GitHub Actions 가 넣어 준다. PR 에서는 「공식」 표식을 새로 붙일 수 없다 (검사 4)
const IS_PR = process.env.GITHUB_EVENT_NAME === "pull_request";

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
  // ★이름·설명은 문자열 하나여도 되고 **언어별 묶음**(`{ko,en,ja}`)이어도 된다 — 앱이 지금 언어로 고른다.
  //   여기서는 견주기 위해 한 가지로 고른다 (영어 → 한국어 → 적힌 것 중 아무거나).
  const pick = (v) => (typeof v === "string" ? v : v && typeof v === "object" ? (v.en || v.ko || Object.values(v)[0] || "") : "");
  const name = pick(it.name).trim();
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

// main 의 index.json — (4) 와 (5) 가 함께 본다
let before = null;
try {
  const base = await getJson(BASE_INDEX);
  before = new Map((Array.isArray(base?.items) ? base.items : []).filter((x) => x?.id).map((x) => [String(x.id), x]));
} catch (e) {
  warns.push(`main 의 index.json 을 못 받아 (4)(5) 를 건너뜁니다: ${e.message}`);
}

// (3-2) 버전별 한 줄(`changes`) — 판을 올리는 PR 이 함께 적는 자리다.
//   ★★**한 줄이다.** 앱은 관리 화면의 판을 눌렀을 때 이것을 그대로 편다 — 릴리즈 노트를 옮겨 적는 자리가 아니라,
//     「무엇이 바뀌었나」를 한 줄로 알려 주는 자리다. 그래서 길이를 막는다 (한 언어당 NOTE_MAX 자).
//   ★`note` 는 문자열 하나이거나 언어별 묶음이다 (`name`·`description` 과 같다). 안 적은 언어는 앱이
//     적힌 다른 언어로 보여 주므로, 하나만 적어도 된다.
const NOTE_MAX = 120;
const CHANGES_MAX = 30;
items.forEach((it, i) => {
  if (!it || typeof it !== "object" || !("changes" in it)) return;
  const id = String(it.id ?? "");
  const where = `items[${i}] (${id})`;
  if (!Array.isArray(it.changes)) return fail(`${where}: changes 는 배열이어야 합니다`);
  if (it.changes.length > CHANGES_MAX) fail(`${where}: changes 는 ${CHANGES_MAX} 줄까지입니다 (오래된 것부터 지우십시오)`);
  it.changes.forEach((c, j) => {
    const w2 = `${where} changes[${j}]`;
    if (!c || typeof c !== "object") return fail(`${w2}: 객체가 아닙니다`);
    if (!TAG_RE.test(String(c.tag ?? ""))) fail(`${w2}: tag 「${c.tag}」 — 글자·숫자·.·-·_ 만`);
    if ("date" in c && !/^\d{4}-\d{2}-\d{2}$/.test(String(c.date))) fail(`${w2}: date 는 YYYY-MM-DD 꼴이어야 합니다`);
    const note = c.note;
    const tooLong = (v) => String(v).length > NOTE_MAX;
    if (typeof note === "string") {
      if (!note.trim()) fail(`${w2}: note 가 비었습니다`);
      else if (tooLong(note)) fail(`${w2}: note 가 ${NOTE_MAX} 자를 넘습니다 (${note.length} 자)`);
    } else if (note && typeof note === "object") {
      const vals = Object.values(note);
      if (!vals.length) fail(`${w2}: note 가 비었습니다`);
      vals.forEach((v) => { if (tooLong(v)) fail(`${w2}: note 가 ${NOTE_MAX} 자를 넘습니다 (${String(v).length} 자)`); });
    } else {
      fail(`${w2}: note 가 있어야 합니다 (문자열 하나 또는 언어별 묶음)`);
    }
  });
});

// (4) 「공식」 표식 — 목록 주인만 붙인다
//   ★앱은 이 표식 하나로 「공식」 딱지를 그린다 (2026-09-10 부터 앱에 담기는 플러그인이 없다). 그래서 남이 보내는
//     PR 에는 그 칸이 못 들어가야 한다. main 에 직접 올릴 수 있는 것은 목록 주인뿐이므로 PR 일 때만 막으면 된다.
items.forEach((it, i) => {
  if (!it || typeof it !== "object") return;
  const id = String(it.id ?? "");
  if ("official" in it && typeof it.official !== "boolean") fail(`items[${i}] (${id}): official 은 true/false 여야 합니다`);
  if (!IS_PR || it.official !== true || !before) return;
  if (before.get(id)?.official !== true) {
    fail(`items[${i}] (${id}): 「official: true」 는 PeroPix 팀만 붙일 수 있습니다. 그 줄을 빼고 다시 보내 주십시오`);
  }
});

// (5) 이미 등록된 id 의 repo 가 바뀌지 않았는가 (main 의 index.json 과 대조)
for (const c of checks) {
  const prev = before?.get(c.id)?.repo;
  if (prev && prev !== c.repo) fail(`${c.where} (${c.id}): 이 id 는 「${prev}」 가 등록한 것입니다. 저장소를 바꾸려면 원래 제작자가 PR 을 내야 합니다`);
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
