# PeroPix 플러그인 목록 (peropix-plugins)

[PeroPix3](https://github.com/mrm987/PeroPix3) 앱의 **플러그인 → 관리** 탭에 뜨는 「받을 수 있음」 목록입니다.
이 저장소에는 **목록(`index.json`)만** 있습니다. 플러그인 코드는 제작자의 저장소에 있고, 라이선스도 제작자의 것입니다.
ComfyUI 레지스트리와 같은 꼴입니다: 코드는 내 저장소에, 목록에는 주소만.

*English summary at the bottom.*

## 플러그인 올리기 (3단계)

1. **저장소 루트에 `plugin.json`** 을 두고 GitHub 에 올립니다. 폴더 구조는 아래 「플러그인 만들기」.
2. **태그를 답니다.** 예: `git tag v1.0.0 && git push --tags`. 앱은 이 태그의 압축본
   (`https://github.com/<owner>/<repo>/archive/refs/tags/<tag>.zip`)을 받습니다. 판을 올릴 때마다 새 태그를 답니다.
3. **`index.json` 에 항목 하나를 넣어 PR** 합니다.

   ```json
   { "id": "my-plugin", "repo": "owner/repo", "tag": "v1.0.0", "name": "내 플러그인", "description": "한 줄 설명" }
   ```

   - `id` 는 `plugin.json` 의 `id` 와 같아야 하고, 목록 안에서 하나뿐이어야 합니다 (소문자·숫자·`-`·`_`).
   - `version` 은 안 적으면 태그에서 앞의 `v` 를 뗀 것입니다.
   - `sha256` 은 선택입니다 (적으면 앱이 받은 zip 과 대조합니다).
   - PR 을 열면 CI 가 그 태그에서 `plugin.json` 을 받아 `id` 가 맞는지 확인합니다. 코드는 보지 않습니다.

판을 올릴 때는 새 태그를 달고 `tag`(와 `version`)만 고쳐 다시 PR 합니다.

## 플러그인 만들기

앱 폴더의 `plugins/<id>/` 에 폴더를 놓으면 다음에 켤 때 붙습니다. 관리 탭의 폴더 열기 단추가 그 자리를 엽니다.
저장소 루트가 곧 그 폴더입니다 (앱이 태그 압축본의 바깥 폴더 한 겹을 벗겨서 놓습니다).

```
my-plugin/
  plugin.json        필수
  server.py          (선택) FastAPI `router` 를 내놓으면 /plug/<id>/… 에 붙는다
  web/index.html     (선택) 캔버스 — 플러그인 모드에 탭 하나로 뜬다
  ext/main.js        (선택) 앱 페이지 안에서 도는 JS (단추·메뉴 추가)
  requirements.txt   (선택) 설치 때 앱의 파이썬으로 `_lib/` 에 pip 설치
```

`plugin.json`:

```json
{
  "id": "my-plugin",
  "name": "내 플러그인",
  "version": "1.0.0",
  "description": "한 줄 설명",
  "server": "server.py",
  "web": "web",
  "ext": ["ext/main.js"],
  "contributes": {
    "buttons": [{ "slot": "generate.footer", "label": "열기", "do": "openCanvas" }]
  }
}
```

- `id` 는 폴더 이름과 같아야 합니다.
- `server.py` 안에서 다른 파일은 `from . import x` 로 부릅니다 (폴더가 패키지입니다). 앱 모듈도 그대로 import 할 수 있습니다.
  앱에 무언가 시키려면 `from plugins import host; await host.action("<액션>", {...})`.
- 캔버스(`web/`)는 앱 백엔드와 같은 오리진이라 백엔드 API 를 직접 부를 수 있고, 앱에 시킬 것은 `postMessage` 로 보냅니다:
  `parent.postMessage({ type: "peropix", id: 1, call: "action", name: "<액션>", args: {...} }, "*")`
  → 답은 `{ type: "peropix", id: 1, ok, result | error }`. `call` 은 `action`·`state`·`openCanvas`·`toast`·`theme`·`t`·`plugin`.
- `ext/*.js` 는 `window.peropix.registerExtension({ name, setup(api) })` 로 시작합니다.
  `api.addButton("generate.footer" | "nav.right", { label, icon, onClick })`, `api.addMenuItem("image.send", { label, onClick(img) })`,
  `api.action(name, args)`, `api.state()`, `api.openCanvas(id)`, `api.theme(name)`, `api.toast(text)`.
- 액션 이름과 인자는 앱의 `GET /api/agent/tools` 가 돌려주는 목록과 같습니다.
- 살아 있는 예: 앱 저장소의 [`plugins-official/camera`](https://github.com/mrm987/PeroPix3/tree/main/plugins-official/camera) (캔버스만 있는 플러그인).

## 알아 둘 것

- 플러그인은 **앱과 같은 권한**으로 돕니다. 격리하지 않습니다. 사용자가 무엇을 설치할지는 사용자의 판단이고,
  플러그인이 하는 일은 제작자의 책임입니다.
- 설치·삭제·판 올리기는 사용자가 앱에서 누를 때만 일어납니다. 자동 갱신은 없습니다.
- 이 목록에서 내리고 싶으면 항목을 지우는 PR 을 냅니다. 이미 설치한 사용자의 것은 그대로 남습니다.
- 이 저장소(목록 파일·검사 스크립트)의 라이선스는 [MIT](LICENSE) 입니다. 각 플러그인의 라이선스는 제작자 저장소를 따릅니다.

---

## English

This repository holds only `index.json`, the list shown in PeroPix3's Plugins → Manage tab. Plugin code and its license live in
the author's own repository (same model as the ComfyUI registry).

**To publish:** put `plugin.json` at the root of your repo, push a git tag (e.g. `v1.0.0`), then open a PR adding one entry to
`index.json`: `{ "id", "repo": "owner/repo", "tag", "name", "description" }`. The app downloads
`https://github.com/<owner>/<repo>/archive/refs/tags/<tag>.zip`. `id` must match `plugin.json` and be unique. CI only checks that
the tag's `plugin.json` matches the entry; it does not review code. To release a new version, push a new tag and PR the `tag` change.

**Plugin layout:** `plugin.json` (required), `server.py` (optional, exports a FastAPI `router` mounted at `/plug/<id>/`),
`web/index.html` (optional canvas tab), `ext/*.js` (optional in-page extension via `window.peropix.registerExtension`),
`requirements.txt` (optional, pip-installed into `_lib/` on install). Plugins run with the same access as the app; what they do is
the author's responsibility.
