<div align="center">

# PeroPix Plugins

**[PeroPix](https://github.com/mrm987/PeroPix3) 의 플러그인 목록.**<br>
코드는 제작자의 저장소에 두고, 이 저장소에는 목록만 있습니다.

[![Check index](https://github.com/mrm987/peropix-plugins/actions/workflows/check.yml/badge.svg)](https://github.com/mrm987/peropix-plugins/actions/workflows/check.yml)
[![License](https://img.shields.io/badge/license-MIT-informational)](LICENSE)

[English](README.md) · **한국어** · [日本語](README.ja.md)

</div>

---

PeroPix 는 이 목록을 **플러그인 → 관리 → 플러그인 목록** 에 보여 줍니다. 항목 하나가 제작자 GitHub 저장소의
태그 하나를 가리키고, 앱은 그 태그를 zip 으로 받아 자기 `plugins/` 폴더에 놓습니다. 여기로 복사되는 것은
없으므로 라이선스·이슈·배포 주기는 전부 제작자의 것입니다. ComfyUI 커스텀 노드를 올려 보셨다면 같은
방식입니다: 코드는 내 저장소에, 목록에는 항목 하나.

- **목록뿐입니다** — `index.json` 이 레지스트리의 전부이고, 여기로 오는 PR 은 항목 하나를 바꿉니다.
- **설치는 앱에서 사용자가 누를 때만** — 누르기 전에는 아무것도 받지도 갱신하지도 않습니다.
- **권한은 앱과 같습니다** — 플러그인은 앱과 같은 권한으로 돕니다. 플러그인이 하는 일은 제작자의 책임이고,
  설치할지는 사용자의 판단입니다.

## 플러그인 올리기

1. **저장소 루트에 `plugin.json` 을 두고** GitHub 에 올립니다. 폴더 구조는 [플러그인 만들기](#플러그인-만들기) 를 봅니다.

2. **태그를 답니다.** 예: `git tag v1.0.0 && git push --tags`. 앱은
   `https://github.com/<owner>/<repo>/archive/refs/tags/<tag>.zip` 을 받습니다. 저장소에서 읽는 것은 그것뿐입니다.
   판을 올릴 때마다 새 태그를 답니다.

3. **[`index.json`](index.json) 에 항목 하나를 넣는 PR 을 엽니다.**

   ```json
   {
     "id": "my-plugin",
     "repo": "owner/my-plugin",
     "tag": "v1.0.0",
     "name": "내 플러그인",
     "description": "무엇을 하는지 한 줄"
   }
   ```

   | 필드 | 필수 | 설명 |
   |---|---|---|
   | `id` | 예 | `plugin.json` 의 `id` 와 같아야 하고 목록 안에서 하나뿐이어야 합니다. 소문자·숫자·`-`·`_`. |
   | `repo` | 예 | GitHub 의 `owner/repository`. |
   | `tag` | 예 | 설치할 git 태그. |
   | `name` | 예 | 앱에 보이는 이름. |
   | `description` | 아니오 | 이름 아래에 보이는 한 줄. |
   | `version` | 아니오 | 비우면 태그에서 앞의 `v` 를 뗀 값입니다. 설치된 판보다 높으면 앱이 업데이트를 제안합니다. |
   | `sha256` | 아니오 | 적으면 앱이 받은 zip 과 대조합니다. |

   CI 가 그 태그의 `plugin.json` 을 받아 `id` 가 항목과 같은지 확인합니다. 코드는 보지 않습니다. 검사가
   통과하면 병합되고, 사용자가 다음에 관리 탭을 열 때 목록에 나타납니다.

   **id 와 이름은 하나뿐이어야 합니다.** 앱에 들어 있는 공식 플러그인과 같은 id·이름, 목록에 이미 있는 id·이름은
   거부됩니다. 한 번 등록된 id 는 그 저장소에 묶입니다. 다른 저장소로 옮기는 PR 은 원래 제작자만 낼 수 있습니다.

**새 판을 내는 것**도 같습니다. 새 태그를 달고, `tag`(적었다면 `version` 도)를 고치는 PR 을 엽니다.

**목록에서 내리는 것**은 항목을 지우는 PR 입니다. 이미 설치한 사용자의 사본은 그대로 남습니다.

## 플러그인 만들기

플러그인은 폴더 하나입니다. 앱의 `plugins/<id>/` 에 놓으면(관리 탭의 폴더 단추가 그 자리를 엽니다) 다음에
켤 때 붙습니다. 저장소 루트가 곧 그 폴더입니다. 태그로 설치할 때 앱이 압축본의 바깥 폴더 한 겹을 벗겨 놓습니다.

```
my-plugin/
  plugin.json        필수
  server.py          선택  FastAPI `router` 를 내놓으면 /plug/<id>/… 에 붙습니다
  web/index.html     선택  캔버스 — 플러그인 모드의 탭 하나
  ext/main.js        선택  앱 페이지 안에서 도는 JS (단추·메뉴 추가)
  requirements.txt   선택  설치할 때 앱의 파이썬으로 `_lib/` 에 pip 설치됩니다
```

`plugin.json`:

```json
{
  "id": "my-plugin",
  "name": "내 플러그인",
  "version": "1.0.0",
  "description": "무엇을 하는지 한 줄",
  "server": "server.py",
  "web": "web",
  "ext": ["ext/main.js"],
  "contributes": {
    "buttons": [{ "slot": "generate.footer", "label": "열기", "do": "openCanvas" }]
  }
}
```

- `id` 는 폴더 이름과 같아야 합니다.
- **파이썬** (`server.py`): 폴더 안의 다른 파일은 패키지로 부릅니다(`from . import x`). 앱의 모듈도 그대로
  import 할 수 있습니다. 앱에 무언가 시키려면 `from plugins import host` 뒤에
  `await host.action("<액션>", {...})`. 액션 이름과 인자는 `GET /api/agent/tools` 가 돌려주는 것과 같습니다.
- **캔버스** (`web/`): 앱 백엔드가 서빙하므로 페이지가 백엔드 API 를 직접 부를 수 있습니다. 앱에 시킬 것은
  부모 창에 메시지로 보냅니다:
  `parent.postMessage({ type: "peropix", id: 1, call: "action", name: "<액션>", args: {...} }, "*")`
  답은 `{ type: "peropix", id: 1, ok, result | error }` 로 옵니다. `call` 은 `action`·`state`·`openCanvas`·
  `toast`·`theme`·`t`·`plugin` 중 하나입니다. 바탕색은 페이지가 정합니다 — 안 칠하면 앱의 캔버스 바탕이 테마대로
  비치고, 칠하려면 `theme("--panel")` 같은 앱 색을 받아 테마를 따르든 한 색으로 고정하든 자유입니다 (글자색은 직접 칠하세요).
  `plugin.json` 의 `canvas: { width, height, minWidth, minHeight, fit }` 가 캔버스 프레임의 처음·최소 크기와 맞춤 방식입니다.
  `fit` 은 `"flow"`(기본: 프레임이 진짜 브라우저 창 — 글자는 원래 크기, 창을 늘리면 페이지가 다시 흐릅니다) 또는 `"scale"`(설계 폭의
  페이지를 프레임 폭에 맞춰 CSS 로 확대·축소, 글자가 흐려지므로 고정 그림판용). 안 적으면 흐름 방식 720×480 입니다.
  프레임을 키울 때 콘텐츠도 넓어지게 하려면 페이지 폭에 상한(max-width)을 두지 말고 `width: 100%` 로 만드세요.
  테마가 바뀌면 앱이 캔버스에 `{ type: "peropix", event: "theme", theme: "dark" | "light" }` 를 보내니, 따르고 싶으면
  그때 `theme("--panel")` 등을 다시 받아 칠하면 됩니다 (`theme` 을 이름 없이 부르면 지금 테마 이름). 콘텐츠는 의도한
  색으로 칠하고 그 밖만 투명하게 두는 것이 가장 단순합니다 (카메라 플러그인이 그렇습니다).
- **확장** (`ext/*.js`): `window.peropix.registerExtension({ name, setup(api) })` 로 시작합니다. `api` 에는
  `addButton("generate.footer" | "nav.right", { label, icon, onClick })`,
  `addMenuItem("image.send", { label, onClick(img) })`, `action(name, args)`, `state()`, `openCanvas(id)`,
  `theme(name)`, `toast(text)` 가 있습니다.
- **코드 없는 단추**: `contributes.buttons` 가 자리에 단추를 더합니다. `do` 는 `"openCanvas"` 또는
  `{ "action": "<액션>", "args": {...} }` 입니다.
- 살아 있는 예: 앱 저장소의 [`plugins-official/camera`](https://github.com/mrm987/PeroPix3/tree/master/plugins-official/camera)
  (캔버스만 있는 플러그인).

설치·삭제·폴더에 직접 넣기 모두 앱을 다시 켜면 적용됩니다. 필요할 때 관리 탭에 다시 켜기 단추가 뜹니다.

## 라이선스

이 저장소(목록과 검사 스크립트)는 [MIT](LICENSE) 입니다. 각 플러그인의 라이선스는 제작자가 자기 저장소에서 정합니다.
